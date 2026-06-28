IMAGE_NAME ?= psa-front
PORT ?= 8081
SMOKE_PORT ?= 18080
SMOKE_CONTAINER ?= psa-front-smoke
PSA_NETWORK ?= psa-network

.PHONY: local build run smoke prod-ensure-network prod-pull prod-up prod-down prod-ps prod-logs

local:
	docker compose up --build frontend-dev

build:
	docker build -t $(IMAGE_NAME):prod .

run:
	docker run --rm -p $(PORT):80 $(IMAGE_NAME):prod

smoke: build
	docker rm -f $(SMOKE_CONTAINER) >/dev/null 2>&1 || true
	docker run --rm -d --name $(SMOKE_CONTAINER) -p 127.0.0.1:$(SMOKE_PORT):80 $(IMAGE_NAME):prod
	sh -c 'for i in 1 2 3 4 5; do curl -fsSI http://127.0.0.1:$(SMOKE_PORT)/ >/dev/null && exit 0; sleep 1; done; exit 1'
	curl -fsSI http://127.0.0.1:$(SMOKE_PORT)/
	curl -fsSI http://127.0.0.1:$(SMOKE_PORT)/runtime-config.js
	sh -c 'asset=$$(curl -fs http://127.0.0.1:$(SMOKE_PORT)/ | grep -o "/assets/[^\"]*" | head -n1); test -n "$$asset"; curl -fsSI "http://127.0.0.1:$(SMOKE_PORT)$$asset"'
	sh -c 'code=$$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$(SMOKE_PORT)/api/v1/professions); test "$$code" = "404"'
	docker stop $(SMOKE_CONTAINER)

prod-ensure-network:
	docker network inspect $(PSA_NETWORK) >/dev/null 2>&1 || docker network create $(PSA_NETWORK)

prod-pull:
	docker compose pull frontend

prod-up: prod-ensure-network
	docker compose up -d --remove-orphans frontend

prod-down:
	docker compose down

prod-ps:
	docker compose ps

prod-logs:
	docker compose logs -f frontend
