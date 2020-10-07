
import * as Iam from '@aws-cdk/aws-iam';

export interface ITableReference {
    grantFullAccess(grantee: Iam.IGrantable): void,
    grantReadData(grantee: Iam.IGrantable): void,
    readonly tableArn: string,
  }

export class TableReference implements ITableReference {
  constructor(readonly tableArn: string) {
   }

  grantFullAccess(grantable: Iam.IGrantable) {
    Iam.Grant.addToPrincipal(
      {
        grantee: grantable,
        actions: ['dynamodb:*'],
        resourceArns: [
          this.tableArn,
          `${this.tableArn}/index/*`
        ]
      }
    );
  }

  grantReadData(grantable: Iam.IGrantable) {
    Iam.Grant.addToPrincipal(
      {
        grantee: grantable,
        actions: [
          'dynamodb:BatchGetItem',
          'dynamodb:GetRecords',
          'dynamodb:GetShardIterator',
          'dynamodb:Query',
          'dynamodb:GetItem',
          'dynamodb:Scan'
        ],
        resourceArns: [
          this.tableArn,
          `${this.tableArn}/index/*`
        ]
      }
    );
  }
}
