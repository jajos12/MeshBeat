#!/bin/sh
# MeshBeat Startup Script
# Starts Next.js, PeerJS server, and the router in parallel

echo "[start.sh] Starting MeshBeat services..."

# Change to app directory
cd /app

# Start Next.js on port 3001 in the background
echo "[start.sh] Starting Next.js on port 3001..."
HOSTNAME=0.0.0.0 PORT=3001 node server.js &
NEXTJS_PID=$!

# Start PeerJS server on port 9000 in the background
echo "[start.sh] Starting PeerJS server on port 9000..."
cd /app/server && node index.js &
PEERJS_PID=$!

# Give services time to initialize (Next.js can take a few seconds)
sleep 5

# Start the router on the main port (foreground)
echo "[start.sh] Starting router on port ${PORT:-3000}..."
cd /app && node router.js

# If router exits, kill background processes
kill $NEXTJS_PID $PEERJS_PID 2>/dev/null
