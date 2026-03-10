FROM node:18-bullseye-slim

# Install ffmpeg, python3 (for yt-dlp) and curl
RUN apt-get update && \
    apt-get install -y ffmpeg python3 curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Set environment variables for production behavior
ENV YTDLP_PATH="/usr/local/bin/yt-dlp"
ENV FFMPEG_PATH="/usr/bin/ffmpeg"
ENV IS_PUBLIC_SERVER="true"

EXPOSE 3001
CMD ["node", "server.js"]
