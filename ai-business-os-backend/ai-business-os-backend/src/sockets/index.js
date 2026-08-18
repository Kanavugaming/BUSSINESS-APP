const { Server } = require('socket.io');
const { query } = require('../config/db');

// Sets up Socket.io on top of the existing HTTP server.
// Called once from server.js.
function initSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' } // tighten this to your real frontend origin in production
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
}

// Call this from anywhere (routes, etc.) to broadcast + persist a notification.
// Every connected dashboard receives it instantly via the 'notification' event.
async function pushNotification(io, { type, message }) {
  try {
    const result = await query(
      `INSERT INTO notifications (type, message) VALUES ($1, $2) RETURNING *`,
      [type, message]
    );

    const notification = result.rows[0];
    if (io) io.emit('notification', notification);
    return notification;
  } catch (err) {
    console.error('Failed to push notification:', err.message);
  }
}

module.exports = { initSockets, pushNotification };
