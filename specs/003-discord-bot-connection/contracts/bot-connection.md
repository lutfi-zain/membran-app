# API Contracts: Discord Bot Connection

**Feature**: 003-discord-bot-connection
**Date**: 2025-12-30
**Version**: 1.0.0

## Overview

This document defines the API contracts for Discord bot invitation and server connection functionality. All endpoints follow REST conventions and return JSON responses.

---

## Base URL

```
Development: http://localhost:8787
Production:  https://api.membran.app
```

## Authentication

All endpoints require session authentication via cookie:

```http
Cookie: session=<session_token>
```

---

## Endpoints

### 1. Initiate Bot OAuth Flow

Initiates the Discord OAuth2 authorization flow for bot invitation.

```http
POST /api/bot/invite
```

**Request Body**

```typescript
{
  // Empty body - uses current user's session
}
```

**Response** `200 OK`

```typescript
{
  "authorizationUrl": "https://discord.com/oauth2/authorize?client_id=...&response_type=code&redirect_uri=...&scope=bot&state=...&permissions=4104",
  "state": "random_state_value_for_csrf_protection"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 409 | `ALREADY_CONNECTED` | User already has a Discord server connected |

```typescript
// 409 Conflict
{
  "error": "ALREADY_CONNECTED",
  "message": "You already have a Discord server connected. Each account manages one server.",
  "server": {
    "id": "server_uuid",
    "name": "My Discord Server",
    "botStatus": "Connected"
  }
}
```

---

### 2. OAuth Callback Endpoint

Discord redirects here after user authorization. This endpoint is called by Discord, not directly by the client.

```http
GET /api/bot/callback
```

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from Discord |
| `state` | string | Yes | CSRF protection state |
| `error` | string | No | Error code if user denied |
| `error_description` | string | No | Human-readable error description |

**Response** `302 Found` (Redirect)

Success: Redirects based on user state:
- New user (onboarding incomplete): `/onboarding/bot?connected=success`
- Existing user: `/settings?connected=bot`
```
Location: [onboarding URL or settings URL based on user state]
```

Error: Redirects back with error flag (same for both user states):
```
Location: /onboarding/bot?error=access_denied
```

**Redirect Logic**:
1. Check user's onboarding status from session
2. If onboarding incomplete → redirect to onboarding
3. If onboarding complete → redirect to settings

**Side Effects**
- Creates `discord_servers` record on successful connection
- Stores Discord server info, tokens
- Updates user's onboarding status

---

### 3. Get Bot Connection Status

Retrieve current bot connection status for the authenticated user.

```http
GET /api/bot/status
```

**Response** `200 OK`

```typescript
{
  "connected": true,
  "server": {
    "id": "uuid",
    "discordId": "123456789012345678",
    "name": "My Awesome Community",
    "icon": "https://cdn.discordapp.com/icons/123456789012345678/abc123.png",
    "memberCount": 847,
    "botStatus": "Connected",
    "botAddedAt": "2025-12-30T10:30:00Z",
    "permissions": ["MANAGE_ROLES", "VIEW_CHANNEL"],
    "recentlyConnected": true, // true if added within 24h
    "permissionsValid": true,
    "permissionsWarnings": [] // or ["Missing: SEND_MESSAGES"]
  }
}
```

**Response** `200 OK` (Not Connected)

```typescript
{
  "connected": false
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `NOT_FOUND` | No Discord server connected |

---

### 4. Validate Bot Permissions

Check if the bot has required permissions in the connected Discord server.

```http
POST /api/bot/validate-permissions
```

**Request Body**

```typescript
{
  // Empty body - validates current user's server
}
```

**Response** `200 OK`

```typescript
{
  "valid": true,
  "permissions": {
    "current": "4104",
    "required": "4104",
    "missing": [],
    "hasAllRequired": true
  }
}
```

**Response** `200 OK` (Invalid Permissions)

```typescript
{
  "valid": false,
  "permissions": {
    "current": "1024",
    "required": "4104",
    "missing": ["MANAGE_ROLES"],
    "hasAllRequired": false
  },
  "warnings": [
    "Bot is missing the MANAGE_ROLES permission. Role assignment will not work."
  ]
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `NOT_FOUND` | No Discord server connected |

---

### 5. Reconnect Bot

Initiate a new OAuth flow to reconnect the bot to the same or different Discord server.

```http
POST /api/bot/reconnect
```

**Request Body**

```typescript
{
  // Empty body
}
```

**Response** `200 OK`

```typescript
{
  "authorizationUrl": "https://discord.com/oauth2/authorize?...",
  "state": "new_random_state_value"
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 404 | `NOT_FOUND` | No existing Discord server to reconnect |
| 400 | `INVALID_STATE` | Bot is currently Connected (must be Disconnected first) |

---

### 6. Disconnect Bot

Manually disconnect the bot from the Discord server (admin action).

```http
DELETE /api/bot/disconnect
```

**Request Body**

```typescript
{
  "confirm": true // Require explicit confirmation
}
```

**Response** `200 OK`

```typescript
{
  "disconnected": true,
  "message": "Bot has been disconnected from your Discord server."
}
```

**Error Responses**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | No valid session |
| 400 | `INVALID_REQUEST` | `confirm` not set to `true` |
| 404 | `NOT_FOUND` | No Discord server connected |

---

### 7. Sync Bot Status (Internal/Cron)

Endpoint called by cron job to sync bot presence and status from Discord API.

```http
POST /api/bot/sync
```

**Authentication**: Bearer token (internal service)

```http
Authorization: Bearer <CRON_SECRET>
```

**Request Body**

```typescript
{
  // Empty - syncs all connected servers
}
```

**Response** `200 OK`

```typescript
{
  "synced": 95,
  "updated": [
    {
      "serverId": "uuid",
      "previousStatus": "Connected",
      "newStatus": "Disconnected",
      "reason": "bot_not_in_guild_list"
    }
  ],
  "errors": [
    {
      "serverId": "uuid",
      "error": "rate_limit_exceeded",
      "retryAfter": 5000
    }
  ]
}
```

---

## Data Types

### BotStatus Enum

```typescript
type BotStatus = "Connected" | "Disconnected" | "Pending";
```

### Permission Flag Mapping

| Flag | Value | Description |
|------|-------|-------------|
| MANAGE_ROLES | 0x8 (8) | Manage roles |
| VIEW_CHANNEL | 0x400 (1024) | View channels |
| SEND_MESSAGES | 0x800 (2048) | Send messages |
| EMBED_LINKS | 0x1000 (4096) | Embed links |
| ATTACH_FILES | 0x2000 (8192) | Attach files |
| ADD_REACTIONS | 0x4000 (16384) | Add reactions |

### Server Response Object

```typescript
interface DiscordServer {
  id: string;                    // UUID
  discordId: string;             // Discord snowflake
  name: string;
  icon: string | null;           // CDN URL
  memberCount: number;
  botStatus: BotStatus;
  botAddedAt: string;            // ISO 8601 timestamp
  permissions: string[];         // Permission names
  recentlyConnected: boolean;    // Added within 24h
  permissionsValid: boolean;
  permissionsWarnings: string[];
}
```

---

## Webhook Events (Future)

### Bot Added to Server

```typescript
{
  "event": "bot.added",
  "timestamp": "2025-12-30T10:30:00Z",
  "data": {
    "serverId": "uuid",
    "discordId": "123456789012345678",
    "name": "New Server"
  }
}
```

### Bot Removed from Server

```typescript
{
  "event": "bot.removed",
  "timestamp": "2025-12-30T11:00:00Z",
  "data": {
    "serverId": "uuid",
    "discordId": "123456789012345678"
  }
}
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/bot/invite` | 5 requests | 1 hour |
| `GET /api/bot/status` | 60 requests | 1 minute |
| `POST /api/bot/validate-permissions` | 10 requests | 1 minute |
| `POST /api/bot/reconnect` | 3 requests | 1 hour |
| `DELETE /api/bot/disconnect` | 3 requests | 1 hour |
| `POST /api/bot/sync` | 1 request | 5 minutes (cron) |

---

## Error Response Format

All error responses follow this structure:

```typescript
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error-specific fields
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing session |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `ALREADY_CONNECTED` | 409 | Server already connected |
| `INVALID_STATE` | 400 | Invalid state for operation |
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `OAUTH_ERROR` | 400 | OAuth flow error |
| `DISCORD_API_ERROR` | 502 | Discord API error |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## OpenAPI Specification (YAML)

```yaml
openapi: 3.0.3
info:
  title: membran.app Bot Connection API
  version: 1.0.0
  description: Discord bot invitation and server connection endpoints

servers:
  - url: http://localhost:8787
    description: Development
  - url: https://api.membran.app
    description: Production

paths:
  /api/bot/invite:
    post:
      summary: Initiate bot OAuth flow
      tags: [Bot Connection]
      security:
        - CookieAuth: []
      responses:
        '200':
          description: OAuth flow initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  authorizationUrl:
                    type: string
                  state:
                    type: string
        '401':
          $ref: '#/components/responses/Unauthorized'
        '409':
          $ref: '#/components/responses/AlreadyConnected'

  /api/bot/callback:
    get:
      summary: OAuth callback (Discord redirects here)
      tags: [Bot Connection]
      parameters:
        - name: code
          in: query
          schema:
            type: string
        - name: state
          in: query
          schema:
            type: string
      responses:
        '302':
          description: Redirect to settings/onboarding
        '400':
          $ref: '#/components/responses/BadRequest'

  /api/bot/status:
    get:
      summary: Get bot connection status
      tags: [Bot Connection]
      security:
        - CookieAuth: []
      responses:
        '200':
          description: Connection status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/BotStatusResponse'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /api/bot/reconnect:
    post:
      summary: Reconnect bot
      tags: [Bot Connection]
      security:
        - CookieAuth: []
      responses:
        '200':
          description: Reconnect flow initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  authorizationUrl:
                    type: string
                  state:
                    type: string

components:
  securitySchemes:
    CookieAuth:
      type: apiKey
      in: cookie
      name: session

  schemas:
    BotStatusResponse:
      type: object
      properties:
        connected:
          type: boolean
        server:
          $ref: '#/components/schemas/DiscordServer'

    DiscordServer:
      type: object
      properties:
        id:
          type: string
        discordId:
          type: string
        name:
          type: string
        icon:
          type: string
          nullable: true
        memberCount:
          type: integer
        botStatus:
          type: string
          enum: [Connected, Disconnected, Pending]
        botAddedAt:
          type: string
          format: date-time
        permissions:
          type: array
          items:
            type: string
        recentlyConnected:
          type: boolean
        permissionsValid:
          type: boolean
        permissionsWarnings:
          type: array
          items:
            type: string

  responses:
    Unauthorized:
      description: Unauthorized
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: UNAUTHORIZED
              message:
                type: string
                example: Invalid or missing session

    AlreadyConnected:
      description: Server already connected
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
                example: ALREADY_CONNECTED
              message:
                type: string
              server:
                $ref: '#/components/schemas/DiscordServer'

    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              message:
                type: string
```

---

## Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/bot/invite` | POST | Cookie | Start OAuth flow |
| `/api/bot/callback` | GET | None | OAuth callback (Discord) |
| `/api/bot/status` | GET | Cookie | Get connection status |
| `/api/bot/validate-permissions` | POST | Cookie | Check permissions |
| `/api/bot/reconnect` | POST | Cookie | Reconnect flow |
| `/api/bot/disconnect` | DELETE | Cookie | Manual disconnect |
| `/api/bot/sync` | POST | Bearer | Cron sync status |

**Status**: Ready for implementation. Backend routes can be created from this specification.
