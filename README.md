# ELI5 Video Teacher 🎓✨

An AI-powered educational video generator that creates simple, engaging explanations for children. Turn any complex topic into a fun, easy-to-understand video that feels like it was made by a friendly teacher!

[![CI Pipeline](https://github.com/your-username/eli5-video-teacher/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/eli5-video-teacher/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/your-username/eli5-video-teacher/actions/workflows/cd.yml/badge.svg)](https://github.com/your-username/eli5-video-teacher/actions/workflows/cd.yml)
[![Security Scan](https://github.com/your-username/eli5-video-teacher/actions/workflows/security.yml/badge.svg)](https://github.com/your-username/eli5-video-teacher/actions/workflows/security.yml)
[![Codecov](https://codecov.io/gh/your-username/eli5-video-teacher/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/eli5-video-teacher)

## 🌟 Features

- **AI-Powered Content Generation**: Uses GPT-4 to create age-appropriate scripts
- **Professional Voice Synthesis**: ElevenLabs generates natural-sounding narration
- **Dynamic Video Creation**: Pika Labs and RunwayML create engaging visuals
- **Multiple Tone Options**: Funny, serious, poetic, or custom explanations
- **Real-time Progress Tracking**: Watch your video come to life with live updates
- **User-Friendly Interface**: Simple, colorful design perfect for kids and parents
- **Video Gallery**: Save and organize all your educational content
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with Prisma ORM
- **Queue System**: Redis + Bull for video processing
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 for videos and audio
- **AI Services**: OpenAI, ElevenLabs, Pika Labs, RunwayML
- **Real-time Updates**: Socket.IO for progress tracking

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Context + Custom hooks
- **Build Tool**: Vite for fast development
- **Real-time**: Socket.IO client for live updates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL database (or use Docker)
- Redis server (or use Docker)
- AWS S3 account
- AI service API keys (OpenAI, ElevenLabs, Pika Labs, RunwayML)

### Option 1: Docker Development Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/eli5-video-teacher.git
cd eli5-video-teacher

# Quick start for new developers
make quick-start

# Start development environment with Docker
make dev-docker
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Backend API on http://localhost:3000
- Frontend on http://localhost:3001
- Redis Commander on http://localhost:8081
- MailHog (email testing) on http://localhost:8025

### Option 2: Local Development Setup

```bash
# Install all dependencies
make install

# Set up environment variables
make env-setup
# Edit .env, backend/.env, frontend/.env with your API keys

# Set up database
make db-setup

# Start development servers
make dev
```

## 🐳 Docker Deployment

### Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop environment
docker-compose -f docker-compose.dev.yml down
```

### Production Deployment

```bash
# Build production images
make docker-build-prod

# Start production environment
docker-compose up -d

# Check service health
docker-compose ps
make health

# View production logs
docker-compose logs -f

# Stop production environment
docker-compose down
```

### Container Services

| Service | Description | Port | Health Check |
|---------|-------------|------|--------------|
| `database` | PostgreSQL 15 | 5432 | `pg_isready` |
| `redis` | Redis 7 | 6379 | `redis-cli ping` |
| `backend` | Node.js API Server | 3000 | `/api/health` |
| `frontend` | React + Nginx | 80 | `/health` |
| `queue-worker` | Background job processor | - | Internal |
| `nginx` | Reverse Proxy (optional) | 8080/8443 | HTTP check |

### Environment Variables

Create `.env` file from `.env.example` and configure:

```env
# Database
DATABASE_URL="postgresql://eli5user:eli5password@localhost:5432/eli5_video_teacher"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
PIKA_API_KEY="your-pika-api-key"
RUNWAYML_API_KEY="your-runwayml-api-key"

# AWS S3
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="eli5-video-storage"

# Security
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
```

### Docker Commands

```bash
# Build specific service
docker-compose build backend

# Scale services
docker-compose up -d --scale queue-worker=3

# Execute commands in containers
docker-compose exec backend npm run db:migrate
docker-compose exec database psql -U eli5user eli5_video_teacher

# View resource usage
docker stats

# Clean up
make docker-clean
```

## 🧪 Testing

### Test Suite Overview

- **Backend Tests**: Jest + Supertest (Unit & Integration)
- **Frontend Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **API Tests**: REST API validation
- **Performance Tests**: k6 load testing
- **Security Tests**: Vulnerability scanning

### Running Tests

```bash
# Run all tests
make test

# Backend tests only
make test-backend

# Frontend tests only  
make test-frontend

# Integration tests
make test-integration

# E2E tests
make test-e2e

# Test coverage
make test-coverage

# Performance tests
make perf-test
```

### Test Structure

```
├── backend/tests/
│   ├── unit/                 # Unit tests
│   │   ├── utils/           # Utility function tests
│   │   └── services/        # Service layer tests
│   ├── integration/         # API integration tests
│   │   ├── auth.test.ts     # Authentication endpoints
│   │   └── video.test.ts    # Video CRUD operations
│   ├── fixtures/            # Test data
│   └── setup.ts             # Test configuration
├── frontend/src/test/
│   ├── components/          # Component tests
│   ├── mocks/              # MSW API mocks
│   ├── utils/              # Test utilities
│   └── setup.ts            # Test setup
└── tests/
    ├── e2e/                # End-to-end tests
    └── performance/        # Load testing scripts
```

### Test Coverage Requirements

- **Minimum Coverage**: 80%
- **Critical Paths**: 100%
- **Security Functions**: 100%
- **API Endpoints**: 100%

### Writing Tests

```typescript
// Backend Unit Test Example
describe('ContentGenerator', () => {
  it('should generate age-appropriate content', async () => {
    const script = await contentGenerator.generateELI5Script(
      'How do airplanes fly?', 
      'funny'
    );
    expect(script.scenes).toHaveLength(3);
    expect(script.tone).toBe('funny');
  });
});

// Frontend Component Test Example
describe('TopicForm', () => {
  it('should validate topic input', async () => {
    render(<TopicForm onSubmit={mockSubmit} />);
    
    const input = screen.getByLabelText(/topic/i);
    fireEvent.change(input, { target: { value: 'Hi' } });
    
    await waitFor(() => {
      expect(screen.getByText(/at least 5 characters/i)).toBeInTheDocument();
    });
  });
});
```

### Continuous Testing

Tests run automatically on:
- Every commit (pre-commit hook)
- Pull requests (GitHub Actions)
- Main branch pushes (full test suite)
- Scheduled runs (nightly regression tests)

## 🔄 CI/CD Pipeline

### Pipeline Overview

Our CI/CD pipeline ensures code quality, security, and reliable deployments through multiple automated stages.

### Workflow Triggers

```yaml
# Continuous Integration (CI)
on:
  push: [main, develop]
  pull_request: [main]

# Continuous Deployment (CD)  
on:
  push: [main]
  tags: ['v*']
```

### CI Pipeline Stages

#### 1. Code Quality & Security
- **ESLint**: Code style and quality checks
- **TypeScript**: Type checking and compilation
- **Semgrep**: Security vulnerability scanning
- **npm audit**: Dependency vulnerability check

#### 2. Automated Testing
- **Unit Tests**: Component and function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user workflow testing
- **Performance Tests**: Load testing and metrics

#### 3. Build & Package
- **Docker Images**: Multi-architecture builds
- **Container Registry**: GitHub Container Registry
- **Security Scanning**: Trivy vulnerability scan
- **Image Optimization**: Multi-stage builds

### CD Pipeline Stages

#### 1. Staging Deployment
```bash
# Automatic deployment to staging
aws eks update-kubeconfig --name eli5-staging-cluster
helm upgrade --install eli5-staging ./helm-chart \
  --set image.tag=$GITHUB_SHA \
  --set environment=staging
```

#### 2. Integration Testing
- Smoke tests against staging
- API integration validation  
- E2E test suite execution
- Performance regression checks

#### 3. Production Deployment
```bash
# Manual approval required
# Blue-green deployment strategy
helm upgrade --install eli5-production ./helm-chart \
  --set image.tag=$GITHUB_SHA \
  --set environment=production \
  --set replicas=5
```

### Pipeline Commands

```bash
# Simulate CI locally
make ci-local

# Build production images
make docker-build-prod

# Deploy to staging
make deploy-staging

# Deploy to production (requires approval)
make deploy-prod

# Check deployment status
kubectl get pods -n eli5-production
```

### Environments

| Environment | URL | Purpose | Auto-Deploy |
|-------------|-----|---------|-------------|
| **Development** | http://localhost:3001 | Local development | Manual |
| **Staging** | https://staging.eli5videoteacher.com | Pre-production testing | ✅ Auto |
| **Production** | https://eli5videoteacher.com | Live application | 🔒 Manual Approval |

### Monitoring & Alerts

- **Health Checks**: Continuous service monitoring
- **Performance Metrics**: Response times, error rates
- **Security Alerts**: Vulnerability notifications
- **Deployment Status**: Slack notifications
- **Rollback Capability**: Automatic failure recovery

### Security Pipeline

```bash
# Daily security scans
- Dependency vulnerability scanning
- Container image scanning  
- Code security analysis
- License compliance checking
- Secrets detection
```

### Performance Monitoring

```bash
# Performance testing pipeline
- Lighthouse audits (< 3s page load)
- Load testing (500+ concurrent users)
- Bundle size monitoring
- Memory usage profiling
- API response time tracking
```

## 📊 Monitoring & Observability

### Application Metrics

Access monitoring dashboards:
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Health Status**: http://localhost:3000/api/health

### Key Metrics Monitored

- **Response Time**: API endpoint performance
- **Error Rate**: Application error tracking  
- **Video Generation**: Processing success/failure rates
- **Queue Health**: Background job processing
- **Resource Usage**: CPU, memory, disk usage

### Alerting

Configure alerts for:
- High error rates (> 5%)
- Slow response times (> 500ms)
- Queue backlog (> 100 jobs)
- Service downtime
- Security incidents

## 🔒 Security

### Security Features

- **Input Validation**: Comprehensive sanitization
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control
- **Rate Limiting**: API abuse protection
- **Content Filtering**: Child-appropriate content
- **HTTPS**: SSL/TLS encryption
- **Security Headers**: XSS, CSRF protection

### Compliance

- **COPPA**: Children's privacy protection
- **GDPR**: Data protection and privacy
- **SOC 2**: Security controls
- **OWASP**: Security best practices

### Security Scanning

```bash
# Run security scans
make security-scan

# Check for vulnerabilities
npm audit
docker scan eli5-backend:latest
```

## 🎮 Usage Examples

### API Usage

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}' 

# Generate video
curl -X POST http://localhost:3000/api/videos/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"How do airplanes fly?","tone":"FUNNY"}'

# Check status
curl http://localhost:3000/api/videos/status/$VIDEO_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Usage

1. **Register/Login**: Create account or sign in
2. **Choose Topic**: Enter any educational topic
3. **Select Tone**: Pick funny, serious, poetic, or custom
4. **Generate Video**: Watch real-time progress
5. **View Gallery**: Access all your videos

## 📝 Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
make test
make lint

# Commit changes
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Code Standards

- **TypeScript**: Strict type checking
- **ESLint**: Code style enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Pre-commit Hooks**: Automated checks

### Development Tools

```bash
# Install development tools
make install-tools

# Set up Git hooks
make hooks

# Generate API documentation
make docs

# Database management
make db-studio
```

## 🚢 Deployment Options

### 1. Docker Compose (Recommended for Development)

```bash
docker-compose up -d
```

### 2. Kubernetes (Production)

```bash
helm install eli5 ./helm-chart \
  --set environment=production \
  --set replicas=5
```

### 3. AWS EKS (Cloud Production)

```bash
# Configure AWS CLI
aws configure

# Deploy to EKS
kubectl apply -f k8s/
```

### 4. Local Development

```bash
make dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Contribution Guidelines

- Follow TypeScript best practices
- Write comprehensive tests (>80% coverage)
- Update documentation
- Follow security guidelines
- Ensure CI pipeline passes

## 📞 Support

### Getting Help

- **Documentation**: Check this README and inline code docs
- **Issues**: Create GitHub issues for bugs/features
- **Discussions**: Use GitHub Discussions for questions
- **Email**: support@eli5videoteacher.com

### Troubleshooting

#### Common Issues

**Docker Build Fails**
```bash
# Clean Docker cache
docker system prune -a
make docker-clean
```

**Database Connection Error**
```bash
# Check database status
docker-compose ps database
make health
```

**Tests Failing**
```bash
# Reset test database  
make db-reset
cd backend && npm run test:setup
```

**Frontend Not Loading**
```bash
# Clear node modules and reinstall
make clean
make install
```

## 📋 Roadmap

- [ ] **Mobile App**: React Native application
- [ ] **Advanced AI**: GPT-4 Turbo integration
- [ ] **Multi-language**: International support
- [ ] **Teacher Tools**: Classroom management features
- [ ] **Analytics**: Detailed usage insights
- [ ] **API v2**: GraphQL API
- [ ] **Offline Mode**: Progressive Web App features

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT-4 content generation
- **ElevenLabs** for voice synthesis
- **Pika Labs** for video generation  
- **RunwayML** for video effects
- **React & Node.js** communities
- **Docker & Kubernetes** for containerization
- **GitHub Actions** for CI/CD automation

---

**Made with ❤️ for curious minds everywhere! 🌟**

*Empowering children to learn through engaging, AI-generated educational videos.*