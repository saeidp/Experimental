AZURE_AUDIENCE ?= 'c37739a1-8fda-4fb0-9d9f-3ad6d2208a03'

REGIONS ?= ap-southeast-2,us-east-1,eu-west-1

ACCOUNT_ID ?= 911828417142
PERF_DOMAIN ?= perf.authz.fugro.com
PERF_CERT ?= arn:aws:acm:us-east-1:$(ACCOUNT_ID):certificate/55a27cd4-c22b-41e1-82e7-62494d01d8b0,arn:aws:acm:ap-southeast-2:$(ACCOUNT_ID):certificate/8b05a956-eb13-4351-9bd8-00ff2ef608dd,arn:aws:acm:eu-west-1:$(ACCOUNT_ID):certificate/51a7c09a-7945-4864-9418-811badbe45c8

ZONE_DOMAIN ?= authz.fugro.com
ZONE_ID ?= Z2KZ2I1W5DX9M7
