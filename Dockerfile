FROM python:3.12-slim

# Install Node.js 20 and yarn
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g yarn && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install and build frontend
COPY frontend/package.json ./frontend/
RUN cd frontend && yarn install

COPY frontend/ ./frontend/
RUN cd frontend && yarn build

# Copy backend
COPY backend/ ./backend/

EXPOSE 8000

CMD cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}
