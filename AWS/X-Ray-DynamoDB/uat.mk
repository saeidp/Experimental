REGIONS ?= ap-southeast-2,us-east-1,eu-west-1

ACCOUNT_ID ?= 819229498852
PERF_DOMAIN ?= perf.uat.authz.fugro.com
PERF_CERT ?= arn:aws:acm:us-east-1:$(ACCOUNT_ID):certificate/473f6493-df58-4fd8-9aa5-d5ee7d5d823a,arn:aws:acm:ap-southeast-2:$(ACCOUNT_ID):certificate/14db7c1e-ce82-4a55-9bae-bae7fab94012,arn:aws:acm:eu-west-1:$(ACCOUNT_ID):certificate/e80e3a15-a253-4027-b357-5f5d86c5b644

ZONE_DOMAIN ?= uat.authz.fugro.com
ZONE_ID ?= Z14JTJHVYGXPOJ
