.PHONY: install dev/backend build/backend start/backend typecheck/backend lint/backend format format-check test/backend test-coverage/backend migrate-create migrate-up migrate-down check codex-commands

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

# Claude (.claude/commands) and Gemini (.gemini/commands) load slash commands from the
# repo automatically. Codex only loads prompts from ~/.codex/prompts, so symlink them there:
codex-commands:
	mkdir -p $(HOME)/.codex/prompts
	ln -sf $(CURDIR)/.codex/prompts/*.md $(HOME)/.codex/prompts/
	@echo "Linked Codex prompts. In Codex: /prompts:architect (etc.)"
