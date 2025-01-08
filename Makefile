.PHONY: help setup build up down stop restart logs list clean all re

NAME = transcendence
DOCKER_COMPOSE_YML = ./docker/docker-compose.yml
DOCKER_COMPOSE_CMD = docker-compose

BOLD_GREEN = \033[1;32m
RESET = \033[0m

help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "targets:"
	@echo "  setup             Create necessary directories and set permissions"
	@echo "  build             Build or rebuild services"
	@echo "  up                Start the services defined in the Docker Compose file"
	@echo "  down              Stop and remove the containers, networks, and volumes"
	@echo "  stop              Stop the running containers without removing them"
	@echo "  restart           Restart the services"
	@echo "  logs              View output from containers"
	@echo "  list              List containers, images, volumes and networks"
	@echo "  clean             Remove all stopped containers, networks, and volumes, and cleanup setup"
	@echo "  all               Run setup, build, and up"
	@echo "  re                Clean, rebuild, and restart the services"

build:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) build

up:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) up -d

down:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) down --volumes --rmi all --remove-orphans

stop:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) stop

restart:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) restart

logs:
	@$(DOCKER_COMPOSE_CMD) -f $(DOCKER_COMPOSE_YML) -p $(NAME) logs

list:
	@echo "$(BOLD_GREEN)Listing containers:$(RESET)"
	@docker ps
	@echo "$(BOLD_GREEN)Listing images:$(RESET)"
	@docker image ls
	@echo "$(BOLD_GREEN)Listing volumes:$(RESET)"
	@docker volume ls
	@echo "$(BOLD_GREEN)Listing networks:$(RESET)"
	@docker network ls

clean: down

all: build up

re: clean all
