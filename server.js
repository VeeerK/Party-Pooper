/**
 * Party Pooper — realtime server
 * Serves the static app AND a WebSocket relay on the same port.
 * The server is the source of truth: it caches each room's latest state
 * snapshot and relays host-authoritative messages to every other client in
 * the room, so host + players stay synchronized across devices in real time.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.map': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

// In-memory source of truth: pin -> { state, clients:Set<ws> }
const rooms = new Map();
function roomOf(pin) {
  if (!rooms.has(pin)) rooms.set(pin, { state: null, clients: new Set() });
  return rooms.get(pin);
}

wss.on('connection', (ws) => {
  ws.pin = null;
  ws.playerId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
    if (!msg || !msg.type) return;

    // Register this socket against a room
    if (msg.type === 'HELLO') {
      ws.pin = String(msg.room);
      ws.playerId = msg.playerId || null;
      roomOf(ws.pin).clients.add(ws);
      return;
    }

    if (!ws.pin) return;
    const room = roomOf(ws.pin);

    // Cache authoritative state snapshots (server = source of truth record)
    if (msg.type === 'STATE_SYNC' && msg.state) room.state = msg.state;

    // Relay to every OTHER client in the same room
    const out = JSON.stringify(msg);
    for (const client of room.clients) {
      if (client !== ws && client.readyState === ws.OPEN) client.send(out);
    }
  });

  ws.on('close', () => {
    if (!ws.pin) return;
    const room = roomOf(ws.pin);
    room.clients.delete(ws);
    if (ws.playerId) {
      const out = JSON.stringify({ type: 'PLAYER_LEAVE', playerId: ws.playerId });
      for (const client of room.clients) {
        if (client.readyState === ws.OPEN) client.send(out);
      }
    }
    if (room.clients.size === 0) rooms.delete(ws.pin);
  });
});

server.listen(PORT, () => {
  console.log(`Party Pooper listening on http://localhost:${PORT} (WebSocket on same port)`);
});
