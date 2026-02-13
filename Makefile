.PHONY: install dev build start typecheck lint format test test-coverage migrate-create migrate-up migrate-down prepare

install:
	pnpm install

dev/backend:
	pnpm --filter @acme/backend dev

build/backend:
	pnpm --filter @acme/backend build

start/backend:
	pnpm --filter @acme/backend start
