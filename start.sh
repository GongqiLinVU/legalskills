#!/bin/bash

# s117 Legal Decision Engine – Start Script
# Starts both backend (port 3000) and client (port 5173)

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/s117-engine"
CLIENT_DIR="$ROOT_DIR/s117-client"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null
  wait 2>/dev/null
  echo "Done."
  exit 0
}

trap cleanup INT TERM

# Kill anything already on our ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Install dependencies if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
  echo "Installing client dependencies..."
  (cd "$CLIENT_DIR" && npm install)
fi

# Start backend
echo "Starting backend on http://localhost:3000 ..."
(cd "$BACKEND_DIR" && npx ts-node src/index.ts) &
BACKEND_PID=$!

sleep 2

# Verify backend is up
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "ERROR: Backend failed to start."
  kill "$BACKEND_PID" 2>/dev/null
  exit 1
fi

echo "Backend is running."

# Start client
echo "Starting client on http://localhost:5173 ..."
(cd "$CLIENT_DIR" && npx vite --port 5173) &
CLIENT_PID=$!

sleep 2

echo ""
echo "========================================="
echo "  s117 Legal Decision Engine is running"
echo "========================================="
echo "  Client:  http://localhost:5173"
echo "  Backend: http://localhost:3000"
echo "  Health:  http://localhost:3000/api/health"
echo "========================================="
echo "  Press Ctrl+C to stop both servers"
echo "========================================="
echo ""

wait
