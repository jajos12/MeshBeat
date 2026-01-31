#!/bin/sh
# Debug script to check what files exist in the container
echo "=== Checking /app directory contents ==="
ls -la /app/

echo ""
echo "=== Checking for critical files ==="
[ -f /app/server.js ] && echo "✅ server.js exists" || echo "❌ server.js MISSING"
[ -f /app/router.js ] && echo "✅ router.js exists" || echo "❌ router.js MISSING"  
[ -f /app/start.sh ] && echo "✅ start.sh exists" || echo "❌ start.sh MISSING"
[ -d /app/server ] && echo "✅ server/ directory exists" || echo "❌ server/ MISSING"
[ -f /app/server/index.js ] && echo "✅ server/index.js exists" || echo "❌ server/index.js MISSING"

echo ""
echo "=== Starting MeshBeat ==="
exec /app/start.sh
