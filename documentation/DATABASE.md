# Database — Customer Support Agent

The schema for the support agent. Defined in [`prisma/schema.prisma`](../prisma/schema.prisma),
Postgres via Prisma.

## Design principles

1. **The input source is just data.** A message from the web chat, an email, or a
   WhatsApp number all arrive in the same shape and resolve to the same models. The
   source is recorded in a `channel` field — it never changes the schema or the code path.
2. **The database is the log; only the API writes to it.** The chat front and the `/dev`
   dashboard both *read* from these tables. Every *write* — whether the bot answering a
   user or an operator replying by hand — goes through the API.
3. **No login.** A user is a `Client` row identified by a cookie (see *Identity* below).

Three models cover the whole feature: **Client → Conversation → Message**.

## Enums

| Enum | Values | Used by |
|------|--------|---------|
| `Channel` | `WEB`, `EMAIL`, `WHATSAPP`, `SLACK`, `API`, `OTHER` | the input source of a client / conversation / message |
| `ConversationStatus` | `OPEN`, `ESCALATED`, `RESOLVED`, `ARCHIVED` | lifecycle state, used by the dashboard filters |
| `MessageRole` | `USER`, `ASSISTANT`, `OPERATOR`, `SYSTEM` | who wrote the message |
| `IntentCategory` | `TECHNICAL`, `BILLING`, `GENERAL`, `UNKNOWN` | BERTopic classification of a user message |

Enums are native Postgres types: invalid values are rejected by the database and the
TypeScript client gets autocomplete. The trade-off is that changing a value needs a
migration — relevant only for `IntentCategory`, which mirrors the classifier's labels.

## Models

### Client

The end-user, identified independently of how they reach us.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` (cuid) | primary key |
| `externalId` | `String?` | the source's identifier — for `WEB`, the **cookie token**; for email, the address; etc. |
| `email` | `String?` | optional, if known |
| `name` | `String?` | optional display name |
| `channel` | `Channel` | channel the client was first seen on (default `WEB`) |
| `metadata` | `Json` | free-form extra data from the source |
| `createdAt` / `updatedAt` | `DateTime` | |

- **`@@unique([channel, externalId])`** — guarantees one client per source identifier
  (one cookie = one client).
- **`@@index([email])`** — lookup by email.

### Conversation

A single thread between a client and the agent. A client can have many.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` (cuid) | primary key |
| `clientId` | `String` | → `Client` (cascade delete) |
| `channel` | `Channel` | source of the thread |
| `status` | `ConversationStatus` | `OPEN` by default; drives dashboard filtering |
| `category` | `IntentCategory?` | latest classification, denormalized here so the dashboard can filter without scanning messages |
| `title` | `String?` | short auto-generated summary shown in the nav bar |
| `takenOver` | `Boolean` | `true` = bot is paused, a human is handling this thread |
| `resolvedAt` | `DateTime?` | set when status becomes `RESOLVED` |
| `lastMessageAt` | `DateTime` | for ordering the conversation list |
| `metadata` | `Json` | free-form |
| `createdAt` / `updatedAt` | `DateTime` | |

- Indexes: `clientId`, `status`, `category`, `lastMessageAt`, `createdAt` — each backs a
  dashboard filter or sort.
- **`takenOver`** is the single switch that stops the bot from auto-replying so an
  operator can take over.

### Message

One message in a conversation, from any author.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` (cuid) | primary key |
| `conversationId` | `String` | → `Conversation` (cascade delete) |
| `role` | `MessageRole` | `USER`, `ASSISTANT`, `OPERATOR`, or `SYSTEM` |
| `content` | `String` (Text) | the message body |
| `channel` | `Channel` | source of the message |
| `category` | `IntentCategory?` | set on `USER` messages by the BERTopic classifier |
| `categoryConfidence` | `Float?` | classifier confidence for that category |
| `modelName` | `String?` | set on `ASSISTANT` messages, e.g. `gemini-2.5-flash` |
| `tokensIn` / `tokensOut` | `Int?` | generation usage |
| `latencyMs` | `Int?` | generation latency |
| `authorName` | `String?` | display name on `OPERATOR` messages (no operator table needed) |
| `externalId` | `String?` | the source's message id |
| `metadata` | `Json` | free-form (e.g. guard outcomes) |
| `createdAt` | `DateTime` | |

- **`@@unique([conversationId, externalId])`** — idempotent ingestion: a re-delivered
  source event with the same id won't create a duplicate message.
- **`@@index([conversationId, createdAt])`** — loads a thread's history in order (the
  context passed to Gemini).
- **`@@index([category])`** — analytics / filtering by intent.

## Relationships

```
Client (1) ──< Conversation (1) ──< Message
```

Deleting a client cascades to its conversations; deleting a conversation cascades to its
messages.

## Identity (no login)

The web frame has no auth. Identity is a cookie:

1. First visit → server mints a **random token**, sets it as an `httpOnly` long-lived
   cookie, and creates a `Client` with `channel = WEB`, `externalId = <token>`.
2. Later requests → look the client up via the `[channel, externalId]` unique key.

The cookie token is a secret, so it both identifies and lightly authenticates the client.
Clearing cookies starts a fresh client with new history — acceptable without login.

## Not part of this feature

`Post`, `Task`, and `DiagramConfig` in the same schema file belong to the **nether-grasp**
tooling and are unrelated to the support agent. They are kept as-is.
