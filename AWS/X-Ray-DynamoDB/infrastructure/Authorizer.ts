import * as Core from '@aws-cdk/core';
import * as Iam from '@aws-cdk/aws-iam';
import * as Lambda from '@aws-cdk/aws-lambda';
import * as ApiGateway from '@aws-cdk/aws-apigateway';

export class Authorizer implements ApiGateway.IAuthorizer {
    private authorizer: ApiGateway.CfnAuthorizer;

    constructor(
      scope: Core.Construct,
      assetId: string,
      restApi: ApiGateway.RestApi,
      fn: Lambda.IFunction
    ) {
      const audience = scope.node.tryGetContext('azure_audience');
      const environment = scope.node.tryGetContext('environment');
      const projectId = scope.node.tryGetContext('projectId');
      const namePrefix = `${projectId}-${environment}`;
      const region = Core.Stack.of(scope).region;

      const auth_fn = new Lambda.Function(
        scope, assetId,
        {
          functionName: `${namePrefix}-lambda-authorizer`,
          code: Lambda.Code.asset('./lambda/authorizer/dist'),
          runtime: Lambda.Runtime.NODEJS_10_X,
          handler: 'index.handler',
          timeout: Core.Duration.seconds(60),
          tracing: Lambda.Tracing.ACTIVE,
          environment: {
            GW_ARN: restApi.arnForExecuteApi(),
            AZURE_AUDIENCE: audience,
            AZURE_JWKS_URI: 'https://login.microsoftonline.com/common/discovery/keys',
            AZURE_TOKEN_ISSUER: 'https://sts.windows.net/e3b48527-4cbe-42a2-b4d2-11b3cc7a86fc/',
          }
        });

        fn.grantInvoke(auth_fn);

      const lambdaPermissionStatement = new Iam.PolicyStatement({
        actions: ["lambda:invokeFunction"],
        resources: [auth_fn.functionArn]
      });

      const roleName = `${namePrefix}-authorizer-${region}-role`;
      const authPolicyDocument = new Iam.PolicyDocument({
        statements: [
          lambdaPermissionStatement
        ]
      });

      const authRole = new Iam.Role(scope, roleName, {
        roleName,
        assumedBy: new Iam.ServicePrincipal('apigateway.amazonaws.com'),
        inlinePolicies: { authPolicyDocument }
      });


      this.authorizer = new ApiGateway.CfnAuthorizer(scope, `authorizer-${region}`, {
        name: `${namePrefix}-authorizer-${region}`,
        restApiId: restApi.restApiId,
        authorizerCredentials: authRole.roleArn,
        authorizerResultTtlInSeconds: 10,
        type: 'TOKEN',
        authorizerUri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${auth_fn.functionArn}/invocations`,
        identitySource: 'method.request.header.Authorization',
      });
    }

    get authorizerId() { return this.authorizer.ref; }

    get methodOptions(): ApiGateway.MethodOptions {
      return {
        authorizationType: ApiGateway.AuthorizationType.CUSTOM,
        authorizer: this
      };
    }
}
