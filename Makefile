.PHONY: help install dev build up down logs shell clean

help:
	@echo "RAGchat Enterprise Control Tower"
	@echo "-------------------------------"
	@echo "install  - Install local dependencies"
	@echo "dev      - Run backend in development mode"
	@echo "build    - Build docker containers"
	@echo "up       - Start production stack"
	@echo "down     - Stop production stack"
	@echo "clean    - Wipe qdrant database and caches"

install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

dev:
	cd backend && uvicorn main:app --reload --port 8001

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	rm -rf backend/qdrant_db/*
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
