// MeshBeat PeerJS Signaling Server
const { PeerServer } = require('peer');

const PORT = process.env.PORT || 9000;

const server = PeerServer({
    port: PORT,
    path: '/meshbeat',
    allow_discovery: true,
    // Enable proxying for Render
    proxied: true,
});

server.on('connection', (client) => {
    console.log(`[PeerServer] Client connected: ${client.getId()}`);
});

server.on('disconnect', (client) => {
    console.log(`[PeerServer] Client disconnected: ${client.getId()}`);
});

console.log(`[PeerServer] MeshBeat signaling server running on port ${PORT}`);
