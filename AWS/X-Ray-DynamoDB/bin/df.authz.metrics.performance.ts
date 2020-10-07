#!/usr/bin/env node
import * as Core from '@aws-cdk/core';

import { DfAuthZPerformanceStack } from '../infrastructure/df.auth.metrics.performance';

const app = new Core.App();
const env = app.node.tryGetContext('environment');
const regions = app.node.tryGetContext('regions') as string || "";

for (const currentRegion of regions.split(',')) {
    const stackName: string = `${env}-PerformanceStack-${currentRegion}`;
    new DfAuthZPerformanceStack(
        app,
        stackName,
        {
            env: {
                region: currentRegion
            }
        }
    );
}

const tags = [
    new Core.Tag("Owner", "role-platform-developer@fugro.com"),
    new Core.Tag("Project", "AuthZ Performance"),
    new Core.Tag("Environment", `${env}`),
    new Core.Tag("CostCode", "DRD100")
];

for (const tag of tags) {
    app.node.applyAspect(tag);
}

