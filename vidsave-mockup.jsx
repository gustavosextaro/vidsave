import { useState, useEffect } from "react";

const PLATFORMS = {
  "youtube.com": { name: "YouTube", color: "#FF0000", icon: "▶" },
  "youtu.be": { name: "YouTube", color: "#FF0000", icon: "▶" },
  "instagram.com": { name: "Instagram", color: "#E1306C", icon: "◈" },
  "tiktok.com": { name: "TikTok", color: "#69C9D0", icon: "♪" },
  "twitter.com": { name: "Twitter/X", color: "#1DA1F2", icon: "✕" },
  "x.com": { name: "Twitter/X", color: "#1DA1F2", icon: "✕" },
  "facebook.com": { name: "Facebook", color: "#1877F2", icon: "ƒ" },
  "vimeo.com": { name: "Vimeo", color: "#1AB7EA", icon: "◎" },
};

function detectPlatform(url) {
  for (const [domain, info] of Object.entries(PLATFORMS)) {
    if (url.includes(domain)) return info;
  }
  return null;
}

const steps = [
  "Detecting source platform...",
  "Fetching video metadata...",
  "Processing video stream...",
  "Encoding to MP4...",
  "Ready to download.",
];

export default function VidSave() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [stepIndex, setStepIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  useEffect(() => {
    const detected = url ? detectPlatform(url) : null;
    setPlatform(detected);
  }, [url]);

  const handleDownload = () => {
    if (!url.trim() || !platform) return;
    setStatus("loading");
    setStepIndex(0);

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setStepIndex(i);
      if (i >= steps.length - 1) {
        clearInterval(interval);
        setTimeout(() => setStatus("done"), 300);
      }
    }, 700);
  };

  const handleReset = () => {
    setUrl("");
    setPlatform(null);
    setStatus("idle");
    setStepIndex(0);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080A0C",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Mono', 'Fira Code', 'Courier New', monospace",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        ::-webkit-scrollbar { display: none; }

        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .glow-orb {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,200,150,0.04) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .card {
          position: relative;
          width: 100%;
          max-width: 540px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          padding: 48px 40px;
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .corner {
          position: absolute;
          width: 12px;
          height: 12px;
          border-color: rgba(0,200,150,0.5);
          border-style: solid;
        }
        .corner-tl { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
        .corner-tr { top: -1px; right: -1px; border-width: 1px 1px 0 0; }
        .corner-bl { bottom: -1px; left: -1px; border-width: 0 0 1px 1px; }
        .corner-br { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }

        .label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(0,200,150,0.7);
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #EAEAEA;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-bottom: 4px;
        }

        .sub {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.08em;
          margin-bottom: 40px;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 32px 0;
        }

        .input-wrap {
          position: relative;
          margin-bottom: 16px;
        }

        .input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 3px;
          padding: 14px 16px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #EAEAEA;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          letter-spacing: 0.03em;
        }

        .input::placeholder {
          color: rgba(255,255,255,0.18);
        }

        .input:focus {
          border-color: rgba(0,200,150,0.4);
          box-shadow: 0 0 0 3px rgba(0,200,150,0.05);
        }

        .platform-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 3px;
          font-size: 11px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.08em;
          animation: fadeIn 0.3s ease;
        }

        .platform-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 3px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .btn-primary {
          background: rgba(0,200,150,1);
          color: #060809;
          font-weight: 500;
        }

        .btn-primary:hover:not(:disabled) {
          background: rgba(0,220,165,1);
          box-shadow: 0 0 24px rgba(0,200,150,0.25);
        }

        .btn-primary:disabled {
          background: rgba(0,200,150,0.2);
          color: rgba(0,200,150,0.4);
          cursor: not-allowed;
        }

        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.3);
          margin-top: 10px;
        }

        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.5);
        }

        .status-block {
          margin-top: 24px;
          animation: fadeIn 0.4s ease;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 11px;
          letter-spacing: 0.08em;
        }

        .status-row:last-child {
          border-bottom: none;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot-done { background: rgba(0,200,150,1); }
        .dot-active { background: rgba(0,200,150,0.8); animation: pulse 1s infinite; }
        .dot-pending { background: rgba(255,255,255,0.1); }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .done-block {
          margin-top: 24px;
          padding: 20px;
          background: rgba(0,200,150,0.04);
          border: 1px solid rgba(0,200,150,0.15);
          border-radius: 3px;
          text-align: center;
          animation: fadeIn 0.4s ease;
        }

        .done-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: rgba(0,200,150,0.9);
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .done-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.1em;
        }

        .btn-download {
          background: rgba(0,200,150,1);
          color: #060809;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border: none;
          border-radius: 3px;
          padding: 12px 24px;
          cursor: pointer;
          margin-top: 16px;
          transition: all 0.2s;
        }

        .btn-download:hover {
          background: rgba(0,220,165,1);
          box-shadow: 0 0 20px rgba(0,200,150,0.3);
        }

        .footer-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.12);
          text-transform: uppercase;
        }

        @media (max-width: 600px) {
          .card { padding: 32px 24px; }
          .title { font-size: 26px; }
        }
      `}</style>

      <div className="grid-bg" />
      <div className="glow-orb" />

      <div className={`card ${mounted ? "visible" : ""}`}>
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        <div className="label">v0.1.0 — local build</div>
        <div className="title">VidSave</div>
        <div className="sub" style={{ marginTop: 6 }}>Universal video downloader · MP4 output</div>

        <div className="divider" />

        {status === "idle" || status === "loading" ? (
          <>
            <div style={{ marginBottom: 6 }} className="label">Video URL</div>
            <div className="input-wrap">
              <input
                className="input"
                type="text"
                placeholder="Paste your video link here..."
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={status === "loading"}
              />
            </div>

            {platform && status === "idle" && (
              <div className="platform-badge">
                <div className="platform-dot" style={{ background: platform.color }} />
                <span style={{ color: platform.color }}>{platform.icon}</span>
                <span>{platform.name} — detected</span>
              </div>
            )}

            {!platform && url.length > 10 && status === "idle" && (
              <div className="platform-badge" style={{ marginBottom: 20 }}>
                <div className="platform-dot" style={{ background: "rgba(255,100,100,0.8)" }} />
                <span style={{ color: "rgba(255,100,100,0.8)" }}>Platform not supported or invalid URL</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={!platform || status === "loading"}
            >
              {status === "loading" ? "Processing..." : "Download →"}
            </button>

            {status === "loading" && (
              <div className="status-block">
                <div className="label" style={{ marginBottom: 12 }}>Pipeline status</div>
                {steps.map((step, i) => (
                  <div className="status-row" key={i}>
                    <div className={`status-dot ${i < stepIndex ? "dot-done" : i === stepIndex ? "dot-active" : "dot-pending"}`} />
                    <span style={{
                      color: i < stepIndex
                        ? "rgba(0,200,150,0.8)"
                        : i === stepIndex
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(255,255,255,0.18)"
                    }}>
                      {step}
                    </span>
                    {i < stepIndex && (
                      <span style={{ marginLeft: "auto", color: "rgba(0,200,150,0.5)", fontSize: 9 }}>DONE</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="done-block">
            <div className="done-title">✓ Video processed</div>
            <div className="done-sub" style={{ marginBottom: 2 }}>Format: MP4 · Source: {platform?.name}</div>
            <div className="done-sub">Ready to save to device</div>
            <button className="btn-download">↓ Save MP4</button>
            <button className="btn btn-ghost" onClick={handleReset} style={{ marginTop: 12 }}>
              ← New download
            </button>
          </div>
        )}

        <div className="footer-meta">
          <span>VidSave — Local</span>
          <span>yt-dlp engine</span>
          <span>MP4 · H.264</span>
        </div>
      </div>
    </div>
  );
}
