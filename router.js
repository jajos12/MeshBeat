#!/usr/bin/env node
/**
 * MeshBeat Proxy Server
 * Routes traffic between Next.js app and PeerJS signaling server
 */

const http = require('http');
const httpProxy = require('http-proxy');

const PORT = process.env.PORT || 3000;
const NEXTJS_PORT = 3001;
const PEERJS_PORT = 9000;

// Create proxy instances
const proxy = httpProxy.createProxyServer({});

// Error handling
proxy.on('error', (err, req, res) => {
    console.error('[Proxy] Error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
});

// Create the main server
const server = http.createServer((req, res) => {
    // Route /meshbeat to PeerJS server
    if (req.url.startsWith('/meshbeat')) {
        console.log(`[Proxy] → PeerJS: ${req.method} ${req.url}`);
        proxy.web(req, res, {
            target: `http://localhost:${PEERJS_PORT}`,
            ws: false,
        });
    } else {
        // Route everything else to Next.js
        proxy.web(req, res, {
            target: `http://localhost:${NEXTJS_PORT}`,
            ws: false,
        });
    }
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/meshbeat')) {
        console.log(`[Proxy] WebSocket → PeerJS: ${req.url}`);
        proxy.ws(req, socket, head, {
            target: `ws://localhost:${PEERJS_PORT}`,
        });
    } else {
        console.log(`[Proxy] WebSocket → Next.js: ${req.url}`);
        proxy.ws(req, socket, head, {
            target: `ws://localhost:${NEXTJS_PORT}`,
        });
    }
});

server.listen(PORT, () => {
    console.log(`[Proxy] MeshBeat running on port ${PORT}`);
    console.log(`[Proxy] → Next.js on port ${NEXTJS_PORT}`);
    console.log(`[Proxy] → PeerJS on port ${PEERJS_PORT}`);
});
