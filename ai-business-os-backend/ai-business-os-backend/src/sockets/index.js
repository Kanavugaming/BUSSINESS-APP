const { Server } = require('socket.io');
const { sql, getPool } = require('../config/db');

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
    const pool = await getPool();
    const result = await pool.request()
      .input('type', sql.NVarChar, type)
      .input('message', sql.NVarChar, message)
      .query(`INSERT INTO notifications (type, message)
              OUTPUT INSERTED.*
              VALUES (@type, @message)`);

    const notification = result.recordset[0];
    if (io) io.emit('notification', notification);
    return notification;
  } catch (err) {
    console.error('Failed to push notification:', err.message);
  }
}

module.exports = { initSockets, pushNotification };
