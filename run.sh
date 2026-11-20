#!/usr/bin/env bash
# ==============================================================================
# TrustFed — Unified Runner Script
# Launches both FastAPI Backend (:8000) and React Vite Frontend (:5173)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🚀 Starting TrustFed Platform from: $PROJECT_ROOT"

# Cleanup on exit (Ctrl+C)
cleanup() {
  echo ""
  echo "🛑 Shutting down TrustFed services..."
  kill $(jobs -p) 2>/dev/null || true
  wait $(jobs -p) 2>/dev/null || true
  echo "✅ All services stopped."
}
trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------------------------
# 1. Launch Backend (FastAPI / Uvicorn)
# ------------------------------------------------------------------------------
echo "⚙️  Preparing and launching Backend..."
cd "$PROJECT_ROOT/backend"

# Activate Python virtual environment if available
if [ -f "venv/Scripts/activate" ]; then
  echo "🐍 Activating Windows venv..."
  source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
  echo "🐍 Activating POSIX venv..."
  source venv/bin/activate
fi

# Run Uvicorn in background
python -m uvicorn risk_api:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ------------------------------------------------------------------------------
# 2. Launch Frontend (React 19 / Vite)
# ------------------------------------------------------------------------------
echo "💻 Launching Frontend..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "  TrustFed is up and running!"
echo "  • Frontend UI:    http://localhost:5173"
echo "  • Backend API:    http://localhost:8000"
echo "  • API Docs:       http://localhost:8000/docs"
echo "=================================================="
echo "Press Ctrl+C at any time to terminate both servers."
echo ""

# Keep running until Ctrl+C
wait
