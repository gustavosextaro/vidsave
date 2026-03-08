# VidSave — Universal Video Downloader

A clean, minimalist video downloader. Paste a URL → get an MP4. Powered by `yt-dlp`.

**Supported platforms:** YouTube · Instagram · TikTok · Twitter/X · Facebook · Vimeo

---

## Prerequisites

Before running VidSave, make sure these are installed:

### 1. Node.js (v18+)
Download from [nodejs.org](https://nodejs.org) or via Homebrew:
```bash
brew install node
```

### System Requirements

This project relies on external tools to download, merge, and convert media:
1. **Node.js** (v18+)
2. **Python 3.10+**
3. **yt-dlp**: Required for downloading videos from the supported platforms.
   - Install via pip: `python3 -m pip install -U yt-dlp`
4. **FFmpeg**: Required to merge video/audio streams into MP4 without re-encoding.
   - **macOS**: `brew install ffmpeg`
   - **Debian/Ubuntu**: `sudo apt install ffmpeg`
   - **Windows**: Download from gyan.dev and add to PATH.
5. **LibreOffice**: Required for the Document Converter module (Word↔PDF, PDF→Excel).
   - **macOS**: `brew install --cask libreoffice`
   - **Debian/Ubuntu**: `sudo apt install libreoffice`
   - **Windows**: Download the official installer.

# Verify it works
yt-dlp --version

### 3. ffmpeg (required to merge video+audio streams)
```bash
brew install ffmpeg
```

---

## Setup & Run

### 1. Install all dependencies
```bash
cd /path/to/VIDSAVE
npm run install:all
```

### 2. Start the app
```bash
npm start
```

This boots both servers concurrently:
| Service  | URL                         |
|----------|-----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:3001       |

---

## Project Structure

```
VIDSAVE/
├── package.json          ← root: concurrently start script
├── README.md
│
├── backend/
│   ├── package.json
│   └── server.js         ← Express API + yt-dlp integration
│
└── frontend/
    ├── package.json
    ├── vite.config.js    ← Vite + proxy to backend
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx       ← Main UI component
        └── index.css
```

---

## How it works

1. You paste a video URL in the browser UI
2. Frontend detects the platform from the URL pattern
3. On "Download →", a `POST /download` request is sent to the backend
4. The backend spawns `yt-dlp` to download the best available MP4
5. The file is streamed back to the browser
6. A native file-save dialog appears on your device

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `yt-dlp: command not found` | Run `pip3 install yt-dlp` and ensure Python Scripts are in PATH |
| `ffmpeg not found` | Run `brew install ffmpeg` |
| Download stalls / times out | Some platforms require cookies; run `yt-dlp <url>` in terminal to debug |
| Port already in use | Kill the process: `lsof -ti:3001 | xargs kill` |

---

## Updating yt-dlp

Sites update frequently. Keep yt-dlp current:
```bash
pip3 install -U yt-dlp
```
