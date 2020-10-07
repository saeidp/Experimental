import * as Core from '@aws-cdk/core';
import * as Lambda from '@aws-cdk/aws-lambda';
import * as Events from '@aws-cdk/aws-events';
import * as Targets from '@aws-cdk/aws-events-targets';
import * as IAM from '@aws-cdk/aws-iam';
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as ApiGateway from '@aws-cdk/aws-apigateway';
import * as CertManager from '@aws-cdk/aws-certificatemanager';
import * as Route from '@aws-cdk/aws-route53';
import * as RouteTarget from '@aws-cdk/aws-route53-targets';
import { TableReference } from './TableReference';
import { Authorizer } from './Authorizer';

export class DfAuthZPerformanceStack extends Core.Stack {
  constructor(scope: Core.Construct, id: string, props?: Core.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext('environment');
    const projectId = this.node.tryGetContext('projectId');
    const namePrefix = `${projectId}-${environment}`;
    const runRateStr = this.node.tryGetContext('runRate');
    const awsAccountID = this.node.tryGetContext('awsAccountID');
    const regions = this.node.tryGetContext('regions') || "";
    const region = Core.Stack.of(this).region;

    const tableName = `${namePrefix}-performance`;
    const mainTable = new DynamoDB.Table(this, 'performanceTable', {
      tableName,
      partitionKey: { name: 'PK', type: DynamoDB.AttributeType.STRING },
      sortKey: { name: 'SK', type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      pointInTimeRecovery: true,
      removalPolicy: Core.RemovalPolicy.DESTROY
    });
    mainTable.addGlobalSecondaryIndex({
      partitionKey: { name: 'Category', type: DynamoDB.AttributeType.STRING },
      sortKey: { name: 'SK', type: DynamoDB.AttributeType.STRING },
      indexName: 'Category-SK-index',
      projectionType: DynamoDB.ProjectionType.ALL
    });

    // IAM - grant policy for lambda
    const iam = new IAM.PolicyStatement({
      actions: [
        "iam:ListAccountAliases",
        "ses:*",
        "xray:GetTraceSummaries",
      ],
      resources: ["*"]
    });

    // Lambda
    const fetchFn = new Lambda.Function(this, 'FetchLambda', {
      functionName: `${namePrefix}-lambda-fetch-performance-data`,
      code: Lambda.Code.asset('./lambda/fetch-xray/dist/'),
      runtime: Lambda.Runtime.NODEJS_12_X,
      handler: 'index.handle',
      timeout: Core.Duration.minutes(15),
      memorySize: 256,
      tracing: Lambda.Tracing.ACTIVE,
      initialPolicy: [iam],
      environment: {
        PROJECT_ID: projectId,
        ENVIRONMENT: environment,
        TABLE_NAME: mainTable.tableName,
        SCAN_HOURS: '5'
      }
    });
    mainTable.grantFullAccess(fetchFn);

    // Run regularly
    if (runRateStr) {
      const rule = new Events.Rule(this, 'Rule', {
        ruleName: `${namePrefix}-rule-run-fetch-data`,
        schedule: Events.Schedule.expression(`rate(${runRateStr})`),
        description: "Run to fetch the latest x-ray data in every " + runRateStr
      });
      rule.addTarget(new Targets.LambdaFunction(fetchFn));
    }

    // Lambda
    const getDataFn = new Lambda.Function(this, 'GetPerfDataLambda', {
      functionName: `${namePrefix}-lambda-get-performance-data`,
      code: Lambda.Code.asset('./lambda/get-data/dist/'),
      runtime: Lambda.Runtime.NODEJS_12_X,
      handler: 'index.handle',
      timeout: Core.Duration.minutes(15),
      memorySize: 512,
      tracing: Lambda.Tracing.ACTIVE,
      initialPolicy: [iam],
      environment: {
        PROJECT_ID: projectId,
        ENVIRONMENT: environment,
        TABLE_NAME: mainTable.tableName,
      }
    });
    // grant lambda to access db from all regions
    for (const r of regions.split(',')) {
      const arn =  `arn:aws:dynamodb:${r}:${awsAccountID}:table/${tableName}`;
      const table = new TableReference(arn);
      table.grantReadData(getDataFn);
    }

    // api gate-way
    const apiName = `Performance API [${environment}]`;
    const gateway = new ApiGateway.RestApi(this, 'PerfApi', {
      restApiName: apiName,
      description: 'API for Performance data',
      deployOptions: {
        loggingLevel: ApiGateway.MethodLoggingLevel.ERROR,
        dataTraceEnabled: true,
        metricsEnabled: true,
        tracingEnabled: true
      }
    });

    const authorizer = new Authorizer(this, 'authorizer', gateway, getDataFn);

    const methodTarget = new ApiGateway.LambdaIntegration(getDataFn);
    const methodOptions = {
      ...authorizer.methodOptions,
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '401' },
        { statusCode: '403' },
      ]
    };


    // endpoint: /Performance
    {
      const perfResource = gateway.root.addResource('performance');
      perfResource.addMethod('GET', methodTarget, methodOptions);
    }

    const perfApiDomainName = this.node.tryGetContext('perfApiDomain') as string;
    const certificateArns: string[] = this.node.tryGetContext('perfCert') ? this.node.tryGetContext('perfCert').split(',') : [];
    const certificateArn = certificateArns.find(element => element.includes(region)) || '';
    const zoneDomain = this.node.tryGetContext('zoneDomain') as string;
    const zoneId = this.node.tryGetContext('zoneId') as string;

    if (perfApiDomainName && zoneDomain) {
      const recordName = perfApiDomainName.substr(0, perfApiDomainName.length - zoneDomain.length -1);
      const certificate = CertManager.Certificate.fromCertificateArn(
        this, 'certificate',
        certificateArn
      );
      const domain = new ApiGateway.DomainName(this, 'perfDomain', {
        domainName: perfApiDomainName,
        endpointType: ApiGateway.EndpointType.REGIONAL,
        certificate
      });

      new ApiGateway.BasePathMapping(this, 'perfMapping', {
        domainName: domain,
        restApi: gateway
      });

      const alias = new RouteTarget.ApiGatewayDomain(domain);
      const zone = Route.HostedZone.fromHostedZoneAttributes(this, 'perfZone', {
        hostedZoneId: zoneId,
        zoneName: zoneDomain
      });

      const target = Route.RecordTarget.fromAlias(alias);
      const record = new Route.ARecord(this, 'perf-arecord', {
        target,
        recordName,
        zone
      });

      const recordSet = (record.node.defaultChild as Route.CfnRecordSet);

      let geoLocationParams = {};
      if (region === 'eu-west-1') {
        geoLocationParams = { countryCode: 'IE' };
      } else if (region === 'ap-southeast-2') {
        geoLocationParams = { countryCode: 'AU' };
      } else if (region === 'ap-south-1') {
        geoLocationParams = { countryCode: 'IN' };
      } else if (region ==='me-south-1' ) {
        geoLocationParams = { countryCode: 'BH' };
      } else {
        geoLocationParams = { countryCode: '*' };
      }
      recordSet.geoLocation = geoLocationParams;
      recordSet.setIdentifier = `perfAuthZ-${region}`;

      new Core.CfnOutput(this, 'perfDomainApiOutput', {
        exportName: `${environment}-perf-api-Domain`,
        value: perfApiDomainName
      });
    }
  }

}
