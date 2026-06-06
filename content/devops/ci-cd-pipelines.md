---
title: "CI/CD Pipelines"
category: "DevOps & Infrastructure"
difficulty: "intermediate"
tags: ["CI", "CD", "pipelines", "GitHub-Actions", "testing", "deployment", "automation", "GitOps"]
order: 2
---

# CI/CD Pipelines

Continuous Integration and Continuous Delivery/Deployment are engineering practices that make software delivery fast, safe, and repeatable. When done well, CI/CD lets teams deploy dozens of times a day with confidence.

---

## CI vs CD vs CD

| Term | Stands for | Meaning |
|---|---|---|
| **CI** | Continuous Integration | Automatically build + test every commit |
| **CD** | Continuous Delivery | Automatically prepare a release; human approves deployment |
| **CD** | Continuous Deployment | Automatically deploy to production on every green commit |

```
Developer pushes code
         │
    ┌────▼─────┐
    │    CI    │  Build → Test → Lint → Security scan
    └────┬─────┘
         │ green
    ┌────▼─────┐
    │ Staging  │  Deploy to staging → smoke tests
    │  Deploy  │
    └────┬─────┘
         │ Continuous Delivery: manual approval gate here
         │ Continuous Deployment: automatic
    ┌────▼─────┐
    │   Prod   │  Deploy to production
    │  Deploy  │
    └──────────┘
```

---

## GitHub Actions — The Standard

GitHub Actions defines workflows as YAML files in `.github/workflows/`:

### Complete CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '22'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── Test Job ─────────────────────────────────────────────
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/testdb

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ── Security Scan ─────────────────────────────────────────
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=high
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  # ── Build & Push Image ────────────────────────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [test, security]  # only if tests pass
    permissions:
      contents: read
      packages: write

    outputs:
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-
            type=semver,pattern={{version}}

      - uses: docker/build-push-action@v5
        id: build
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Deploy to Staging ─────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          echo "Deploying ${{ needs.build.outputs.image-digest }} to staging"
          # kubectl set image deployment/app app=$IMAGE@$DIGEST
          # or: render deploy, fly deploy, etc.
        env:
          KUBECONFIG: ${{ secrets.KUBECONFIG_STAGING }}
```

### Deployment to Production (with Approval)

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy to Production

on:
  workflow_dispatch:  # manual trigger
    inputs:
      version:
        description: 'Image tag to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # environment has approval requirement in GitHub settings
    
    steps:
      - name: Deploy to production
        run: ./scripts/deploy.sh ${{ inputs.version }}
        env:
          KUBECONFIG: ${{ secrets.KUBECONFIG_PROD }}
```

---

## Key Pipeline Concepts

### Caching — Speed Up Pipelines

```yaml
# Cache npm dependencies
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('package-lock.json') }}
    restore-keys: npm-

# Cache Docker layers (already shown above with cache-from/cache-to: type=gha)

# Cache Go modules
- uses: actions/cache@v4
  with:
    path: ~/go/pkg/mod
    key: go-${{ hashFiles('go.sum') }}
```

### Matrix Builds — Test Across Multiple Environments

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, macos-latest, windows-latest]

steps:
  - uses: actions/setup-node@v4
    with:
      node-version: ${{ matrix.node }}
  - run: npm test
```

### Secrets — Never Hardcode Credentials

```yaml
# Access via ${{ secrets.MY_SECRET }}
# Set in: GitHub repo → Settings → Secrets and variables → Actions

- name: Deploy
  env:
    API_KEY: ${{ secrets.PRODUCTION_API_KEY }}
    DB_URL:  ${{ secrets.DATABASE_URL }}
  run: ./deploy.sh
```

### Reusable Workflows

```yaml
# .github/workflows/reusable-test.yml
on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '22'
    secrets:
      DATABASE_URL:
        required: true

# .github/workflows/ci.yml
jobs:
  test:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '22'
    secrets:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Deployment Strategies

| Strategy | How | Downtime | Risk |
|---|---|---|---|
| **Big Bang** | Replace all at once | Yes | High |
| **Rolling** | Replace instances one by one | No | Medium |
| **Blue-Green** | Run two identical envs, switch traffic | No | Low |
| **Canary** | Route N% of traffic to new version | No | Lowest |
| **Feature Flags** | Deploy code, enable feature per user | No | Lowest |

### Blue-Green Deployment

```
Production:
  Load Balancer → Blue (v1) [100% traffic]
                  Green (v2) [0% traffic, being deployed]

Deploy:
  1. Deploy v2 to Green
  2. Run smoke tests on Green
  3. Switch LB: Green gets 100% traffic
  4. Blue stays warm (instant rollback)
  5. After confidence period, remove Blue

Rollback: Switch LB back to Blue — instant, zero downtime
```

### Canary Release

```yaml
# Kubernetes example
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  strategy:
    canary:
      steps:
      - setWeight: 5    # 5% of traffic to new version
      - pause: {duration: 10m}
      - setWeight: 25
      - pause: {duration: 10m}
      - setWeight: 50
      - pause: {duration: 10m}
      - setWeight: 100  # full rollout
      # Auto-rollback if error rate spikes
      analysis:
        templates:
        - templateName: error-rate
        args:
        - name: service-name
          value: my-app
```

---

## Pipeline Best Practices

| Practice | Why |
|---|---|
| **Fast feedback first** | Run lint before tests, unit tests before integration tests |
| **Fail fast** | Don't run expensive steps if cheap ones fail |
| **Immutable artifacts** | Build once, deploy the same artifact to all environments |
| **Pin action versions** | `uses: actions/checkout@v4` not `@latest` |
| **Least privilege** | `GITHUB_TOKEN` permissions: `contents: read` only |
| **Parallelise where possible** | Independent jobs run in parallel |
| **Environment-specific secrets** | Staging and prod have separate secrets |
| **Protect `main` branch** | Require PR + CI green + review before merge |
| **Deployment is separate from release** | Feature flags decouple code deploy from feature release |

---

## GitOps — Infrastructure as Code

GitOps treats the Git repository as the **single source of truth** for infrastructure state:

1. Desired state is declared in Git (Kubernetes manifests, Helm charts, Terraform)
2. An operator (ArgoCD, Flux) continuously reconciles actual state to desired state
3. Deployment = merge to `main`; rollback = revert commit

```yaml
# ArgoCD Application — declares desired state
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    path: apps/my-app
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true    # delete resources removed from Git
      selfHeal: true # fix manual changes
```
