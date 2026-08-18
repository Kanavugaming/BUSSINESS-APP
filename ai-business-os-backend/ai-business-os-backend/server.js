const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./src/middleware/errorHandler');
const { initSockets } = require('./src/sockets');

const authRoutes = require('./src/routes/auth');
const customerRoutes = require('./src/routes/customers');
const productRoutes = require('./src/routes/products');
const salesRoutes = require('./src/routes/sales');
const analyticsRoutes = require('./src/routes/analytics');
const aiRoutes = require('./src/routes/ai');
const notificationRoutes = require('./src/routes/notifications');

const app = express();
const httpServer = http.createServer(app); // needed so Socket.io can share the same server/port

app.use(cors());
app.use(express.json());

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

// --- Socket.io setup ---
// Attached to the SAME http server so it works through the same IIS/iisnode
// setup as the rest of the API — no separate port needed.
const io = initSockets(httpServer);
app.set('io', io); 
app.use(cors({
  origin: 'https://bussiness-2zjzu8giu-kanavugamings-projects.vercel.app',
  credentials: true
}));// lets any route access it via req.app.get('io')

// --- Serve the built React frontend ---
// Build the frontend (`npm run build`) and copy dist/* contents into ./public
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Error handler (must be last) ---
app.use(errorHandler);


const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 AI Business OS backend running on http://localhost:${PORT}`);
});
