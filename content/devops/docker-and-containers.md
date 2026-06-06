---
title: "Docker & Containers"
category: "DevOps & Infrastructure"
difficulty: "beginner"
tags: ["docker", "containers", "dockerfile", "docker-compose", "images", "networking", "volumes", "registry"]
order: 1
---

# Docker & Containers

Docker changed how software is built and deployed. Containers package your application with all its dependencies — making environments reproducible, deployments predictable, and scaling effortless.

---

## The Problem Docker Solves

**"It works on my machine"** — the classic developer lament. Before containers, deploying software meant:
- Different OS versions between dev/staging/production
- Conflicting library versions across services
- Manual environment setup prone to human error
- Difficult-to-reproduce bugs caused by environment differences

**Containers** package the application + all its dependencies + the OS libraries it needs into a single, portable, reproducible unit.

---

## Virtual Machines vs Containers

```
Virtual Machine:            Container:
┌─────────────────┐         ┌─────────────────┐
│   Application   │         │   Application   │
│   Libraries     │         │   Libraries     │
│   OS (full)     │ ← 1GB+  │ ← minimal OS    │ ← MBs
│   Hypervisor    │         │ ┌─────────────┐ │
│   Host OS       │         │ │Docker Engine│ │
│   Hardware      │         │ │  Host OS    │ │
└─────────────────┘         │ │  Hardware   │ │
                            └─└─────────────┘─┘

VM: Full OS copy, minutes to start, 512MB–4GB per VM
Container: Shared kernel, milliseconds to start, MBs per container
```

Containers are **not** VMs — they share the host OS kernel. Isolation is provided by Linux **namespaces** (process, network, mount, PID) and **cgroups** (CPU, memory limits).

---

## Core Docker Concepts

| Concept | Description |
|---|---|
| **Image** | Read-only template with the app + dependencies. Like a class. |
| **Container** | Running instance of an image. Like an object. |
| **Dockerfile** | Recipe for building an image |
| **Registry** | Remote store for images (Docker Hub, GHCR, ECR) |
| **Volume** | Persistent storage outside the container lifecycle |
| **Network** | Virtual network connecting containers |
| **Layer** | Each Dockerfile instruction creates a cached, reusable layer |

---

## Writing a Dockerfile

```dockerfile
# ── Base image ────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app

# ── Dependencies layer ────────────────────────────────────
# Copy only package files first — this layer is cached until
# package.json changes (avoids reinstalling on every code change)
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ── Build layer ───────────────────────────────────────────
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Production image (multi-stage = smaller final image) ──
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Copy only what's needed in production
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

### Key Dockerfile Best Practices

| Practice | Why |
|---|---|
| Use **multi-stage builds** | Final image contains only runtime, not build tools (10× smaller) |
| **Order layers** by change frequency | Rarely-changing layers (deps) before frequently-changing (code) |
| Use **alpine** or **distroless** base | Minimal attack surface, smaller size |
| **Never run as root** | Security — compromised container can't own host |
| Use `.dockerignore` | Exclude `node_modules`, `.git`, build artifacts from context |
| **Pin base image versions** | `node:22.3.0-alpine` not `node:latest` |

```dockerignore
node_modules
.git
.env
*.log
coverage
dist
```

---

## Essential Docker Commands

```bash
# Build
docker build -t my-app:1.0.0 .
docker build -t my-app:latest --platform linux/amd64 .

# Run
docker run -d \
  --name my-app \
  -p 3000:3000 \               # host:container port mapping
  -e DATABASE_URL=postgres://... \  # environment variable
  -v /data/uploads:/app/uploads \   # volume mount
  --memory 512m \              # memory limit
  --cpus 0.5 \                 # CPU limit
  --restart unless-stopped \   # restart policy
  my-app:latest

# Inspect
docker ps                      # list running containers
docker ps -a                   # include stopped
docker logs my-app -f          # follow logs
docker exec -it my-app sh      # open shell inside running container
docker inspect my-app          # full JSON metadata
docker stats                   # live resource usage

# Images
docker images                  # list local images
docker pull node:22-alpine     # pull from registry
docker push myrepo/my-app:1.0  # push to registry
docker rmi my-app:latest       # remove image

# Cleanup
docker system prune -a         # remove all unused resources
docker volume prune            # remove unused volumes
```

---

## Docker Compose — Multi-Container Applications

Docker Compose defines and runs multi-container apps with a single YAML file:

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb
    volumes:
      - redis_data:/data
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/ssl/certs:ro
    depends_on:
      - app
    networks:
      - app-network

volumes:
  postgres_data:
  redis_data:
  uploads:

networks:
  app-network:
    driver: bridge
```

```bash
# Compose commands
docker compose up -d            # start all services detached
docker compose up --build       # rebuild images before starting
docker compose down             # stop and remove containers
docker compose down -v          # also remove volumes
docker compose logs app -f      # follow logs for a service
docker compose exec app sh      # shell into a running service
docker compose ps               # status of all services
docker compose scale app=3      # run 3 replicas of app
```

---

## Networking

Containers on the same Docker network communicate via **service name** as hostname:

```javascript
// In the 'app' container, connect to 'db' service:
const conn = await connect('postgres://user:pass@db:5432/mydb');
// 'db' resolves to the postgres container's IP via Docker DNS
```

Network types:
- **bridge** (default): Isolated network per compose project
- **host**: Container shares host's network stack (no isolation)
- **none**: No networking
- **overlay**: Multi-host networking (Docker Swarm)

---

## Image Layers & Caching

Every `RUN`, `COPY`, `ADD` instruction creates a layer. Docker caches layers — if a layer hasn't changed, it reuses the cached version.

```dockerfile
# ❌ Code change invalidates npm install (expensive!)
COPY . .
RUN npm ci

# ✅ Package.json rarely changes — npm install stays cached
COPY package*.json ./
RUN npm ci          ← cached until package.json changes
COPY . .            ← code changes only affect this + subsequent layers
```

---

## Container Security Checklist

| ✅ | Practice |
|---|---|
| 🔒 | Run as non-root user |
| 🔒 | Use read-only filesystem (`--read-only`) where possible |
| 🔒 | Scan images: `docker scout cves my-app` |
| 🔒 | Don't store secrets in Dockerfile or image layers |
| 🔒 | Use Docker secrets or env files (`.env`) |
| 🔒 | Pin base image versions |
| 🔒 | Use distroless or minimal base images |
| 🔒 | Drop unnecessary capabilities (`--cap-drop ALL`) |
| 🔒 | Set resource limits (memory + CPU) |
| 🔒 | Use private registry for internal images |
