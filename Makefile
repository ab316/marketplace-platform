.PHONY: install

install:
	pnpm install

run:
	pnpm run dev

build:
	pnpm run build

start:
	pnpm run start

test:
	pnpm run test

test-coverage:
	pnpm run test-coverage

migrate-create:
	pnpm run migrate-create

migrate-up:
	pnpm run migrate-up

migrate-down:
	pnpm run migrate-down

prepare:
	pnpm run prepare