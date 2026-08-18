# AI Business Operating System — Backend

## Feature checklist (all 10 covered)

| # | Feature | Where it lives |
|---|---|---|
| 1 | Customer management | `src/routes/customers.js` |
| 2 | Inventory tracking | `src/routes/products.js` |
| 3 | Sales analytics | `src/routes/analytics.js` (`/summary`, `/daily`, `/top-products`) |
| 4 | Receipt generation | `src/utils/receipt.js`, used in `src/routes/sales.js` |
| 5 | Role-based authentication | `src/middleware/auth.js` + `src/routes/auth.js` |
| 6 | Real-time notifications | `src/sockets/index.js` (Socket.io) |
| 7 | AI invoice generation | `src/services/aiService.js` → `generateInvoiceSummary()`, called automatically on every sale |
| 8 | AI chatbot assistant | `src/routes/ai.js` → `POST /api/ai/chat` |
| 9 | Predict future sales (AI) | `src/routes/analytics.js` → `GET /api/analytics/predict` |
| 10 | Voice-controlled dashboard | `src/routes/ai.js` → `POST /api/ai/voice-command` (backend half; frontend does speech-to-text) |

## Setup

```bash
npm install
```

1. Copy `.env.example` to `.env` and fill in real values:
   - `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_PORT`, `DB_NAME` — same pattern as your billing project
   - `JWT_SECRET` — any long random string (e.g. generate one with `require('crypto').randomBytes(32).toString('hex')`)
   - `ANTHROPIC_API_KEY` — get this from console.anthropic.com

2. Create the database and run `db/schema.sql` against it (SQL Server Management Studio, Azure Data Studio, or `sqlcmd`).

3. Start the server:
   ```bash
   npm run dev    # with auto-restart on changes
   # or
   npm start
   ```

4. Register your first user — becomes admin automatically since the users table is empty:
   ```
   POST /api/auth/login  →  { "email": "...", "password": "..." }
   ```
   Then include the returned token as `Authorization: Bearer <token>` on every other request.

## Role model

Three roles: `admin`, `manager`, `staff`.
- `admin` / `manager`: can add/edit/delete products, delete customers, register new users
- `staff`: can view everything, create sales, add customers — but not delete or manage inventory pricing

Adjust `requireRole(...)` calls in each route file if you want different boundaries.

## Real-time notifications (frontend integration)

```js
import { io } from "socket.io-client";
const socket = io(); // same origin, works once deployed behind IIS too

socket.on("notification", (notif) => {
  console.log(notif.type, notif.message);
  // show a toast, update a notification bell icon, etc.
});
```

## Voice control (frontend integration)

The backend expects plain transcribed text — the browser does the actual listening:

```js
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.onresult = async (event) => {
  const transcript = event.results[0][0].transcript;
  const res = await fetch("/api/ai/voice-command", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transcript })
  });
  const data = await res.json();
  // data.action tells you what to do: "add_customer", "search_product", "show_analytics", "unknown"
};
recognition.start();
```

## Deployment

Same pattern as your billing system:
1. `npm run build` your React frontend, copy `dist/*` into this project's `public/` folder
2. Copy the whole folder to `C:\inetpub\wwwroot\...`
3. Reuse the same `web.config` (points iisnode at `server.js`)
4. Socket.io works through the same iisnode setup — no extra config needed, since it shares the same HTTP server/port as Express

One thing to double check this time: iisnode's default request timeout is short, and AI API calls (chat, invoice, prediction) can take a few seconds. If you see AI features timing out only in production (not locally), add this inside your `web.config`'s `<iisnode>` section:
```xml
<iisnode requestTimeout="120" />
```

## Extending toward multi-tenant later (Path B)

When you're ready to sell to multiple businesses on one deployment:
1. Add a `tenant_id INT` column to every table (`customers`, `products`, `sales`, `users`)
2. Add `WHERE tenant_id = @tenant_id` to every query in these route files
3. Put `tenant_id` in the JWT payload at login, read it via `req.user.tenant_id` in every route
4. Add a `settings` table (per tenant_id) for branding/feature-flags

Nothing above needs to be rebuilt from scratch — it's additive to what's here.
