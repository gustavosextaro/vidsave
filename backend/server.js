const express = require("express");
const cors = require("cors");
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Paths ────────────────────────────────────────────────────────────────────

const YTDLP_PATH =
    process.env.YTDLP_PATH ||
    "/Users/gustavosextaro/Library/Python/3.9/bin/yt-dlp";

const FFMPEG_PATH =
    process.env.FFMPEG_PATH ||
    "/opt/homebrew/bin/ffmpeg";

// Ensure Homebrew + local bins are always on PATH for child processes
const SPAWN_ENV = {
    ...process.env,
    PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || "/usr/bin:/bin"}`,
};

// ─── Startup checks ───────────────────────────────────────────────────────────

function checkDependency(name, binaryPath, versionFlag = "--version") {
    try {
        const out = execSync(`"${binaryPath}" ${versionFlag} 2>&1`, {
            env: SPAWN_ENV,
            timeout: 5000,
        }).toString().split("\n")[0];
        console.log(`   ✓ ${name}: ${out.trim()}`);
        return true;
    } catch {
        console.error(`   ✗ ${name} NOT FOUND at ${binaryPath}`);
        console.error(`     → Install: brew install ${name.toLowerCase()}`);
        return false;
    }
}

// ─── Platform detection ───────────────────────────────────────────────────────

const SUPPORTED_DOMAINS = [
    "youtube.com", "youtu.be",
    "instagram.com",
    "tiktok.com",
    "twitter.com", "x.com",
    "facebook.com", "fb.watch", "business.facebook.com",
    "vimeo.com",
];

function getPlatformKey(url) {
    try {
        const { hostname } = new URL(url);
        if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
        if (hostname.includes("instagram.com")) return "instagram";
        if (hostname.includes("tiktok.com")) return "tiktok";
        if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "twitter";
        if (hostname.includes("facebook.com") || hostname.includes("fb.watch")) return "facebook";
        if (hostname.includes("vimeo.com")) return "vimeo";
    } catch { }
    return "generic";
}

function getPlatformName(key) {
    return {
        youtube: "YouTube",
        instagram: "Instagram",
        tiktok: "TikTok",
        twitter: "Twitter_X",
        facebook: "Facebook",
        vimeo: "Vimeo",
        generic: "Video",
    }[key] || "Video";
}

function isSupported(url) {
    try {
        const { hostname } = new URL(url);
        return SUPPORTED_DOMAINS.some((d) => hostname.includes(d));
    } catch {
        return false;
    }
}

// ─── Core: platform-specific yt-dlp arguments ────────────────────────────────
//
// Rules:
//  • Always output MP4 (--merge-output-format mp4)
//  • Copy video stream when possible (-c:v copy), re-encode audio to AAC only when needed
//  • TikTok: CDN already serves MP4, skip merge step
//  • YouTube: prefer mp4+m4a then fall back to best available
//  • Instagram / Twitter: prefer direct mp4, fall back to merge
//  • Facebook / Vimeo / generic: standard best-effort MP4 merge

function getDownloadArgs(videoUrl, outputTemplate) {
    const platform = getPlatformKey(videoUrl);

    // Common flags shared by all platforms
    const common = [
        "--no-playlist",
        "--output", outputTemplate,
        "--merge-output-format", "mp4",
        "--no-warnings",
        // Pass ffmpeg location explicitly so yt-dlp never fails to find it
        "--ffmpeg-location", FFMPEG_PATH,
    ];

    switch (platform) {
        case "youtube":
            return [
                "--rm-cache-dir",
                "--extractor-args", "youtube:player_client=ios,android,web",
                "--format",
                "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];

        case "tiktok":
            // TikTok CDN serves MP4 directly — no merge/transcode needed
            return [
                "--format", "best[ext=mp4]/best",
                "--no-playlist",
                "--output", outputTemplate,
                "--merge-output-format", "mp4",
                "--no-warnings",
                "--ffmpeg-location", FFMPEG_PATH,
            ];

        case "instagram":
            return [
                "--format",
                "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/bestvideo+bestaudio/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];

        case "twitter":
            return [
                "--format",
                "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];

        case "facebook":
            return [
                "--add-header", "User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
                "--add-header", "Accept-Language:pt-BR,pt;q=0.9",
                "--format",
                "best[ext=mp4]/bestvideo[ext=mp4]+bestaudio/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];

        case "vimeo":
            return [
                "--format",
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];

        default:
            // Generic fallback
            return [
                "--format",
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                ...common,
                "--postprocessor-args", "ffmpeg:-c:v copy -c:a aac",
            ];
    }
}

// ─── Shared download runner ───────────────────────────────────────────────────

function runDownload(videoUrl, res) {
    const platformKey = getPlatformKey(videoUrl);
    const platformName = getPlatformName(platformKey);
    const tmpId = crypto.randomBytes(8).toString("hex");
    const tmpDir = os.tmpdir();

    // yt-dlp uses %(ext)s so it can pick the right extension after processing;
    // we then look for the .mp4 file it produced.
    const outputTemplate = path.join(tmpDir, `vidsave_${tmpId}.%(ext)s`);
    const expectedMp4 = path.join(tmpDir, `vidsave_${tmpId}.mp4`);
    const safeFilename = `vidsave_${platformName}.mp4`;

    const ytArgs = [...getDownloadArgs(videoUrl, outputTemplate), videoUrl];

    console.log(`[VidSave] Platform: ${platformName} | URL: ${videoUrl}`);
    console.log(`[VidSave] Args: yt-dlp ${ytArgs.join(" ")}`);

    const ytProcess = spawn(YTDLP_PATH, ytArgs, { env: SPAWN_ENV });

    let stderrOutput = "";
    ytProcess.stderr.on("data", (data) => {
        const line = data.toString().trim();
        stderrOutput += line + "\n";
        if (line) console.error(`[yt-dlp] ${line}`);
    });

    ytProcess.stdout.on("data", (data) => {
        const line = data.toString().trim();
        if (line) console.log(`[yt-dlp] ${line}`);
    });

    // Kill yt-dlp only on a genuine premature client disconnect
    res.on("close", () => {
        if (!res.headersSent) {
            console.log("[VidSave] Client disconnected early — aborting yt-dlp");
            ytProcess.kill();
        }
    });

    ytProcess.on("error", (err) => {
        console.error("[VidSave] Spawn error:", err.message);
        if (!res.headersSent) {
            res.status(500).json({
                error: "Could not start yt-dlp. Check your installation.",
                details: err.message,
            });
        }
    });

    ytProcess.on("close", (code, signal) => {
        if (code !== 0) {
            const reason = signal ? `signal ${signal}` : `exit ${code}`;
            console.error(`[yt-dlp] Process ended with ${reason}`);
            if (!res.headersSent) {
                return res.status(500).json({
                    error: `Download failed (${reason}). The URL may be private or geo-blocked.`,
                    details: stderrOutput.slice(-600),
                });
            }
            return;
        }

        // Locate the output file — yt-dlp may name it differently
        let outputFile = expectedMp4;
        if (!fs.existsSync(outputFile)) {
            const candidates = fs.readdirSync(tmpDir)
                .filter((f) => f.startsWith(`vidsave_${tmpId}`))
                .map((f) => path.join(tmpDir, f));

            if (candidates.length === 0) {
                return res.status(500).json({ error: "Output file not found after download." });
            }
            outputFile = candidates[0];
        }

        const stat = fs.statSync(outputFile);
        console.log(`[VidSave] Serving: ${safeFilename} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
        res.setHeader("Content-Length", stat.size);
        res.setHeader("X-Platform", platformName);

        const readStream = fs.createReadStream(outputFile);

        readStream.on("end", () => {
            fs.unlink(outputFile, (err) => {
                if (err) console.warn("[VidSave] Cleanup failed:", err.message);
                else console.log("[VidSave] Temp file cleaned up.");
            });
        });

        readStream.on("error", (err) => {
            console.error("[VidSave] Stream error:", err.message);
        });

        readStream.pipe(res);
    });
}

// ─── Cobalt API implementation (YouTube 1080p Hybrid) ─────────────────────

async function runCobaltDownload(videoUrl, res) {
    const PUBLIC_COBALT_API = "https://api.cobalt.tools"; // Public Instance
    console.log(`[VidSave] Platform: YouTube | Attempting 1080p via Public Cobalt API...`);

    try {
        const cobaltRes = await fetch(PUBLIC_COBALT_API, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: videoUrl,
                videoQuality: "1080",
                filenameStyle: "basic",
                downloadMode: "auto",
            }),
        });

        if (!cobaltRes.ok) throw new Error(`Cobalt API returned status ${cobaltRes.status}`);

        const data = await cobaltRes.json();
        if (data.status === "error") throw new Error(data.text || "Cobalt API error");

        // Simple streaming for Cobalt's tunnel/redirect
        const downloadUrl = data.url;
        if (!downloadUrl) throw new Error("No download URL returned from Cobalt");

        const mediaStream = await fetch(downloadUrl);
        if (!mediaStream.ok) throw new Error("Failed to reach Cobalt media stream");

        const safeFilename = `vidsave_yt_${Date.now()}.mp4`;
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
        res.setHeader("X-Platform", "YouTube (1080p)");

        if (mediaStream.body.pipeTo) {
            const writableStream = new WritableStream({
                write(chunk) { res.write(chunk); },
                close() { res.end(); },
                abort(err) { res.end(); }
            });
            await mediaStream.body.pipeTo(writableStream);
        } else {
            const { Readable } = require('stream');
            const readableNodeStream = Readable.fromWeb(mediaStream.body);
            readableNodeStream.pipe(res);
        }

    } catch (err) {
        console.warn(`[VidSave] Public Cobalt failed (${err.message}). Falling back to local 720p engine.`);
        // Pass control back to the local yt-dlp engine
        runDownload(videoUrl, res);
    }
}



// ─── Headless Meta Extractor implementation (Facebook specific) ────────────

async function runFacebookDownload(videoUrl, res) {
    console.log(`[VidSave] Platform: Facebook | Routing via Headless Puppeteer...`);

    try {
        // Run Puppeteer headless to mimic a real manual inspection
        const directMp4Url = await extractFacebookVideoUrl(videoUrl);

        if (!directMp4Url) {
            throw new Error("Puppeteer could not locate an .mp4 tag in the DOM.");
        }

        console.log(`[VidSave] Fetching direct stream from Meta CDN...`);
        const mediaStream = await fetch(directMp4Url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            }
        });

        if (!mediaStream.ok) {
            throw new Error(`Failed to fetch stream from Facebook CDN. Status: ${mediaStream.status}`);
        }

        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Content-Disposition", `attachment; filename="vidsave_facebook.mp4"`);

        if (mediaStream.body.pipeTo) {
            const writableStream = new WritableStream({
                write(chunk) {
                    res.write(chunk);
                },
                close() {
                    res.end();
                },
                abort(err) {
                    console.error("[VidSave] Facebook stream aborted", err);
                    res.end();
                }
            });
            await mediaStream.body.pipeTo(writableStream);
        } else {
            const { Readable } = require('stream');
            const readableNodeStream = Readable.fromWeb(mediaStream.body);
            readableNodeStream.pipe(res);
        }

    } catch (err) {
        console.error(`[VidSave] Headless Facebook bypass failed: ${err.message}. Defaulting to yt-dlp fallback.`);
        runDownload(videoUrl, res);
    }
}

// ─── Express setup ────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Load converter routes
const convertRouter = require("./convert");
const { extractFacebookVideoUrl } = require("./metaExtractor");
app.use("/api", convertRouter);

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok", engine: "yt-dlp", ffmpeg: FFMPEG_PATH });
});

// Keep-alive ping endpoint (for UptimeRobot)
app.get("/ping", (_req, res) => {
    res.send("pong");
});

// Validate URL (fast — no download)
app.post("/validate", (req, res) => {
    const { url } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ error: "No URL provided." });
    const supported = isSupported(url.trim());
    const key = getPlatformKey(url.trim());
    res.json({
        supported,
        platform: supported ? getPlatformName(key) : null,
    });
});

// GET /download?url=... — native browser file download
app.get("/download", (req, res) => {
    const { url } = req.query;
    if (!url || !url.trim()) return res.status(400).json({ error: "No URL provided." });
    const trimmed = url.trim();
    if (!isSupported(trimmed)) return res.status(400).json({ error: "Unsupported platform or invalid URL." });

    const platform = getPlatformKey(trimmed);
    const isPublic = process.env.IS_PUBLIC_SERVER === "true";

    if (platform === "youtube") {
        // Try Cobalt (1080p) first, falls back to yt-dlp (720p) inside the function
        runCobaltDownload(trimmed, res);
    } else if (platform === "facebook" && !isPublic) {
        runFacebookDownload(trimmed, res);
    } else {
        runDownload(trimmed, res);
    }
});

// POST /download { url } — kept for compatibility
app.post("/download", (req, res) => {
    const { url } = req.body;
    if (!url || !url.trim()) return res.status(400).json({ error: "No URL provided." });
    const trimmed = url.trim();
    if (!isSupported(trimmed)) return res.status(400).json({ error: "Unsupported platform or invalid URL." });

    const platform = getPlatformKey(trimmed);
    const isPublic = process.env.IS_PUBLIC_SERVER === "true";

    if (platform === "youtube" && !isPublic) {
        runCobaltDownload(trimmed, res);
    } else if (platform === "facebook" && !isPublic) {
        runFacebookDownload(trimmed, res);
    } else {
        runDownload(trimmed, res);
    }
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`\n🎬 VidSave backend — http://localhost:${PORT}`);
    console.log(`\n   Dependency check:`);
    const ytOk = checkDependency("yt-dlp", YTDLP_PATH);
    const ffOk = checkDependency("ffmpeg", FFMPEG_PATH, "-version");
    if (!ffOk) {
        console.error("\n   ⚠️  ffmpeg is required for audio+video merging.");
        console.error("   Run: brew install ffmpeg\n");
    }
    console.log(`\n   Endpoints:`);
    console.log(`   GET  /download?url=...`);
    console.log(`   POST /download { url }`);
    console.log(`   POST /validate { url }\n`);
});
