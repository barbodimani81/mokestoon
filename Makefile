SHELL := /bin/sh
WEB := npm --prefix apps/web
LOCAL := sh scripts/with-local-env.sh
COMPOSE := docker compose --env-file .env -f infra/docker/compose.dev.yml
MIGRATE := $(LOCAL) migrate -path apps/api/migrations -database 'postgres:///?search_path=public'

.PHONY: help init install dev-deps compose-down api-run web-dev migrate-up migrate-down fmt lint test integration build browser-test audit

help:
	@echo "Setup: make init install dev-deps migrate-up"
	@echo "Run in separate terminals: make api-run | make web-dev"
	@echo "Checks: make fmt lint test integration build browser-test audit"

init:
	@sh scripts/init-local.sh

install:
	$(WEB) ci
	cd apps/api && go mod download

dev-deps:
	$(LOCAL) $(COMPOSE) up -d --wait

compose-down:
	$(LOCAL) $(COMPOSE) down

api-run:
	$(LOCAL) sh -c 'cd apps/api && exec go run ./cmd/api'

web-dev:
	$(LOCAL) $(WEB) run dev

migrate-up:
	$(MIGRATE) up

migrate-down:
	$(MIGRATE) down 1

fmt:
	cd apps/api && go fmt ./...
	$(WEB) run fmt

lint:
	cd apps/api && test -z "$$(gofmt -l .)" && go vet ./...
	$(WEB) run lint

test:
	cd apps/api && go test -race ./...
	$(WEB) test

audit:
	$(WEB) audit --audit-level=high
	cd apps/api && go run golang.org/x/vuln/cmd/govulncheck@v1.10.0 ./...

integration:
	bash scripts/integration.sh

build:
	mkdir -p build
	cd apps/api && go build -trimpath -o ../../build/f7-api ./cmd/api
	$(WEB) run build

browser-test:
	$(WEB) exec -- playwright test --config apps/web/playwright.config.ts
