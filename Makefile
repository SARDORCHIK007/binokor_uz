# UYCHI BINOKOR — developer commands (see CLAUDE.md).
# Windows without make: use the matching scripts/*.ps1 or copy the docker compose line.

COMPOSE := docker compose --env-file .env -f infra/compose.yml
API     := $(COMPOSE) exec -T api
WEB     := $(COMPOSE) exec -T web

.PHONY: help up down logs ps test test-api test-web lint lint-api lint-web migrate migration seed-demo e2e api-client

help:
	@echo "make up | down | logs | ps"
	@echo "make test | test-api | test-web"
	@echo "make lint | lint-api | lint-web"
	@echo "make migrate | migration m=\"message\" | seed-demo"

.env:
	cp .env.example .env

up: .env
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f --tail=100

ps:
	$(COMPOSE) ps

test: test-api test-web

test-api:
	$(API) python -m pytest -q

test-web:
	cd apps/web && npm test

lint: lint-api lint-web

lint-api:
	$(API) python -m ruff check app tests
	$(API) python -m mypy app

lint-web:
	cd apps/web && npm run lint && npm run typecheck

migrate:
	$(API) alembic upgrade head

migration:
	$(API) alembic revision -m "$(m)"

# Demo data is loaded by the API on startup (app/main.py lifespan) when the DB is empty.
seed-demo:
	$(COMPOSE) restart api

e2e:
	@echo "Playwright e2e is not set up yet (docs/09_ROADMAP.md)."; exit 1

api-client:
	@echo "OpenAPI -> TS client generation is not set up yet."; exit 1
