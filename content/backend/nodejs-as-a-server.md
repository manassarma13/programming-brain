---
title: "Node.js as a Server"
category: "Backend Engineering"
difficulty: "intermediate"
tags: ["nodejs", "server", "event-loop", "streams", "clustering", "express", "fastify", "http", "middleware"]
order: 1
---

# Node.js as a Server

Node.js is not just a runtime — it's a paradigm shift. Its non-blocking, event-driven architecture lets a single thread serve thousands of concurrent connections without threads, which is what makes it uniquely suited for I/O-bound workloads.

---

## Why Node.js for Servers?

Traditional server models (Apache, PHP, older Java) use a **thread-per-request** model. Each incoming connection blocks a thread while waiting for I/O (DB queries, file reads, network calls). With 10,000 concurrent users, you need 10,000 threads — expensive memory + context-switching overhead.

Node.js uses a **single-threaded event loop** backed by **libuv** (C++ async I/O library). One thread handles thousands of concurrent connections by never blocking — it offloads I/O to the OS and handles results via callbacks/Promises.

```
Thread-per-request model:
  Request 1 → Thread 1 [BLOCKED on DB query]
  Request 2 → Thread 2 [BLOCKED on DB query]
  Request 3 → Thread 3 [BLOCKED on DB query]
  Memory: ~1MB × N threads

Node.js event loop:
  Request 1 → sent to DB, callback registered
  Request 2 → sent to DB, callback registered
  Request 3 → sent to DB, callback registered
  → Loop handles all callbacks when I/O completes
  Memory: single thread + small I/O callback overhead
```

**Node.js excels at:** APIs, BFF (Backend for Frontend), real-time apps, streaming, microservices  
**Node.js struggles with:** CPU-heavy work (video encoding, ML inference, cryptography at scale)

---

## The Node.js Event Loop (Server Side)

Node's event loop has **6 phases** (powered by libuv):

```
   ┌──────────────────────────┐
┌─>│          timers          │  setTimeout, setInterval callbacks
│  └──────────┬───────────────┘
│  ┌──────────┴───────────────┐
│  │     pending callbacks    │  deferred I/O callbacks from last loop
│  └──────────┬───────────────┘
│  ┌──────────┴───────────────┐
│  │       idle, prepare      │  internal use
│  └──────────┬───────────────┘
│  ┌──────────┴───────────────┐
│  │           poll           │  retrieve I/O events; execute I/O callbacks
│  └──────────┬───────────────┘
│  ┌──────────┴───────────────┐
│  │           check          │  setImmediate callbacks
│  └──────────┬───────────────┘
│  ┌──────────┴───────────────┐
└──│      close callbacks     │  socket.destroy(), etc.
   └──────────────────────────┘
      ↑ between each phase: drain microtask queue (process.nextTick + Promises)
```

`process.nextTick()` runs between **every** phase transition — even before Promises. Use it sparingly.

---

## Creating a Raw HTTP Server

```javascript
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  // req: IncomingMessage (readable stream)
  // res: ServerResponse (writable stream)

  const { method, url, headers } = req;

  if (method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (method === 'POST' && url === '/echo') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
```

---

## Express.js — The Industry Standard

Express is minimal and unopinionated — a thin wrapper over Node's `http` module:

```javascript
import express from 'express';

const app = express();

// Built-in middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware — runs for every request
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`${req.method} ${req.url}`);
  next(); // must call next() or the request hangs
});

// Route handlers
app.get('/users', async (req, res, next) => {
  try {
    const users = await db.query('SELECT * FROM users');
    res.json(users);
  } catch (err) {
    next(err); // pass to error handler
  }
});

app.post('/users', async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await db.create({ name, email });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// Error handling middleware (4 params — Express detects this)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status ?? 500).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(3000);
```

### Express Router — Modular Routes

```javascript
// routes/users.js
import { Router } from 'express';
const router = Router();

router.get('/',     getUsers);
router.post('/',    createUser);
router.get('/:id',  getUserById);
router.put('/:id',  updateUser);
router.delete('/:id', deleteUser);

export default router;

// app.js
import usersRouter from './routes/users.js';
app.use('/api/users', usersRouter);
```

---

## Fastify — The High-Performance Alternative

Fastify is ~2× faster than Express due to schema-based serialisation and better internals:

```javascript
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

// Schema validation + serialisation (uses ajv + fast-json-stringify)
const getUsersSchema = {
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:    { type: 'integer' },
          name:  { type: 'string' },
          email: { type: 'string' },
        },
      },
    },
  },
};

fastify.get('/users', { schema: getUsersSchema }, async (request, reply) => {
  return db.getUsers(); // schema drives fast JSON serialisation
});

fastify.post('/users', {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name:  { type: 'string', minLength: 1 },
        email: { type: 'string', format: 'email' },
      },
    },
  },
}, async (request, reply) => {
  const user = await db.createUser(request.body);
  reply.status(201).send(user);
});

await fastify.listen({ port: 3000 });
```

### Fastify Plugins — Encapsulation

```javascript
async function usersPlugin(fastify, options) {
  // Routes and decorators scoped to this plugin
  fastify.addHook('preHandler', authenticate);

  fastify.get('/', getUsers);
  fastify.post('/', createUser);
}

fastify.register(usersPlugin, { prefix: '/api/users' });
```

---

## Streams — The Node.js Superpower

Streams let you process data **piece by piece** instead of loading it all into memory — essential for large files, real-time data, proxies.

```javascript
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

// Stream a large file through gzip to response — constant memory usage
async function serveCompressedFile(req, res) {
  res.setHeader('Content-Encoding', 'gzip');
  res.setHeader('Content-Type', 'application/octet-stream');

  await pipeline(
    createReadStream('./large-file.csv'),
    createGzip(),
    res,
  );
}

// Transform stream — process CSV line by line
import { Transform } from 'node:stream';

const csvToJson = new Transform({
  objectMode: true,
  transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const [name, email, age] = line.split(',');
        this.push({ name, email, age: parseInt(age) });
      }
    }
    callback();
  },
});
```

---

## Clustering — Using All CPU Cores

Node.js is single-threaded, but your server has multiple cores. `cluster` module forks multiple worker processes:

```javascript
import cluster from 'node:cluster';
import { cpus } from 'node:os';
import { createServer } from 'node:http';

if (cluster.isPrimary) {
  const numCPUs = cpus().length;
  console.log(`Primary ${process.pid} running, forking ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork(); // auto-restart dead workers
  });

} else {
  // Worker processes share the same port
  createServer((req, res) => {
    res.writeHead(200);
    res.end(`Hello from worker ${process.pid}`);
  }).listen(3000);

  console.log(`Worker ${process.pid} started`);
}
```

In production, prefer **PM2** (process manager) which handles clustering, restarts, and monitoring:

```bash
pm2 start app.js -i max   # -i max = number of CPU cores
pm2 logs
pm2 monit
```

---

## Worker Threads — CPU-Heavy Tasks

For CPU-bound work (parsing, crypto, image processing), use Worker Threads — true threads with shared memory:

```javascript
// main.js
import { Worker } from 'node:worker_threads';

function runCPUTask(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./cpu-worker.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

const result = await runCPUTask({ matrix: largeMatrix });

// cpu-worker.js
import { workerData, parentPort } from 'node:worker_threads';

const result = heavyComputation(workerData.matrix);
parentPort.postMessage(result);
```

---

## Middleware Patterns

### Authentication Middleware

```javascript
// JWT authentication
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Rate limiting
import rateLimit from 'express-rate-limit';
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
}));
```

### Request Validation

```javascript
import { z } from 'zod';

const createUserSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email(),
  age:   z.number().int().min(0).max(150).optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }
    req.body = result.data; // replace with parsed + coerced data
    next();
  };
}

app.post('/users', validate(createUserSchema), createUserHandler);
```

---

## Performance Tips

| Tip | Why |
|---|---|
| Use `async/await` over callbacks | Cleaner error handling, no callback hell |
| Never block the event loop | CPU tasks → Worker Threads |
| Use `--max-old-space-size` flag | Tune V8 heap for your workload |
| Enable HTTP keep-alive | Reuse TCP connections |
| Use connection pooling for DB | Don't open a new connection per request |
| Profile with `--prof` | Find hot functions with V8 profiler |
| Use `clinic.js` | Diagnose event loop delays, memory leaks |
| Set `NODE_ENV=production` | Express disables debugging, enables caching |

```javascript
// ❌ Blocking the event loop — everyone waits
app.get('/sync', (req, res) => {
  const result = fs.readFileSync('./large.json'); // sync = blocks!
  res.json(JSON.parse(result));
});

// ✅ Non-blocking
app.get('/async', async (req, res) => {
  const data = await fs.promises.readFile('./large.json', 'utf8');
  res.json(JSON.parse(data));
});
```
