PARTS := fetch-xray get-data authorizer
PARTS_CLEAN = $(addsuffix .clean,$(PARTS))
PARTS_BUILD = $(addsuffix .build,$(PARTS))
PARTS_TEST = $(addsuffix .test,$(PARTS))

build: $(PARTS_BUILD)

$(PARTS_BUILD):
	@$(MAKE) -C $(patsubst %.build,%,$@) build

clean: $(PARTS_CLEAN)

$(PARTS_CLEAN):
	@$(MAKE) -C $(patsubst %.clean,%,$@) clean

test: $(PARTS_TEST)

$(PARTS_TEST):
	@$(MAKE) -C $(patsubst %.test,%,$@) test

.PHONY: build $(PARTS_BUILD) clean $(PARTS_CLEAN) test $(PARTS_TEST)
