# LuminaryTrade API Versioning Guide

## Overview

The LuminaryTrade API uses **URL-based versioning**. Every versioned endpoint
is prefixed with `/vN/` where `N` is the version number.

```
https://api.luminarytrade.com/v1/transactions
https://api.luminarytrade.com/v2/transactions
```

Unversioned paths (e.g. `/health`, `/metrics`) are not subject to version
lifecycle management.

---

## Current Versions

| Version | Status     | Released   | Sunset     | Notes                        |
|---------|------------|------------|------------|------------------------------|
| v0      | 🚫 SUNSET  | 2023-01-01 | 2024-07-01 | Permanently removed          |
| v1      | ✅ STABLE  | 2024-01-01 | —          | Default. Recommended for all new integrations |
| v2      | 🧪 BETA    | 2025-01-01 | —          | Early access. Breaking changes may occur |

### Default version

Requests without a version prefix are routed to **v1**.

---

## Lifecycle

```
BETA → STABLE → DEPRECATED → SUNSET
```

| Phase        | What happens                                                                 |
|--------------|------------------------------------------------------------------------------|
| **BETA**     | Available but unstable. Response includes `X-Api-Version-Status: beta`.      |
| **STABLE**   | Production-ready. No extra headers.                                          |
| **DEPRECATED** | Returns warning headers (see below). Works normally for 3+ months.        |
| **SUNSET**   | Returns `410 Gone`. No response body. Migration required.                    |

### Minimum grace period

There is a mandatory **3-month** minimum between the deprecation announcement
and the sunset date. This gives consumers time to migrate.

---

## Response Headers

### Deprecated version headers

Every response from a deprecated version includes:

```
Sunset: Mon, 01 Jul 2024 00:00:00 GMT
Deprecation: Mon, 01 Jan 2024 00:00:00 GMT
X-Deprecated: true
X-Sunset-Date: 2024-07-01
X-Api-Version-Status: deprecated
X-Deprecation-Info: https://docs.luminarytrade.com/api/versioning#migration
Link: <https://docs.luminarytrade.com/api/versioning>; rel="deprecation"
```

`Sunset` and `Deprecation` follow [RFC 8594](https://datatracker.ietf.org/doc/html/rfc8594).

### Sunset response (410 Gone)

```json
{
  "success": false,
  "error": {
    "code": "API_VERSION_SUNSET",
    "message": "API version 0 has been permanently removed as of 2024-07-01.",
    "sunsetDate": "2024-07-01",
    "migrationGuide": "https://docs.luminarytrade.com/api/versioning",
    "currentStableVersion": "1",
    "timestamp": "2025-01-15T10:00:00.000Z",
    "path": "/v0/transactions"
  }
}
```

### Beta version headers

```
X-Api-Version-Status: beta
X-Beta-Warning: This API version is in beta. Breaking changes may occur before stable release.
```

---

## v0 → v1 Migration

### Error response shape

**v0:**
```json
{ "error": "Invalid credentials", "code": 401 }
```

**v1:**
```json
{
  "success": false,
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "timestamp": "2025-01-15T10:00:00.000Z",
    "path": "/v1/auth/login"
  }
}
```

**Action:** Update error handling to read `error.code` and `error.message`
instead of the top-level `error` string.

### Pagination

**v0** used offset-based pagination:
```
GET /v0/transactions?page=2&pageSize=20
```

**v1** uses cursor-based pagination:
```
GET /v1/transactions?cursor=eyJpZCI6MTIzfQ&limit=20
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6MTQzfQ",
    "hasMore": true,
    "limit": 20
  }
}
```

**Action:** Replace `page`/`pageSize` params with `cursor`/`limit`.
Store the `nextCursor` from each response and pass it as `cursor` in the
next request.

### Authentication

**v0** used API keys in the query string:
```
GET /v0/transactions?api_key=sk_live_...
```

**v1** uses Bearer tokens in the Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**Action:** Move authentication to the `Authorization` header. Never send
credentials in query strings.

---

## v1 → v2 Migration

v2 is currently in **BETA**. The following changes are planned and may still
evolve before v2 reaches STABLE.

### Renamed fields

| v1 field        | v2 field    | Affected endpoints                    |
|-----------------|-------------|---------------------------------------|
| `walletAddress` | `address`   | All user and transaction endpoints    |
| `createdAt`     | `created`   | All resource endpoints                |
| `updatedAt`     | `updated`   | All resource endpoints                |
| `userId`        | `user.id`   | Transaction and audit endpoints       |

**v1 response:**
```json
{
  "walletAddress": "GABC...XYZ",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "userId": "usr_123"
}
```

**v2 response:**
```json
{
  "address": "GABC...XYZ",
  "created": "2025-01-15T10:00:00.000Z",
  "user": { "id": "usr_123" }
}
```

### Removed fields

The following fields are returned in v1 but **omitted** in v2:

| Field           | v1    | v2     | Replacement                      |
|-----------------|-------|--------|----------------------------------|
| `legacyId`      | ✅    | ❌     | Use `id` (UUID)                  |
| `rawPayload`    | ✅    | ❌     | Use `data` (parsed object)       |
| `statusCode`    | ✅    | ❌     | Use `status` (string enum)       |

### New fields in v2

These fields are **optional** and only appear in v2 responses:

- `meta.requestId` — traces the request through the system
- `meta.processingTimeMs` — server-side processing time
- `links.self` / `links.related` — HAL-style resource links

### Streaming responses

v2 supports Server-Sent Events for long-running operations:

```
GET /v2/transactions/stream
Accept: text/event-stream
```

v1 uses polling:
```
POST /v1/transactions
GET  /v1/transactions/:id/status
```

### GraphQL

v2 exposes a GraphQL endpoint alongside REST:

```
POST /v2/graphql
Content-Type: application/json

{ "query": "{ transactions { id address amount } }" }
```

---

## Targeting a version in client SDKs

### TypeScript / JavaScript

```typescript
import { LuminaryClient } from '@luminarytrade/sdk';

// Target v1 (stable, recommended)
const client = new LuminaryClient({
  baseUrl: 'https://api.luminarytrade.com',
  version: 'v1',
  apiKey: process.env.LUMINARY_API_KEY,
});

// Target v2 (beta)
const betaClient = new LuminaryClient({
  baseUrl: 'https://api.luminarytrade.com',
  version: 'v2',
  apiKey: process.env.LUMINARY_API_KEY,
});

// Explicit per-request version override
const tx = await client.transactions.get('txn_123', { version: 'v2' });
```

### cURL

```bash
# v1
curl -H "Authorization: Bearer $TOKEN" \
  https://api.luminarytrade.com/v1/transactions

# v2 (beta)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.luminarytrade.com/v2/transactions

# Check deprecation headers
curl -I -H "Authorization: Bearer $TOKEN" \
  https://api.luminarytrade.com/v0/transactions
# → HTTP/1.1 410 Gone
```

### Python

```python
import requests

BASE = "https://api.luminarytrade.com"
HEADERS = {"Authorization": f"Bearer {api_key}"}

# v1
r = requests.get(f"{BASE}/v1/transactions", headers=HEADERS)

# v2
r = requests.get(f"{BASE}/v2/transactions", headers=HEADERS)

# Check for deprecation warnings
if r.headers.get("X-Deprecated"):
    sunset = r.headers.get("X-Sunset-Date")
    print(f"Warning: this API version is deprecated and will be removed on {sunset}")
```

---

## Annotating controllers (backend developers)

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiVersion } from '../versioning/api-version.decorator';

// All routes in this controller are under /v1/transactions
@ApiVersion('1')
@Controller('transactions')
export class TransactionV1Controller {
  @Get()
  findAll() {
    // Returns v1 shape: walletAddress, createdAt
  }
}

// All routes in this controller are under /v2/transactions
@ApiVersion('2')
@Controller('transactions')
export class TransactionV2Controller {
  @Get()
  findAll() {
    // Returns v2 shape: address, created
  }
}
```

---

## Adding a new version

1. Add an entry to `src/versioning/version.constants.ts`
2. Create a new controller file `src/*/controllers/*.v3.controller.ts`
3. Annotate it with `@ApiVersion('3')`
4. Register the controller in the relevant feature module
5. Document breaking changes in this file under a new migration section

## Deprecating a version

1. Change `status` to `'DEPRECATED'` in `version.constants.ts`
2. Set `deprecatedAt` to today's date
3. Set `sunsetAt` to at least 3 months from today
4. Publish a deprecation announcement via `POST /v1/announcements`
5. Update this file with the migration guide

## Removing a version (after sunset)

1. Change `status` to `'SUNSET'` in `version.constants.ts`
2. The middleware will return 410 Gone automatically
3. Remove the sunset controller code in a follow-up PR (optional — 410 runs first)