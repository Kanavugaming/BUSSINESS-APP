# AI Business OS — Backend

Express.js REST API + Socket.io backend for the AI Business Operating System.

## Tech Stack

- **Runtime:** Node.js / Express
- **Database:** PostgreSQL (hosted on [Neon](https://neon.tech))
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **AI:** Anthropic Claude (via `@anthropic-ai/sdk`)
- **Realtime:** Socket.io

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Copy the connection string from **Project Settings → Connection String** — it looks like:
   ```
   ******host/dbname?sslmode=require
   ```

### 3. Run the schema

Apply the database schema to your Neon database using `psql` or the Neon SQL Editor:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Or paste the contents of `db/schema.sql` directly into the Neon SQL Editor.

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=******host/dbname?sslmode=require
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=8h
ANTHROPIC_API_KEY=<your Anthropic API key>
CLAUDE_MODEL=claude-sonnet-4-5
PORT=5000
```

### 5. Start the server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:5000`.

## Deploying to Railway

1. Create a new Railway project and link this repo.
2. Add the following environment variables in Railway → your backend service → **Variables**:
   - `DATABASE_URL` — paste your Neon connection string
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `ANTHROPIC_API_KEY`
   - `CLAUDE_MODEL`
   - `PORT` (Railway sets this automatically, but you can override)
3. Deploy. Railway will run `npm start`.

> **No separate database service needed on Railway** — the app connects directly to Neon over the internet.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register first admin / add user (admin only after first) |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| DELETE | `/api/customers/:id` | Soft-delete customer |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Soft-delete product |
| GET | `/api/sales` | List sales |
| GET | `/api/sales/:id` | Sale detail + receipt |
| POST | `/api/sales` | Create sale (transactional) |
| GET | `/api/analytics/summary` | Dashboard numbers |
| GET | `/api/analytics/daily` | Daily revenue chart data |
| GET | `/api/analytics/top-products` | Best-selling products |
| GET | `/api/analytics/predict` | AI sales forecast |
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/:id/read` | Mark notification read |
| POST | `/api/ai/chat` | Chat with AI assistant |
| POST | `/api/ai/voice-command` | Voice command interpreter |
