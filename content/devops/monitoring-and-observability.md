---
title: "Monitoring & Observability"
category: "DevOps & Infrastructure"
difficulty: "intermediate"
tags: ["monitoring", "observability", "metrics", "logs", "tracing", "Prometheus", "Grafana", "OpenTelemetry", "alerting"]
order: 3
---

# Monitoring & Observability

You cannot improve what you cannot measure. Observability is the ability to understand what's happening inside your system from its external outputs — critical for debugging production issues, capacity planning, and SLA compliance.

---

## The Three Pillars

| Pillar | What it captures | Tool examples |
|---|---|---|
| **Metrics** | Aggregated numerical measurements over time | Prometheus, Datadog, CloudWatch |
| **Logs** | Discrete events with context | Loki, Elasticsearch, CloudWatch Logs |
| **Traces** | Request flow across services | Jaeger, Tempo, Zipkin, AWS X-Ray |

These three pillars answer different questions:
- **Metrics:** "Is the system healthy? Are there anomalies?"
- **Logs:** "What exactly happened at 14:32:05?"
- **Traces:** "Why did this request take 2 seconds? Which service was slow?"

---

## Metrics — The Heartbeat

### Types of Metrics

| Type | Description | Example |
|---|---|---|
| **Counter** | Monotonically increasing; only goes up | Total HTTP requests, errors |
| **Gauge** | Current value; can go up or down | Active connections, memory usage |
| **Histogram** | Distribution of values in buckets | Request latency, file sizes |
| **Summary** | Pre-computed quantiles (client-side) | p50, p95, p99 latency |

### The Four Golden Signals (Google SRE)

| Signal | Metric | Alert threshold example |
|---|---|---|
| **Latency** | p50/p95/p99 response time | p99 > 500ms for 5 minutes |
| **Traffic** | Requests per second | Sudden 10× spike |
| **Errors** | Error rate (5xx / total) | Error rate > 1% |
| **Saturation** | CPU, memory, queue depth | CPU > 85% sustained |

### Prometheus + Node.js

```javascript
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry }); // CPU, memory, event loop lag

// Define metrics
const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active WebSocket connections',
  registers: [registry],
});

// Middleware to instrument every request
app.use((req, res, next) => {
  const end = httpDuration.startTimer({ method: req.method, path: req.route?.path ?? req.path });
  res.on('finish', () => {
    const labels = { method: req.method, path: req.route?.path ?? req.path, status: String(res.statusCode) };
    httpRequests.inc(labels);
    end(labels);
  });
  next();
});

// Expose /metrics endpoint for Prometheus to scrape
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### PromQL — Prometheus Query Language

```promql
# Error rate (errors / total) over 5 min window
rate(http_requests_total{status=~"5.."}[5m])
/
rate(http_requests_total[5m])

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Requests per second by path
topk(10, rate(http_requests_total[5m])) by (path)

# Alert rule: error rate > 1% for 2 minutes
# groups:
# - alert: HighErrorRate
#   expr: error_rate > 0.01
#   for: 2m
#   labels:
#     severity: critical
```

---

## Structured Logging

Logs must be **structured** (JSON) to be queryable at scale:

```javascript
// ❌ Unstructured — hard to query
console.log(`User 42 created order 123 for $99.99 at 2024-06-07T14:32:05Z`);

// ✅ Structured — every field queryable
logger.info('order.created', {
  userId: 42,
  orderId: 123,
  amount: 99.99,
  currency: 'USD',
  requestId: req.id,
  durationMs: 45,
  timestamp: new Date().toISOString(),
});
```

### Pino — High-Performance Node.js Logger

```javascript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // In production, transport to a collector
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  base: {
    service: 'user-service',
    version: process.env.npm_package_version,
    env: process.env.NODE_ENV,
  },
  redact: ['req.headers.authorization', 'body.password'], // never log secrets
});

// Child loggers inherit context
const requestLogger = logger.child({ requestId: 'abc-123', userId: 42 });
requestLogger.info('Processing payment');
// → { service: 'user-service', requestId: 'abc-123', userId: 42, msg: 'Processing payment', ... }
```

### Log Levels — Use Them Right

| Level | When to use |
|---|---|
| `error` | System error requiring intervention, request failed unexpectedly |
| `warn` | Recoverable issue, deprecated usage, near threshold |
| `info` | Normal lifecycle events (request received, order created, user logged in) |
| `debug` | Detailed diagnostic info for debugging — off in production |
| `trace` | Very verbose — database queries, every function call |

---

## Distributed Tracing

A trace follows a **single request** across multiple services:

```
Request ──→ API Gateway ──→ User Service ──→ Database
                      ↘──→ Order Service ──→ Payment Service ──→ Database

Trace ID: abc-123
  Span: API Gateway (200ms total)
    Span: User Service (50ms)
      Span: DB query users (10ms)
    Span: Order Service (130ms)
      Span: Payment Service (100ms)
        Span: DB query payments (20ms)
```

### OpenTelemetry — The Standard

```javascript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.2.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
});

sdk.start();

// Manual spans
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('user-service');

async function createOrder(userId: number, items: Item[]) {
  const span = tracer.startSpan('createOrder');
  span.setAttribute('userId', userId);
  span.setAttribute('itemCount', items.length);

  try {
    const order = await db.createOrder(userId, items);
    span.setAttribute('orderId', order.id);
    span.setStatus({ code: SpanStatusCode.OK });
    return order;
  } catch (err) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
    span.recordException(err);
    throw err;
  } finally {
    span.end();
  }
}
```

---

## Alerting Best Practices

### The SLO/SLA Framework

- **SLI** (Service Level Indicator): A metric that measures service health. E.g., "% of requests < 200ms"
- **SLO** (Service Level Objective): Target for SLI. E.g., "99.9% of requests < 200ms per month"
- **SLA** (Service Level Agreement): Legal contract with consequences for breach
- **Error Budget**: `1 - SLO`. At 99.9% SLO → 43.8 minutes downtime/month budgeted

### Alert on Symptoms, Not Causes

```yaml
# ❌ Cause-based alert — too noisy, often not actionable
- alert: HighCPU
  expr: cpu_usage > 80
  # So what? Maybe it's just high traffic

# ✅ Symptom-based alert — user-facing impact
- alert: HighLatency
  expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0.5
  for: 5m
  annotations:
    summary: "p99 latency above 500ms for 5 minutes"
    runbook: "https://wiki.company.com/runbooks/high-latency"
```

### Runbooks

Every alert should link to a **runbook** — a document that tells the on-call engineer:
1. What does this alert mean?
2. What is the impact?
3. How do I diagnose it? (PromQL queries, log queries to run)
4. What are the common causes?
5. How do I fix each cause?
6. When to escalate?

---

## Health Check Endpoints

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Detailed readiness check (used by Kubernetes to route traffic)
app.get('/ready', async (req, res) => {
  const checks = await Promise.allSettled([
    db.query('SELECT 1'),
    redis.ping(),
    checkDependencies(),
  ]);

  const results = {
    database: checks[0].status === 'fulfilled' ? 'ok' : 'fail',
    cache:    checks[1].status === 'fulfilled' ? 'ok' : 'fail',
    deps:     checks[2].status === 'fulfilled' ? 'ok' : 'fail',
  };

  const healthy = Object.values(results).every(v => v === 'ok');
  res.status(healthy ? 200 : 503).json(results);
});
```

```yaml
# Kubernetes probes
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```
