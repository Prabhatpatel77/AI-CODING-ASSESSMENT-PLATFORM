# Isolated Code Execution Service Integration Guide

## Overview

The AI Coding Assessment Platform evaluates student coding submissions strictly inside isolated, ephemeral execution sandboxes. Untrusted student code is **never executed directly on the application web server** using `eval()`, `new Function()`, `child_process`, or unsandboxed local processes.

The execution subsystem uses a dedicated **Service Adapter Architecture** supporting:
1. **Judge0 CE** (Approved Primary Provider - Docker / gVisor sandbox)
2. **EngineerMan Piston** (Secondary Provider)
3. **Unconfigured Adapter** (Fail-safe security fallback)

---

## Security Invariants

1. **Zero Host Execution**: The web server process never spawns compilers or executes student code directly on the host machine.
2. **Hidden Test Case Confidentiality**: Hidden evaluation test cases (`isHidden: true`) are maintained strictly on the backend and evaluated inside the sandbox. Test inputs, expected outputs, and raw debug payloads for hidden test fixtures are permanently redacted before any response is sent to the client browser.
3. **No Fabricated Success**: If the execution provider is unconfigured, unreachable, or fails, the platform returns an explicit diagnostic status (`UNCONFIGURED` or `INTERNAL_ERROR`). It never fabricates simulated execution metrics or claims code passed when it did not run.
4. **Credential Isolation**: Remote judge API keys (`JUDGE0_API_KEY`, RapidAPI credentials, Piston tokens) reside exclusively in server-side environment variables and are never forwarded to React or included in client API responses.

---

## Approved Provider: Judge0 CE

Judge0 is the industry standard for isolated code execution, providing:
- Support for Node.js 20+ (Language ID `93`), Python 3.11+ (Language ID `92`), C++, Java, Rust, and Go.
- Hard resource enforcement via Linux cgroups and isolated container namespaces (CPU limit, wall clock limit, memory limit, stack limit, file size limits).
- Ephemeral execution: each submission executes in a fresh, isolated container that is immediately discarded upon termination.

### Provider Authentication & Setup

Configure the following environment variables in `.env`:

#### Option A: Self-Hosted Judge0 CE (Recommended for Universities & Production)
```bash
EXECUTION_PROVIDER="judge0"
JUDGE0_API_URL="http://localhost:2358"
# Optional auth token if Judge0 is configured with AUTH_TOKEN
JUDGE0_API_KEY="your-custom-auth-token"
```

To run Judge0 CE locally via Docker:
```bash
# Clone and launch Judge0 with Redis and Postgres
docker run -d -p 2358:2358 --privileged judge0/judge0:latest
```

#### Option B: RapidAPI Judge0 Cloud
```bash
EXECUTION_PROVIDER="judge0"
JUDGE0_API_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_API_KEY="your-rapidapi-key"
JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"
```

---

## Secondary Provider: Piston API

EngineerMan Piston is an isolated multi-language code runner.

```bash
EXECUTION_PROVIDER="piston"
PISTON_API_URL="http://localhost:2000/api/v2"
# Optional API key for authenticated private instances
PISTON_API_KEY=""
```

> **Note regarding Public Piston API**: As of February 15, 2026, the public Piston endpoint (`emkc.org`) enforces an IP whitelist. Production installations should use a self-hosted Piston container or Judge0 CE.

---

## Provider Capabilities & Limitations

| Feature / Limit | Judge0 CE | Piston API | Notes |
| :--- | :--- | :--- | :--- |
| **Sandboxing Engine** | Docker + Isolate / cgroups | Docker / nsjail | Isolated kernel namespaces |
| **Outbound Network Access** | Disabled (`--net=none`) | Disabled | Sandboxes cannot access external APIs or the internet |
| **File System Persistence** | Ephemeral | Ephemeral | Files written to disk are destroyed upon process exit |
| **Default CPU Time Limit** | 2.0 seconds | 2.0 seconds | Clamped between 0.5s and 10.0s |
| **Default Wall Time Limit** | 5.0 seconds | 5.0 seconds | Clamped between 1.0s and 15.0s |
| **Default Memory Limit** | 128 MB | 128 MB | Clamped between 16 MB and 512 MB |
| **Maximum Code Size** | 64 KB (65,536 bytes) | 64 KB | Validated server-side prior to dispatch |
| **Maximum Output Buffer** | 64 KB | 64 KB | Truncated cleanly to prevent memory exhaustion |
| **Transport Encoding** | Base64 (`base64_encoded=true`) | UTF-8 JSON | Base64 protects strings with special characters / quotes |
| **Asynchronous Polling** | Supported (`GET /submissions/:token`) | Direct sync | Allows long-running executions without blocking |

---

## Polling & Execution Lifecycle

When code is submitted to Judge0:
1. **Validation**: Server validates code size (<64KB), language mapping, and resource bounds.
2. **Submission**: Code and inputs are Base64-encoded and sent to `POST /submissions?base64_encoded=true&wait=false`.
3. **Queue / Token**: Judge0 assigns a submission token.
4. **Controlled Polling Loop**: The server polls `GET /submissions/:token?base64_encoded=true` with progressive backoff (300ms initial interval, up to 1000ms max) until status ID >= 3.
5. **Output Normalization**: Standardizes stdout, stderr, exit codes, CPU time, and memory usage into the standardized schema.
6. **Hidden Test Redaction**: If evaluating problem test cases, hidden inputs and expected outputs are completely removed before returning to the browser.
