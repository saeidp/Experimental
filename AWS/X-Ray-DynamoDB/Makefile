PACKAGE_VERSION ?= $(shell git describe --abbrev=10 --match "v*" --long --dirty)

-include local.mk

ifeq ($(ENVIRONMENT),DEV)
include dev.mk
endif

ifeq ($(ENVIRONMENT),UAT)
include uat.mk
endif

ifeq ($(ENVIRONMENT),PROD)
include prod.mk
endif

ifeq ($(ENVIRONMENT),TEST)
include sandbox.mk
endif

ENVIRONMENT ?= $(USERNAME)
REGIONS ?= us-east-1,ap-southeast-2,us-east-1
AWS_PROFILE ?= auth
ID ?= xray
APPROVAL_REQUIRED ?= broadening
RATE ?= "4 hours"
AZURE_AUDIENCE ?= "2eaa7898-0edb-402f-aea3-8f92ae08642c"

PERF_DOMAIN ?=
PERF_CERT ?=
ZONE_DOMAIN ?=
ZONE_ID ?=


ifeq ($(AWS_PROFILE),default)
CDK_SIMPLE := npx cdk
else
CDK_SIMPLE := npx cdk --profile $(AWS_PROFILE)
endif
CDK = $(CDK_SIMPLE) \
	--require-approval=$(APPROVAL_REQUIRED) \
	-c environment=$(ENVIRONMENT) \
	-c regions=$(REGIONS) \
	-c awsAccountID=$(ACCOUNT_ID) \
	-c azure_audience=$(AZURE_AUDIENCE) \
	-c projectId=$(ID) \
	-c runRate=$(RATE) \
	-c perfApiDomain=$(PERF_DOMAIN) \
	-c perfCert=$(PERF_CERT) \
	-c zoneDomain=$(ZONE_DOMAIN) \
	-c zoneId=$(ZONE_ID)

PARTS := lambda
PARTS_CLEAN = $(addsuffix .clean,$(PARTS))
PARTS_BUILD = $(addsuffix .build,$(PARTS))

STACKS = $(ENVIRONMENT)-PerformanceStack*
STACKS_DEPLOY = $(addsuffix .deploy,$(STACKS))
STACKS_DESTROY = $(addsuffix .destroy,$(STACKS))

COMMA?=,

.PHONY: build
build: $(PARTS_BUILD) iac

.PHONY: clean
clean: $(PARTS_CLEAN)

.PHONY: test
test: $(PARTS_TEST)

.PHONY: $(PARTS_BUILD)
$(PARTS_BUILD):
	@$(MAKE) -C $(patsubst %.build,%,$@) build

.PHONY: $(PARTS_CLEAN)
$(PARTS_CLEAN):
	@$(MAKE) -C $(patsubst %.clean,%,$@) clean


.PHONY: iac
iac:
	npm install
	npm run build

.PHONY: info
info:
	@echo "Version:     " $(PACKAGE_VERSION)
	@echo "Project ID:  " $(ID)
	@echo "Environment: " $(ENVIRONMENT)
	@echo "AWS Profile: " $(AWS_PROFILE)

.PHONY: deploy
deploy: build iac
	$(CDK) deploy $(STACKS)

.PHONY: destroy
destroy: build
	$(CDK) destroy $(STACKS)

.PHONY: $(STACKS_DEPLOY)
$(STACKS_DEPLOY): build iac
	$(CDK) deploy $(patsubst %.deploy,%,$@)

.PHONY: $(STACKS_DESTROY)
$(STACKS_DESTROY): build iac
	$(CDK) destroy $(patsubst %.destroy,%,$@)

.PHONY: bootstrap
bootstrap: build
	npm install
	$(CDK) bootstrap $(foreach reg,$(subst $(COMMA), ,$(REGIONS)),aws://$(ACCOUNT_ID)/$(reg))


.PHONY: synth
synth:
	$(CDK) synth $(ENVIRONMENT)-PerformanceStack

