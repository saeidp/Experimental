REGIONS ?= ap-southeast-2,us-east-1,eu-west-1

ACCOUNT_ID ?= 107883196108
PERF_DOMAIN ?= perf.dev.authz.fugro.com
PERF_CERT ?= arn:aws:acm:us-east-1:$(ACCOUNT_ID):certificate/d90936c5-1ad4-4419-9776-b8c88318aa38,arn:aws:acm:ap-southeast-2:$(ACCOUNT_ID):certificate/fcbde07d-8cbf-4e9b-8682-59648545002d,arn:aws:acm:eu-west-1:$(ACCOUNT_ID):certificate/ba14b3d4-eb1a-4a73-95cc-34711991faae

ZONE_DOMAIN ?= dev.authz.fugro.com
ZONE_ID ?= Z1IQ4278V5FG38
