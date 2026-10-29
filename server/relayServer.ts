import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 3001;
const server = createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'Peeshtee Relay Server', clients: wss.clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

// Map: roomCode -> Set of WebSockets
const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket, req) => {
  let joinedRoom: string | null = null;

  // URL query: /?room=123456
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const initialRoom = url.searchParams.get('room')?.toLowerCase();

  const joinRoom = (roomCode: string) => {
    if (joinedRoom && rooms.has(joinedRoom)) {
      rooms.get(joinedRoom)!.delete(ws);
      if (rooms.get(joinedRoom)!.size === 0) rooms.delete(joinedRoom);
    }
    joinedRoom = roomCode;
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, new Set());
    }
    rooms.get(roomCode)!.add(ws);
  };

  if (initialRoom) {
    joinRoom(initialRoom);
  }

  ws.on('message', (data: any) => {
    try {
      const msgStr = data.toString();
      const parsed = JSON.parse(msgStr);

      // Support room declaration inside message envelope
      if (parsed.roomCode && (!joinedRoom || joinedRoom !== parsed.roomCode.toLowerCase())) {
        joinRoom(parsed.roomCode.toLowerCase());
      }

      if (joinedRoom && rooms.has(joinedRoom)) {
        const clientSet = rooms.get(joinedRoom)!;
        clientSet.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(msgStr);
          }
        });
      }
    } catch (e) {
      // Malformed json ignore
    }
  });

  ws.on('close', () => {
    if (joinedRoom && rooms.has(joinedRoom)) {
      rooms.get(joinedRoom)!.delete(ws);
      if (rooms.get(joinedRoom)!.size === 0) {
        rooms.delete(joinedRoom);
      }
    }
  });

  ws.on('error', () => {});
});

server.listen(PORT, () => {
  console.log(`[Peeshtee Relay] Server listening on port ${PORT}`);
});
