const puppeteer = require('puppeteer');

/**
 * Extracts the raw MP4 video URL from a Facebook or Meta Ads Library page
 * by automating the browser and inspecting the DOM for the loaded <video> element.
 * 
 * @param {string} url The Facebook/Meta Ad Library URL
 * @returns {Promise<string>} The extracted raw CDN .mp4 URL
 */
async function extractFacebookVideoUrl(url) {
    let browser;
    try {
        console.log(`[MetaExtractor] Launching headless browser for: ${url}`);
        // Use headless mode. Configure aggressive memory limits for 512MB RAM free-tiers
        browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--single-process'
            ]
        });

        const page = await browser.newPage();

        // Stealth: Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        console.log(`[MetaExtractor] Navigating to page...`);
        // Wait until network is mostly idle to ensure dynamic video elements have loaded
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log(`[MetaExtractor] Waiting for <video> element...`);

        // Wait up to 15 seconds for a video tag to appear and have a valid 'src'
        // Some FB video players are deeply nested or load dynamically.
        const videoSrc = await page.evaluate(async () => {
            return new Promise((resolve) => {
                const getBestVideoSrc = () => {
                    // 1. Try to find a video inside the active popup modal
                    const dialogs = document.querySelectorAll('[role="dialog"]');
                    if (dialogs.length > 0) {
                        const videoInDialog = dialogs[dialogs.length - 1].querySelector('video');
                        if (videoInDialog && videoInDialog.src && videoInDialog.src.includes('.mp4')) {
                            return videoInDialog.src;
                        }
                    }

                    // 2. Fallback: Find the video with the largest rendered area (the focused ad)
                    const videos = Array.from(document.querySelectorAll('video')).filter(v => v.src && v.src.includes('.mp4'));
                    if (videos.length === 0) return null;

                    let largestVideo = videos[0];
                    let maxArea = largestVideo.offsetWidth * largestVideo.offsetHeight;

                    for (let i = 1; i < videos.length; i++) {
                        const area = videos[i].offsetWidth * videos[i].offsetHeight;
                        if (area > maxArea) {
                            maxArea = area;
                            largestVideo = videos[i];
                        }
                    }

                    // Only return if it actually has dimensions (is rendered)
                    if (maxArea > 0) return largestVideo.src;

                    // 3. Absolute fallback: return the first one found
                    return videos[0].src;
                };

                // Check immediately
                const initialSrc = getBestVideoSrc();
                if (initialSrc) {
                    resolve(initialSrc);
                    return;
                }

                // Set up a MutationObserver to watch the DOM for new video elements
                const observer = new MutationObserver(() => {
                    const src = getBestVideoSrc();
                    if (src) {
                        observer.disconnect();
                        resolve(src);
                    }
                });

                observer.observe(document.body, { childList: true, subtree: true });

                // Failsafe timeout inside the browser context
                setTimeout(() => {
                    observer.disconnect();
                    resolve(getBestVideoSrc());
                }, 14000);
            });
        });

        if (!videoSrc) {
            throw new Error('Could not find a <video> element with an MP4 source on the page.');
        }

        console.log(`[MetaExtractor] Found MP4 URL: ${videoSrc.substring(0, 80)}...`);
        return videoSrc;

    } catch (error) {
        console.error(`[MetaExtractor] Error extracting video: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[MetaExtractor] Headless browser closed.`);
        }
    }
}

module.exports = {
    extractFacebookVideoUrl
};
