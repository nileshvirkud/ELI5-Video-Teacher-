# ELI5 Video Teacher - Development Makefile

.PHONY: help install build test lint type-check clean dev dev-docker prod docker-build docker-push deploy-staging deploy-prod

# Default target
help: ## Show this help message
	@echo "ELI5 Video Teacher - Available Commands:"
	@echo
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation
install: ## Install all dependencies
	@echo "Installing dependencies..."
	npm ci
	cd backend && npm ci
	cd frontend && npm ci

install-tools: ## Install development tools
	npm install -g nodemon typescript ts-node prisma
	npm install -g @playwright/test lighthouse-ci

# Development
dev: ## Start development servers (backend + frontend)
	@echo "Starting development servers..."
	npm run dev

dev-backend: ## Start only backend development server
	cd backend && npm run dev

dev-frontend: ## Start only frontend development server
	cd frontend && npm run dev

dev-docker: ## Start development with Docker Compose
	@echo "Starting development environment with Docker..."
	docker-compose -f docker-compose.dev.yml up --build

# Building
build: ## Build both backend and frontend for production
	@echo "Building applications..."
	cd backend && npm run build
	cd frontend && npm run build

build-backend: ## Build backend only
	cd backend && npm run build

build-frontend: ## Build frontend only
	cd frontend && npm run build

# Testing
test: ## Run all tests
	@echo "Running all tests..."
	cd backend && npm test
	cd frontend && npm test

test-backend: ## Run backend tests only
	cd backend && npm test

test-frontend: ## Run frontend tests only
	cd frontend && npm test

test-coverage: ## Run tests with coverage report
	cd backend && npm run test:coverage
	cd frontend && npm run test:coverage

test-e2e: ## Run end-to-end tests
	cd frontend && npm run test:e2e

test-integration: ## Run integration tests
	cd backend && npm run test:integration

# Code Quality
lint: ## Run linting on all code
	@echo "Running linters..."
	cd backend && npm run lint
	cd frontend && npm run lint

lint-fix: ## Fix linting issues automatically
	cd backend && npm run lint:fix
	cd frontend && npm run lint:fix

type-check: ## Run TypeScript type checking
	cd backend && npm run type-check
	cd frontend && npm run type-check

# Database
db-setup: ## Set up database (generate client, run migrations)
	cd backend && npx prisma generate
	cd backend && npx prisma db push

db-migrate: ## Run database migrations
	cd backend && npx prisma migrate dev

db-reset: ## Reset database (WARNING: destroys data)
	cd backend && npx prisma migrate reset --force

db-studio: ## Open Prisma Studio
	cd backend && npx prisma studio

# Docker
docker-build: ## Build Docker images
	@echo "Building Docker images..."
	docker-compose build

docker-build-prod: ## Build production Docker images
	@echo "Building production Docker images..."
	docker build -t eli5-backend:latest ./backend
	docker build -t eli5-frontend:latest ./frontend

docker-up: ## Start all services with Docker Compose
	docker-compose up -d

docker-down: ## Stop all Docker services
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Clean up Docker resources
	docker-compose down -v --remove-orphans
	docker system prune -f

# Production
prod: ## Start production servers locally
	@echo "Starting production servers..."
	cd backend && npm start &
	cd frontend && npx serve -s dist

deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	./scripts/deploy-staging.sh

deploy-prod: ## Deploy to production environment
	@echo "Deploying to production..."
	./scripts/deploy-production.sh

# Security
security-scan: ## Run security scans
	@echo "Running security scans..."
	cd backend && npm audit
	cd frontend && npm audit
	docker run --rm -v $(PWD):/app returntocorp/semgrep --config=auto /app

# Performance
perf-test: ## Run performance tests
	@echo "Running performance tests..."
	k6 run tests/performance/load-test.js

lighthouse: ## Run Lighthouse audit
	cd frontend && npm run build
	npx serve -s frontend/dist -l 3001 &
	sleep 5
	npx lighthouse-ci autorun
	pkill -f "serve"

# Utilities
clean: ## Clean build artifacts and dependencies
	@echo "Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf node_modules

logs: ## Show application logs
	tail -f backend/logs/combined.log

health: ## Check application health
	@echo "Backend health:"
	@curl -s http://localhost:3000/api/health | jq . || echo "Backend not running"
	@echo "Frontend health:"
	@curl -s http://localhost:3001/health || echo "Frontend not running"

# Environment
env-setup: ## Copy example environment files
	cp .env.example .env
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env
	@echo "Environment files created. Please update them with your values."

# Git hooks
hooks: ## Install Git hooks
	cp scripts/hooks/pre-commit .git/hooks/pre-commit
	cp scripts/hooks/pre-push .git/hooks/pre-push
	chmod +x .git/hooks/pre-commit .git/hooks/pre-push

# Quick start for new developers
quick-start: env-setup install db-setup ## Quick setup for new developers
	@echo "✅ Quick start complete!"
	@echo "1. Update environment files with your API keys"
	@echo "2. Run 'make dev' to start development servers"
	@echo "3. Visit http://localhost:3001 for the frontend"
	@echo "4. Visit http://localhost:3000/api/health for backend health"

# CI/CD simulation
ci-local: lint type-check test ## Simulate CI pipeline locally
	@echo "✅ Local CI simulation complete!"

# Documentation
docs: ## Generate API documentation
	cd backend && npx typedoc src --out docs
	@echo "Documentation generated in backend/docs/"

# Monitoring
monitor: ## Start monitoring stack (Prometheus + Grafana)
	docker-compose --profile monitoring up -d