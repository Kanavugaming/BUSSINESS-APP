# AI Business Operating System — Frontend

A glassmorphism dashboard for the `ai-business-os-backend` API. Built with React + Vite.

## Feature coverage

| Backend feature | Where it lives here |
|---|---|
| Role-based auth | `Login.jsx` (first-admin bootstrap), `AddUser.jsx` (admin-only), `AuthContext` |
| Customer management | `pages/Customers.jsx` |
| Inventory tracking | `pages/Products.jsx` (low-stock badges) |
| Sales & receipt generation | `pages/Sales.jsx` (cart builder + receipt/AI summary viewer) |
| Sales analytics | `pages/Dashboard.jsx`, `pages/Analytics.jsx` (Recharts) |
| AI sales prediction | Dashboard "AI sales forecast" panel |
| AI invoice summary | Shown inside the receipt modal after a sale |
| AI chatbot | Floating widget, `components/ChatWidget.jsx` |
| Voice-controlled dashboard | Mic button in the topbar, `components/VoiceButton.jsx` (Web Speech API) |
| Real-time notifications | Glass bell in the topbar, `context/SocketContext.jsx` (Socket.io) |

## Design

Mild-colored glassmorphism: frosted glass panels over a soft indigo/teal/fuchsia mesh
background, Space Grotesk for headings, Inter for body text, IBM Plex Mono for money and
SKU values. Stat cards use a thin colored edge-glow rather than solid fills to keep the
palette calm. The notification bell "breathes" with a soft glass pulse when a real-time
alert arrives over Socket.io.

## Setup

```bash
npm install
cp .env.example .env   # leave VITE_API_URL blank for same-origin deployment
npm run dev             # http://localhost:5173, proxies /api and /socket.io to :5000
```

Run the backend (`ai-business-os-backend`) on port 5000 at the same time — the Vite dev
server proxies API and Socket.io calls to it (see `vite.config.js`).

## Deployment (same pattern as the billing project)

```bash
npm run build
```

Then, per the backend README:
1. Copy the contents of `dist/` into the backend project's `public/` folder.
2. Deploy the backend folder to IIS as usual (iisnode + `web.config` pointing at `server.js`).
3. No extra config needed for Socket.io — it shares the same HTTP server/port as Express.
4. If AI features (chat, invoice summary, prediction) time out only in production, add to
   `web.config`'s `<iisnode>` section:
   ```xml
   <iisnode requestTimeout="120" />
   ```

## Notes

- The backend has no endpoint to list existing users, so `Add team member` is a
  create-only form for admins — there's no user list/edit screen because the API doesn't
  support it yet.
- Voice control requires a Chromium-based browser (Web Speech API): Chrome or Edge.
