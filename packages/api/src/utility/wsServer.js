// Simple WebSocket server for real-time events (replaces SSE)
const WebSocket = require('ws');
const stableStringify = require('json-stable-stringify');

let wss;
const wsClients = new Set();


function startWebSocketServer(server) {
  if (wss) return wss;
  wss = new WebSocket.Server({ server });
  wss.on('connection', ws => {
    wsClients.add(ws);
    ws.on('close', () => wsClients.delete(ws));
  });
  // Send a ping event every 30 seconds to all clients
  setInterval(() => {
    emitWsEvent('ping', null);
  }, 30000);
  return wss;
}

function emitWsEvent(event, data) {
  const message = JSON.stringify({ event, data });
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

module.exports = {
  startWebSocketServer,
  emitWsEvent,
  wsClients,
};
