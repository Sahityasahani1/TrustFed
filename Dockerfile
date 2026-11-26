# ==============================================================================
# TrustFed: Enterprise Multi-Stage Production Container
# Stage 1: Build Frontend Assets (Node 20 Alpine)
# Stage 2: Python 3.12-slim Hardened Runtime with Non-Root Execution
# ==============================================================================

# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Backend Runtime
FROM python:3.12-slim AS runner

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=8001

# Security: Install minimal runtime dependencies & create non-root user
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --home-dir /app --shell /bin/bash trustfed

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application code and artifacts
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure proper permissions for non-root execution
RUN chown -R trustfed:trustfed /app

USER trustfed

# Expose API and Frontend Service Ports
EXPOSE 8001

# Kubernetes & Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8001/healthz || exit 1

# Production Entrypoint with Uvicorn
CMD ["python", "-m", "uvicorn", "backend.risks_api:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "4", "--proxy-headers"]
