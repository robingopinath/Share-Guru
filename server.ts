import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Map of roomId -> Map of clientId -> { ws, role }
  const rooms = new Map<string, Map<string, { ws: WebSocket; role: string }>>();

  wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;
    const clientId = Math.random().toString(36).substring(2, 9);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        const { type, roomId } = msg;

        if (type === 'join-room' && roomId) {
          currentRoomId = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Map());
          }
          const roomMap = rooms.get(roomId)!;
          roomMap.set(clientId, { ws, role: msg.role });

          // Notify sender if receiver joined
          if (msg.role === 'receiver') {
            for (const [, client] of roomMap.entries()) {
              if (client.role === 'sender' && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(
                  JSON.stringify({
                    type: 'peer-joined',
                    roomId,
                    role: 'receiver',
                  })
                );
              }
            }
          }
        } else if (roomId && rooms.has(roomId)) {
          // Relay signaling payload to other peers in room
          const roomMap = rooms.get(roomId)!;
          for (const [id, client] of roomMap.entries()) {
            if (id !== clientId && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({ ...msg, senderId: clientId }));
            }
          }
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomMap = rooms.get(currentRoomId)!;
        roomMap.delete(clientId);

        for (const [, client] of roomMap.entries()) {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(
              JSON.stringify({
                type: 'peer-disconnected',
                roomId: currentRoomId,
              })
            );
          }
        }

        if (roomMap.size === 0) {
          rooms.delete(currentRoomId);
        }
      }
    });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  app.get('/api/room/:roomId', (req, res) => {
    const { roomId } = req.params;
    const roomExists = rooms.has(roomId);
    const roomMap = rooms.get(roomId);
    let senderPresent = false;
    if (roomMap) {
      for (const client of roomMap.values()) {
        if (client.role === 'sender') senderPresent = true;
      }
    }
    res.json({ roomId, exists: roomExists, senderPresent });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Shareguru server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
