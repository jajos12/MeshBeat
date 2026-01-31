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
    console.error('[Proxy] Error connecting to target:', err);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway: ' + (err.code || 'Unknown Error'));
});

// Create the main server
const server = http.createServer((req, res) => {
    // Route /meshbeat to PeerJS server
    if (req.url.startsWith('/meshbeat')) {
        console.log(`[Router] → PeerJS: ${req.method} ${req.url}`);
        proxy.web(req, res, {
            target: `http://0.0.0.0:${PEERJS_PORT}`,
            ws: false,
        });
    } else {
        // Route everything else to Next.js
        proxy.web(req, res, {
            target: `http://0.0.0.0:${NEXTJS_PORT}`,
            ws: false,
        });
    }
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/meshbeat')) {
        console.log(`[Router] WebSocket → PeerJS: ${req.url}`);
        proxy.ws(req, socket, head, {
            target: `ws://0.0.0.0:${PEERJS_PORT}`,
        });
    } else {
        console.log(`[Router] WebSocket → Next.js: ${req.url}`);
        proxy.ws(req, socket, head, {
            target: `ws://0.0.0.0:${NEXTJS_PORT}`,
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Router] MeshBeat listening ON ${PORT}`);
    console.log(`[Router] → Routing to Next.js (3001) and PeerJS (9000)`);
    console.log(`🚀 TIP: Access app at http://localhost:${PORT}`);
});
