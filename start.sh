#!/bin/sh
# MeshBeat Startup Script
# Starts Next.js, PeerJS server, and the proxy in parallel

echo "[start.sh] Starting MeshBeat services..."

# Start Next.js on port 3001 in the background
echo "[start.sh] Starting Next.js on port 3001..."
PORT=3001 node server.js &
NEXTJS_PID=$!

# Start PeerJS server on port 9000 in the background
echo "[start.sh] Starting PeerJS server on port 9000..."
cd server && node index.js &
PEERJS_PID=$!
cd ..

# Give services time to initialize
sleep 2

# Start the proxy on the main port (foreground)
echo "[start.sh] Starting proxy on port ${PORT:-3000}..."
node proxy.js

# If proxy exits, kill background processes
kill $NEXTJS_PID $PEERJS_PID 2>/dev/null
