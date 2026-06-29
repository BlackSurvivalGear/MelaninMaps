import qrcode from "./qrcode.js";

/**
 * QR Code Manager Module
 * Handles generation, preview, download, and link copying.
 */

// DOM Elements
const generateBtn = document.getElementById("generate-qr-btn");
const openMenuBtn = document.getElementById("open-menu-btn");
const downloadBtn = document.getElementById("download-qr-btn");
const copyLinkBtn = document.getElementById("copy-link-btn");
const downloadSvgBtn = document.getElementById("download-qr-svg-btn");
const qrPreviewContainer = document.getElementById("qr-preview-container");
const qrDownloadActions = document.getElementById("qr-download-actions");
const qrMessage = document.getElementById("qr-message");
const qrError = document.getElementById("qr-error");

let currentUid = null;
let currentBizName = "restaurant";
let publicMenuUrl = "";
let currentLogoUrl = "";
let currentSvgData = "";

/**
 * Helper: Load an image and convert to Base64 Data URL
 * @param {string} src
 * @returns {Promise<string|null>}
 */
async function getBase64FromUrl(src) {
    try {
        const response = await fetch(src);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to load logo for QR branding:", e);
        return null;
    }
}

/**
 * Initialize the QR Manager
 * @param {string} uid - Authenticated user UID
 * @param {string} businessName - Restaurant business name
 * @param {string} logoUrl - Restaurant logo URL
 */
export function initQRManager(uid, businessName, logoUrl = "") {
    if (!uid) return;

    currentUid = uid;
    currentBizName = businessName || "Restaurant";
    currentLogoUrl = logoUrl;
    // Keep it relative or dynamic for sandbox
    const host = window.location.host;
    const protocol = window.location.protocol;
    publicMenuUrl = `${protocol}//${host}/menu.html?id=${uid}`;

    if (generateBtn) {
        generateBtn.addEventListener("click", handleGenerateQR);
    }

    if (openMenuBtn) {
        openMenuBtn.addEventListener("click", handleOpenMenu);
    }

    if (downloadBtn) {
        downloadBtn.addEventListener("click", handleDownloadPNG);
    }

    if (downloadSvgBtn) {
        downloadSvgBtn.addEventListener("click", handleDownloadSVG);
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener("click", handleCopyLink);
    }
}

/**
 * Handle QR Code Generation
 */
async function handleGenerateQR() {
    try {
        hideFeedback();

        // Generate QR code data
        const qr = qrcode(0, 'H'); // Type 0 (auto), Error Correction Level H (High)
        qr.addData(publicMenuUrl);
        qr.make();

        // Create Canvas for better control and download
        const canvasSize = 300;
        const margin = 20;
        const qrModules = qr.getModuleCount();

        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        const innerSize = canvasSize - (margin * 2);
        const cellSize = innerSize / qrModules;

        for (let row = 0; row < qrModules; row++) {
            for (let col = 0; col < qrModules; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(
                        margin + (col * cellSize),
                        margin + (row * cellSize),
                        Math.ceil(cellSize),
                        Math.ceil(cellSize)
                    );
                }
            }
        }

        // Add Centered Branding Logo
        const faviconDataUrl = await getBase64FromUrl('/favicon.png');

        if (faviconDataUrl) {
            const logo = new Image();
            await new Promise((resolve) => {
                logo.onload = resolve;
                logo.src = faviconDataUrl;
            });

            const logoSize = canvasSize * 0.20; // 20% of width
            const logoPos = (canvasSize - logoSize) / 2;
            const logoMargin = 6; // 6px white margin

            // Draw white rounded-square background
            ctx.fillStyle = "white";
            const bgPos = logoPos - logoMargin;
            const bgSize = logoSize + (logoMargin * 2);
            const radius = 8;

            ctx.beginPath();
            ctx.moveTo(bgPos + radius, bgPos);
            ctx.lineTo(bgPos + bgSize - radius, bgPos);
            ctx.quadraticCurveTo(bgPos + bgSize, bgPos, bgPos + bgSize, bgPos + radius);
            ctx.lineTo(bgPos + bgSize, bgPos + bgSize - radius);
            ctx.quadraticCurveTo(bgPos + bgSize, bgPos + bgSize, bgPos + bgSize - radius, bgPos + bgSize);
            ctx.lineTo(bgPos + radius, bgPos + bgSize);
            ctx.quadraticCurveTo(bgPos, bgPos + bgSize, bgPos, bgPos + bgSize - radius);
            ctx.lineTo(bgPos, bgPos + radius);
            ctx.quadraticCurveTo(bgPos, bgPos, bgPos + radius, bgPos);
            ctx.closePath();
            ctx.fill();

            // Draw logo
            ctx.drawImage(logo, logoPos, logoPos, logoSize, logoSize);
        }

        // Generate Branded SVG
        currentSvgData = generateBrandedSVG(qr, faviconDataUrl, canvasSize, margin);

        // Update UI - Reorder branding elements
        qrPreviewContainer.innerHTML = "";
        qrPreviewContainer.style.flexDirection = "column";
        qrPreviewContainer.style.gap = "1.5rem";
        qrPreviewContainer.style.padding = "2rem 1rem";
        qrPreviewContainer.style.height = "auto";
        qrPreviewContainer.style.minHeight = "450px";

        // 1. QR Code
        qrPreviewContainer.appendChild(canvas);

        // 2. Restaurant Logo (if available)
        if (currentLogoUrl) {
            const logoImg = document.createElement("img");
            logoImg.src = currentLogoUrl;
            logoImg.className = "qr-logo-preview";
            logoImg.style.marginTop = "0"; // Reset margin
            qrPreviewContainer.appendChild(logoImg);
        }

        // 3. Business Name
        const bizNameLabel = document.createElement("div");
        bizNameLabel.textContent = currentBizName;
        bizNameLabel.style.fontSize = "1.25rem";
        bizNameLabel.style.fontWeight = "700";
        bizNameLabel.style.color = "var(--text-color)";
        qrPreviewContainer.appendChild(bizNameLabel);

        // 4. Clickable Menu Link
        const menuLink = document.createElement("a");
        menuLink.href = publicMenuUrl;
        menuLink.target = "_blank";
        menuLink.rel = "noopener";
        menuLink.textContent = "Open Restaurant Menu";
        menuLink.style.fontSize = "1rem";
        menuLink.style.color = "var(--primary-color)";
        menuLink.style.textDecoration = "none";
        menuLink.style.fontWeight = "600";
        menuLink.addEventListener("mouseover", () => menuLink.style.textDecoration = "underline");
        menuLink.addEventListener("mouseout", () => menuLink.style.textDecoration = "none");
        qrPreviewContainer.appendChild(menuLink);

        // 5. Buttons Row
        qrDownloadActions.classList.remove("hidden");
        qrDownloadActions.style.marginTop = "0.5rem";
        qrPreviewContainer.appendChild(qrDownloadActions);

        console.log("QR Code generated successfully for:", currentBizName);

    } catch (error) {
        console.error("QR Generation Error:", error);
        showError("Unable to generate QR code. Please try again.");
    }
}

/**
 * Generate Branded SVG String
 */
function generateBrandedSVG(qr, logoDataUrl, size, margin) {
    const modules = qr.getModuleCount();
    const cellSize = (size - (margin * 2)) / modules;

    let paths = "";
    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            if (qr.isDark(row, col)) {
                const x = margin + (col * cellSize);
                const y = margin + (row * cellSize);
                paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
            }
        }
    }

    let branding = "";
    if (logoDataUrl) {
        const logoSize = size * 0.20;
        const logoPos = (size - logoSize) / 2;
        const logoMargin = 6;
        const bgPos = logoPos - logoMargin;
        const bgSize = logoSize + (logoMargin * 2);
        const radius = 8;

        branding = `
            <rect x="${bgPos}" y="${bgPos}" width="${bgSize}" height="${bgSize}" rx="${radius}" fill="white" />
            <image href="${logoDataUrl}" x="${logoPos}" y="${logoPos}" width="${logoSize}" height="${logoSize}" />
        `;
    }

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <rect width="100%" height="100%" fill="white" />
            <path d="${paths}" fill="black" />
            ${branding}
        </svg>
    `.trim();
}

/**
 * Handle Open Menu
 */
function handleOpenMenu() {
    if (publicMenuUrl) {
        window.open(publicMenuUrl, '_blank');
    }
}

/**
 * Handle PNG Download
 */
function handleDownloadPNG() {
    try {
        const canvas = qrPreviewContainer.querySelector("canvas");
        if (!canvas) {
            showError("Please generate a QR code first.");
            return;
        }

        // Sanitize business name for filename
        const sanitizedName = currentBizName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const filename = `${sanitizedName || 'restaurant'}-qr.png`;

        // Create download link
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (error) {
        console.error("Download Error:", error);
        showError("Download failure. Please try again.");
    }
}

/**
 * Handle SVG Download
 */
function handleDownloadSVG() {
    try {
        if (!currentSvgData) {
            showError("Please generate a QR code first.");
            return;
        }

        const sanitizedName = currentBizName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const filename = `${sanitizedName || 'restaurant'}-qr.svg`;

        const blob = new Blob([currentSvgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Download Error:", error);
        showError("Download failure. Please try again.");
    }
}

/**
 * Handle Copy Link to Clipboard
 */
async function handleCopyLink() {
    try {
        if (!publicMenuUrl) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(publicMenuUrl);
            showMessage("✓ Menu link copied");
        } else {
            throw new Error("Clipboard unavailable");
        }
    } catch (error) {
        console.error("Clipboard Error:", error);
        showError("Clipboard unavailable or permission denied.");
    }
}

/**
 * Show error message
 */
function showError(msg) {
    if (qrError) {
        qrError.textContent = msg;
        qrError.classList.remove("hidden");
        setTimeout(() => qrError.classList.add("hidden"), 5000);
    }
}

/**
 * Show success message
 */
function showMessage(msg) {
    if (qrMessage) {
        qrMessage.textContent = msg;
        qrMessage.classList.remove("hidden");
        setTimeout(() => qrMessage.classList.add("hidden"), 3000);
    }
}

/**
 * Hide all feedback boxes
 */
function hideFeedback() {
    if (qrError) qrError.classList.add("hidden");
    if (qrMessage) qrMessage.classList.add("hidden");
}
