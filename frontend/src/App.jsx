import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

const PLATFORMS = {
  "youtube.com": { name: "YouTube", color: "#FF0000", icon: "▶" },
  "youtu.be": { name: "YouTube", color: "#FF0000", icon: "▶" },
  "instagram.com": { name: "Instagram", color: "#E1306C", icon: "◈" },
  "tiktok.com": { name: "TikTok", color: "#69C9D0", icon: "♪" },
  "twitter.com": { name: "Twitter/X", color: "#1DA1F2", icon: "✕" },
  "x.com": { name: "Twitter/X", color: "#1DA1F2", icon: "✕" },
  "facebook.com": { name: "Facebook", color: "#1877F2", icon: "ƒ" },
  "fb.watch": { name: "Facebook", color: "#1877F2", icon: "ƒ" },
  "business.facebook.com": { name: "Facebook Ads", color: "#1877F2", icon: "ƒ" },
  "vimeo.com": { name: "Vimeo", color: "#1AB7EA", icon: "◎" },
};

function detectPlatform(url) {
  for (const [domain, info] of Object.entries(PLATFORMS)) {
    if (url.includes(domain)) return info;
  }
  return null;
}

const PIPELINE_STEPS = [
  "Detecting source platform...",
  "Fetching video metadata...",
  "Processing video stream...",
  "Encoding to MP4...",
  "Streaming to browser...",
];

const CONVERT_STEPS = [
  "Uploading file to server...",
  "Initializing conversion engine...",
  "Processing document...",
  "Finalizing output format...",
];

// ————————————————————————————————————————————————————————————————————————————
// DOWNLOADER MODULE
// ————————————————————————————————————————————————————————————————————————————
function DownloaderModule() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState(null);
  const [saveName, setSaveName] = useState("video.mp4");
  const stepTimerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  useEffect(() => {
    setPlatform(url ? detectPlatform(url) : null);
  }, [url]);

  const startStepAnimation = () => {
    setStepIndex(0);
    let i = 0;
    stepTimerRef.current = setInterval(() => {
      i++;
      setStepIndex(i);
      if (i >= PIPELINE_STEPS.length - 2) clearInterval(stepTimerRef.current);
    }, 900);
  };

  const handleDownload = async () => {
    if (!url.trim() || !platform) return;

    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }

    setStatus("loading");
    setErrorMsg("");
    startStepAnimation();

    try {
      abortRef.current = new AbortController();

      const response = await fetch(
        `${API_BASE}/download?url=${encodeURIComponent(url.trim())}`,
        { signal: abortRef.current.signal }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const rawBlob = await response.blob();

      // Extract robust name
      const safePlatform = platform?.name ? platform.name.replace(/[^a-zA-Z0-9]/g, "_") : "video";
      const name = `vidsave_${safePlatform}.mp4`;

      // Force into a File object (Chrome/Safari respect this more natively for blob URLs)
      const fileBlob = new File([rawBlob], name, { type: "video/mp4" });
      const objectUrl = URL.createObjectURL(fileBlob);

      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setStepIndex(PIPELINE_STEPS.length - 1);
      setBlobUrl(objectUrl);
      setSaveName(name);
      setTimeout(() => setStatus("done"), 350);

    } catch (err) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (err.name === "AbortError") return;
      setErrorMsg(err.message || "Download failed. Please try again.");
      setStatus("error");
    }
  };

  const triggerSave = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = saveName || "vidsave_video.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    setUrl("");
    setPlatform(null);
    setStatus("idle");
    setStepIndex(0);
    setErrorMsg("");
    setSaveName("video.mp4");
  };

  return (
    <div className="module-container">
      <div className="label">MODULE // 01</div>
      <div className="title">VidSave</div>
      <div className="sub">HD Video Extraction</div>

      <div className="divider" />

      {status === "idle" ? (
        <>
          <div className="input-wrap" style={{ marginBottom: platform ? '4px' : '16px' }}>
            <input
              type="text"
              className="input"
              placeholder="Paste video link here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              spellCheck="false"
              autoComplete="off"
            />
          </div>
          {platform && (
            <div className="platform-hint" style={{ color: platform.color }}>
              <span style={{ marginRight: 6 }}>{platform.icon}</span>
              {platform.name} detected
            </div>
          )}

          <button
            className="btn"
            disabled={!url || !platform}
            onClick={handleDownload}
          >
            Download →
          </button>
        </>
      ) : status === "loading" ? (
        <div className="status-block">
          {PIPELINE_STEPS.map((step, idx) => {
            const isActive = idx === stepIndex;
            const isDone = idx < stepIndex;
            return (
              <div key={idx} className="status-row" style={{ opacity: isDone ? 1 : isActive ? 1 : 0.4 }}>
                <div className={`status-dot ${isDone ? 'dot-done' : isActive ? 'dot-active' : 'dot-pending'}`} />
                <span style={{
                  color: isActive ? '#fff' : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  fontWeight: isActive ? 500 : 400
                }}>
                  {step}
                </span>
                {isDone && <span style={{ marginLeft: "auto", color: "rgba(0,200,150,1)" }}>OK</span>}
              </div>
            );
          })}
        </div>
      ) : status === "error" ? (
        <>
          <div className="error-block">
            <div className="error-title">⚠ Download failed</div>
            <div className="error-msg">{errorMsg}</div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={handleReset}>
            ← Try again
          </button>
        </>
      ) : (
        <div className="done-block">
          <div className="done-title">✓ Video processed</div>
          <div className="done-sub" style={{ marginBottom: 2 }}>Format: MP4 · Source: {platform?.name}</div>
          <div className="done-sub">Ready to save to device</div>
          <button className="btn-download" onClick={triggerSave}>↓ Save MP4</button>
          <button className="btn btn-ghost" onClick={handleReset} style={{ marginTop: 12 }}>
            ← New download
          </button>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————————————————
// CONVERTER MODULE
// ————————————————————————————————————————————————————————————————————————————
const CONVERSION_TYPES = [
  { id: "pdf-to-word", label: "PDF para Word", sub: "Documentos DOCX editáveis", icon: "W" },
  { id: "pdf-to-ppt", label: "PDF para PowerPoint", sub: "Apresentações PPTX", icon: "P" },
  { id: "pdf-to-excel", label: "PDF para Excel", sub: "Planilhas XLSX", icon: "X" },
  { id: "word-to-pdf", label: "Word para PDF", sub: "DOCX para PDF fiel", icon: "W" },
  { id: "ppt-to-pdf", label: "PowerPoint para PDF", sub: "PPTX para PDF fiel", icon: "P" },
  { id: "excel-to-pdf", label: "Excel para PDF", sub: "XLSX para PDF ajustado", icon: "X" },
  { id: "pdf-to-jpg", label: "PDF para JPG", sub: "Extraia imagens do PDF", icon: "IMG" },
  { id: "jpg-to-pdf", label: "JPG para PDF", sub: "Converta fotos em PDF", icon: "IMG" },
  { id: "html-to-pdf", label: "HTML para PDF", sub: "Páginas Web para PDF", icon: "HTML" },
  { id: "pdf-to-pdfa", label: "PDF para PDF/A", sub: "Padrão ISO preservado", icon: "A" },
];

function ConverterModule() {
  const [page, setPage] = useState(0);
  const [type, setType] = useState(CONVERSION_TYPES[0].id);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [blobUrl, setBlobUrl] = useState(null);
  const [saveName, setSaveName] = useState("");
  const stepTimerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, []);

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (status !== "idle") return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startStepAnimation = () => {
    setStepIndex(0);
    let i = 0;
    stepTimerRef.current = setInterval(() => {
      i++;
      setStepIndex(i);
      if (i >= CONVERT_STEPS.length - 2) clearInterval(stepTimerRef.current);
    }, 1200);
  };

  const handleConvert = async () => {
    if (!file || !type) return;

    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }

    setStatus("loading");
    setErrorMsg("");
    startStepAnimation();

    try {
      abortRef.current = new AbortController();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch(`${API_BASE}/api/convert`, {
        method: "POST",
        body: formData,
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      // Figure out filename from headers if possible
      const disp = response.headers.get("content-disposition");
      let name = `converted_file`;
      if (disp && disp.includes("filename=")) {
        name = disp.split("filename=")[1].replace(/"/g, "");
      } else {
        // Fallback names
        if (type.includes("pdf")) name += ".pdf";
        if (type.includes("word")) name += ".docx";
        if (type.includes("jpg")) name += ".jpg";
        if (type.includes("excel")) name += ".xlsx";
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setStepIndex(CONVERT_STEPS.length - 1);
      setBlobUrl(objectUrl);
      setSaveName(name);
      setTimeout(() => setStatus("done"), 350);

    } catch (err) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (err.name === "AbortError") return;
      setErrorMsg(err.message || "Conversion failed. Please try again.");
      setStatus("error");
    }
  };

  const triggerSave = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = saveName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    setFile(null);
    setStatus("idle");
    setStepIndex(0);
    setErrorMsg("");
  };

  return (
    <div className="module-container">
      <div className="label">MODULE // 02</div>
      <div className="title">FileConv</div>
      <div className="sub">LibreOffice Document Engine</div>

      <div className="divider" />

      {status === "idle" ? (
        <>
          <div className="type-grid">
            {CONVERSION_TYPES.slice(page * 6, (page + 1) * 6).map((t) => (
              <div
                key={t.id}
                className={`type-card ${type === t.id ? 'active' : ''}`}
                onClick={() => setType(t.id)}
              >
                <div className="type-icon">{t.icon}</div>
                <div className="type-info">
                  <div className="type-label">{t.label}</div>
                  <div className="type-sub">{t.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pagination-wrap">
            <div className="page-dots">
              {[0, 1].map(p => (
                <div 
                  key={p} 
                  className={`page-dot ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                />
              ))}
            </div>
            <button className="btn-page" onClick={() => setPage(page === 0 ? 1 : 0)}>
              {page === 0 ? "Mais opções" : "Voltar"} →
            </button>
          </div>

          <label
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <input type="file" style={{ display: "none" }} onChange={handleFileChange} />
            <div className="dropzone-text">
              {file ? (
                <span style={{ color: "rgba(0,200,150,1)" }}>{file.name}</span>
              ) : (
                "Click or drag file here"
              )}
            </div>
          </label>

          <button
            className="btn"
            disabled={!file}
            onClick={handleConvert}
          >
            Convert File →
          </button>
        </>
      ) : status === "loading" ? (
        <div className="status-block">
          {CONVERT_STEPS.map((step, idx) => {
            const isActive = idx === stepIndex;
            const isDone = idx < stepIndex;
            return (
              <div key={idx} className="status-row" style={{ opacity: isDone ? 1 : isActive ? 1 : 0.4 }}>
                <div className={`status-dot ${isDone ? 'dot-done' : isActive ? 'dot-active' : 'dot-pending'}`} />
                <span style={{
                  color: isActive ? '#fff' : isDone ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                  fontWeight: isActive ? 500 : 400
                }}>
                  {step}
                </span>
                {isDone && <span style={{ marginLeft: "auto", color: "rgba(0,200,150,1)" }}>OK</span>}
              </div>
            );
          })}
        </div>
      ) : status === "error" ? (
        <>
          <div className="error-block">
            <div className="error-title">⚠ Conversion failed</div>
            <div className="error-msg">{errorMsg}</div>
          </div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={handleReset}>
            ← Try again
          </button>
        </>
      ) : (
        <div className="done-block">
          <div className="done-title">✓ File Converted</div>
          <div className="done-sub" style={{ marginBottom: 2 }}>Original: {file?.name}</div>
          <div className="done-sub">Ready to save</div>
          <button className="btn-download" onClick={triggerSave}>↓ Save File</button>
          <button className="btn btn-ghost" onClick={handleReset} style={{ marginTop: 12 }}>
            ← New conversion
          </button>
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————————————————
// MAIN APP COMPONENT
// ————————————————————————————————————————————————————————————————————————————
export default function App() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("downloader");

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

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

        .header-tabs {
          position: relative;
          z-index: 10;
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          opacity: ${mounted ? 1 : 0};
          transform: translateY(${mounted ? 0 : '-16px'});
          transition: all 0.6s ease;
        }

        .tab-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          padding: 8px 16px;
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: rgba(0,200,150,0.1);
          border-color: rgba(0,200,150,0.5);
          color: rgba(0,200,150,1);
        }

        .tab-btn:hover:not(.active) {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.8);
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
          opacity: ${mounted ? 1 : 0};
          transform: translateY(${mounted ? 0 : '16px'});
          transition: opacity 0.6s ease, transform 0.6s ease;
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

        .module-container {
          display: flex;
          flex-direction: column;
        }

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
          margin-bottom: 24px;
        }

        .divider {
          width: 100%;
          height: 1px;
          background: rgba(255,255,255,0.05);
          margin: 0 0 32px 0;
        }

        /* Video Input */
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
          color: #fff;
          outline: none;
          transition: all 0.2s;
        }

        .input::placeholder { color: rgba(255,255,255,0.15); }
        .input:focus {
          border-color: rgba(0,200,150,0.4);
          background: rgba(255,255,255,0.05);
        }

        .platform-hint {
          font-size: 11px;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          width: 100%;
          justify-content: flex-start;
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease;
          opacity: 0.8;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Converter UI */
        .type-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .pagination-wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 0 4px;
        }

        .page-dots {
          display: flex;
          gap: 6px;
        }

        .page-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-dot.active {
          background: rgba(0,200,150,1);
          transform: scale(1.2);
        }

        .btn-page {
          background: transparent;
          border: none;
          color: rgba(0,200,150,1);
          font-size: 10px;
          font-family: 'DM Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .btn-page:hover { opacity: 1; }

        .type-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 6px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
          text-align: left;
          height: 64px;
        }

        .type-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          overflow: hidden;
        }

        .type-label {
          color: rgba(255,255,255,0.8);
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .type-sub {
          color: rgba(255,255,255,0.2);
          font-size: 9px;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .type-card:hover {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.8);
        }

        .type-card.active {
          border-color: rgba(0,200,150,0.5);
          background: rgba(0,200,150,0.05);
          color: rgba(0,200,150,1);
        }

        .type-icon {
          font-size: 16px;
          min-width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.03);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          color: rgba(255,255,255,0.4);
        }

        .type-card.active .type-icon {
          background: rgba(0,200,150,0.1);
          color: rgba(0,200,150,1);
        }

        .type-card.active .type-label {
          color: rgba(0,200,150,1);
        }

        .type-card.active .type-sub {
          color: rgba(0,200,150,0.5);
        }

        .dropzone {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 80px;
          border: 1px dashed rgba(255,255,255,0.15);
          border-radius: 4px;
          background: rgba(255,255,255,0.01);
          cursor: pointer;
          margin-bottom: 16px;
          transition: all 0.2s ease;
        }

        .dropzone:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.3);
        }

        .dropzone-text {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.05em;
        }

        /* Buttons Component */
        .btn {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 14px;
          border-radius: 3px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover:not(:disabled) {
          background: #fff;
          color: #000;
        }

        .btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .btn-ghost {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.3);
        }

        .btn-ghost:hover:not(:disabled) {
          background: transparent;
          color: #fff;
        }

        /* Status Steps Pipeline */
        .status-block {
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 3px;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          font-size: 10px;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: opacity 0.3s ease;
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

        /* Finished block */
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

        /* Error block */
        .error-block {
          margin-top: 24px;
          padding: 16px;
          background: rgba(255,80,80,0.04);
          border: 1px solid rgba(255,80,80,0.15);
          border-radius: 3px;
          animation: fadeIn 0.4s ease;
        }

        .error-title {
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,100,100,0.9);
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }

        .error-msg {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.06em;
          line-height: 1.6;
          word-break: break-word;
        }

        .footer-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          font-size: 9px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.12);
        }
      `}</style>

      <div className="grid-bg" />
      <div className="glow-orb" />

      <div className="header-tabs">
        <button
          className={`tab-btn ${activeTab === 'downloader' ? 'active' : ''}`}
          onClick={() => setActiveTab('downloader')}
        >
          Downloader
        </button>
        <button
          className={`tab-btn ${activeTab === 'converter' ? 'active' : ''}`}
          onClick={() => setActiveTab('converter')}
        >
          Converter
        </button>
      </div>

      <div className="card">
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {activeTab === "downloader" ? <DownloaderModule /> : <ConverterModule />}

        <div className="footer-meta">
          <span>VidSave — Local</span>
          <span>{activeTab === "downloader" ? "yt-dlp engine" : "LibreOffice Engine"}</span>
          <span>{activeTab === "downloader" ? "MP4 · H.264" : "PDF · DOCX · JPG · XLSX"}</span>
        </div>
      </div>
    </div>
  );
}
