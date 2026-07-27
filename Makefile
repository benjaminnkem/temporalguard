.PHONY: local-up local-down local-reset foundry-gauge foundry-forge

local-up:
	pnpm local:up

local-down:
	pnpm local:down

local-reset:
	pnpm local:reset -- --confirm

foundry-gauge:
	pnpm foundry:gauge

foundry-forge:
	pnpm foundry:forge
