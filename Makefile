.PHONY: install dev dev/web dev/backend build/backend start/backend typecheck/backend lint/backend format format-check test/backend test-coverage/backend migrate-create migrate-up migrate-down check

install:
	pnpm install

# The whole local stack — backend and web app — in one terminal.
dev:
	pnpm run dev

# One app at a time, on the ports in the repo-root `.env` (scripts/dev.ts).
dev/backend:
	pnpm run dev:backend

dev/web:
	pnpm run dev:web

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
