.PHONY: install dev/backend build/backend start/backend typecheck/backend lint/backend format format-check test/backend test-coverage/backend migrate-create migrate-up migrate-down check

install:
	pnpm install

dev/backend:
	pnpm --filter @acme/backend dev

build/backend:
	pnpm --filter @acme/backend build

start/backend:
	pnpm --filter @acme/backend start

typecheck/backend:
	pnpm run typecheck

lint/backend:
	pnpm run lint

format:
	pnpm run format

format-check:
	pnpm run format:check

test/backend:
	pnpm run test

test-coverage/backend:
	pnpm run test:coverage

migrate-create:
	pnpm run migrate:create

migrate-up:
	pnpm run migrate:up

migrate-down:
	pnpm run migrate:down

check:
	pnpm run check
