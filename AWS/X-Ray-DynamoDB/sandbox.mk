REGIONS ?= ap-southeast-2,us-east-1,eu-west-1

ACCOUNT_ID ?= 819229498852
PERF_DOMAIN ?= perf.sandbox.authz.fugro.com
PERF_CERT ?= arn:aws:acm:us-east-1:$(ACCOUNT_ID):certificate/473f6493-df58-4fd8-9aa5-d5ee7d5d823a,arn:aws:acm:ap-southeast-2:$(ACCOUNT_ID):certificate/8b04cb57-20ce-4156-9301-1b576e385936,arn:aws:acm:eu-west-1:$(ACCOUNT_ID):certificate/6f4b8f90-3a62-4b61-ae65-8b3443480bd4

ZONE_DOMAIN ?= sandbox.authz.fugro.com
ZONE_ID ?= Z2R4PZ88WICOQ1
