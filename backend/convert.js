const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const pdfPoppler = require("pdf-poppler");

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

// LibreOffice executable path (Homebrew cask on macOS or default Linux)
const LIBREOFFICE_PATH = process.env.LIBREOFFICE_PATH || "/Applications/LibreOffice.app/Contents/MacOS/soffice";

// Helper to run LibreOffice
function runLibreOffice(inputFile, outputDir, convertTo, infilter = "") {
    return new Promise((resolve, reject) => {
        let cmd = `"${LIBREOFFICE_PATH}" --headless`;
        if (infilter) cmd += ` --infilter="${infilter}"`;
        cmd += ` --convert-to ${convertTo} "${inputFile}" --outdir "${outputDir}"`;

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("[Converter] LibreOffice error:", stderr);
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// Ensure cleanup of temp files
function cleanupFiles(files) {
    files.forEach((f) => {
        if (f && fs.existsSync(f)) {
            fs.unlink(f, (err) => {
                if (err) console.error("[Converter] Cleanup failed for", f, err.message);
            });
        }
    });
}

router.post("/convert", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file provided" });
    const { type } = req.body;
    if (!type) {
        cleanupFiles([req.file.path]);
        return res.status(400).json({ error: "No conversion type provided" });
    }

    const tmpDir = os.tmpdir();
    // Rename multer file to have the correct original extension so libreoffice detects it properly
    const originalExt = path.extname(req.file.originalname) || "";
    const inputFile = `${req.file.path}${originalExt}`;
    fs.renameSync(req.file.path, inputFile);

    const baseName = path.basename(req.file.originalname, originalExt);
    let outputFile = "";
    let downloadName = "";
    let contentType = "";

    try {
        console.log(`[Converter] Starting ${type} conversion for ${req.file.originalname}`);

        if (type === "word-to-pdf") {
            await runLibreOffice(inputFile, tmpDir, "pdf");
            outputFile = path.join(tmpDir, `${path.parse(inputFile).name}.pdf`);
            downloadName = `${baseName}.pdf`;
            contentType = "application/pdf";

        } else if (type === "pdf-to-word") {
            await runLibreOffice(inputFile, tmpDir, "docx", "writer_pdf_import");
            outputFile = path.join(tmpDir, `${path.parse(inputFile).name}.docx`);
            downloadName = `${baseName}.docx`;
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        } else if (type === "pdf-to-excel") {
            await runLibreOffice(inputFile, tmpDir, "xlsx", "calc_pdf_import");
            outputFile = path.join(tmpDir, `${path.parse(inputFile).name}.xlsx`);
            downloadName = `${baseName}.xlsx`;
            contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        } else if (type === "pdf-to-jpg") {
            // pdf-poppler generates <prefix>-1.jpg, <prefix>-2.jpg etc.
            const outPrefix = path.join(tmpDir, path.parse(inputFile).name);
            await pdfPoppler.convert(inputFile, {
                format: "jpeg",
                out_dir: tmpDir,
                out_prefix: path.parse(inputFile).name,
                page: 1, // We only generate the first page to keep it a simple single-file download
            });
            outputFile = `${outPrefix}-1.jpg`; // pdf-poppler appends -1 for the first page
            downloadName = `${baseName}.jpg`;
            contentType = "image/jpeg";

        } else {
            throw new Error("Invalid conversion type");
        }

        if (!fs.existsSync(outputFile)) {
            throw new Error(`Output file was not generated: ${outputFile}`);
        }

        // Stream back to client
        const stat = fs.statSync(outputFile);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.setHeader("Content-Length", stat.size);

        const readStream = fs.createReadStream(outputFile);
        readStream.on("end", () => {
            console.log(`[Converter] Successfully served ${downloadName}`);
            cleanupFiles([inputFile, outputFile]);
        });
        readStream.on("error", (err) => {
            console.error("[Converter] Stream error:", err.message);
            cleanupFiles([inputFile, outputFile]);
        });
        readStream.pipe(res);

    } catch (err) {
        console.error("[Converter] Conversion failed:", err.message);
        cleanupFiles([inputFile, outputFile]);
        if (!res.headersSent) {
            res.status(500).json({ error: "Conversion failed. Please check the file and try again.", details: err.message });
        }
    }
});

module.exports = router;
