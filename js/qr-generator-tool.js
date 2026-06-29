import { auth, db, signOut } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import qrcode from "./qrcode.js";

// DOM Elements
const qrBizNameInput = document.getElementById('qr-biz-name');
const qrUrlInput = document.getElementById('qr-url');
const includeLogoCheckbox = document.getElementById('include-logo');
const standardLogoOption = document.getElementById('standard-logo-option');
const updateBtn = document.getElementById('update-qr-btn');
const downloadBtn = document.getElementById('download-qr-btn');
const resetBtn = document.getElementById('reset-qr-btn');
const canvasHolder = document.getElementById('qr-canvas-holder');
const previewLogo = document.getElementById('preview-logo');
const previewBizName = document.getElementById('preview-biz-name');
const previewUrl = document.getElementById('preview-url');
const logoutBtn = document.getElementById("logout-btn");

// PRO Features Elements
const proUpgradeAlert = document.getElementById('pro-upgrade-alert');
const customLogoInput = document.getElementById('custom-logo-input');
const uploadLogoBtn = document.getElementById('upload-logo-btn');
const logoPreviewContainer = document.getElementById('logo-preview-container');
const logoPreviewImg = document.getElementById('logo-preview-img');
const removeLogoBtn = document.getElementById('remove-logo-btn');
const qrFgColorInput = document.getElementById('qr-fg-color');
const qrBgColorInput = document.getElementById('qr-bg-color');
const styleOptions = document.querySelectorAll('.style-option');

// State
let isPro = false;
let currentLogoUrl = ""; // For legacy/standard logo
let customLogoFileUrl = ""; // For PRO uploaded logo
let selectedStyle = "square";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userPlan = userDoc.exists() ? userDoc.data().plan : "preview";

            isPro = (userPlan === "pro");

            if (!isPro) {
                proUpgradeAlert.classList.remove('hidden');
                standardLogoOption.classList.remove('hidden');
                // Lock PRO controls
                lockProFeatures();
            }

            const bizDocRef = doc(db, "businesses", user.uid);
            const bizDoc = await getDoc(bizDocRef);

            if (bizDoc.exists()) {
                const data = bizDoc.data();
                qrBizNameInput.value = data.businessName || "My Business";

                const host = window.location.host;
                const protocol = window.location.protocol;
                const defaultUrl = `${protocol}//${host}/menu.html?id=${user.uid}`;
                qrUrlInput.value = defaultUrl;

                currentLogoUrl = data.logoUrl || "";

                generateQRCode();
            }
        } catch (error) {
            console.error("Error fetching business data:", error);
        }
    }
});

function lockProFeatures() {
    uploadLogoBtn.disabled = true;
    qrFgColorInput.disabled = true;
    qrBgColorInput.disabled = true;
    styleOptions.forEach(opt => opt.style.pointerEvents = 'none');

    // Add click listeners to show alert when clicking disabled features
    [uploadLogoBtn, qrFgColorInput, qrBgColorInput].forEach(el => {
        el.parentElement.addEventListener('click', (e) => {
            if (!isPro) {
                proUpgradeAlert.scrollIntoView({ behavior: 'smooth' });
                proUpgradeAlert.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => proUpgradeAlert.style.animation = '', 500);
            }
        });
    });

    styleOptions.forEach(opt => {
        opt.parentElement.addEventListener('click', () => {
            if (!isPro) {
                proUpgradeAlert.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function generateQRCode() {
    const text = qrUrlInput.value || "https://melaninmaps.africa";
    const bizName = qrBizNameInput.value || "Business Name";
    const fgColor = isPro ? qrFgColorInput.value : "#000000";
    const bgColor = isPro ? qrBgColorInput.value : "#FFFFFF";

    // Logic for which logo to show
    let logoToUse = "";
    if (isPro && customLogoFileUrl) {
        logoToUse = customLogoFileUrl;
    } else if (includeLogoCheckbox.checked && currentLogoUrl) {
        logoToUse = currentLogoUrl;
    }

    try {
        const qr = qrcode(0, 'H');
        qr.addData(text);
        qr.make();

        const cellSize = 8;
        const margin = 20;
        const qrSize = qr.getModuleCount();
        const canvasSize = 300;

        const canvas = document.createElement('canvas');
        canvas.id = "qr-result-canvas";
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code scaled to fit
        const scale = (canvasSize - margin * 2) / (qrSize * cellSize);
        ctx.save();
        ctx.translate(margin, margin);
        ctx.scale(scale * cellSize, scale * cellSize);

        for (let row = 0; row < qrSize; row++) {
            for (let col = 0; col < qrSize; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillStyle = fgColor;

                    if (isPro) {
                        drawStyledModule(ctx, row, col, qr);
                    } else {
                        ctx.fillRect(col, row, 1, 1);
                    }
                }
            }
        }
        ctx.restore();

        // Update UI
        canvasHolder.innerHTML = "";
        canvasHolder.appendChild(canvas);

        previewBizName.textContent = bizName;
        previewUrl.textContent = text;

        if (logoToUse) {
            previewLogo.src = logoToUse;
            previewLogo.classList.remove('hidden');
        } else {
            previewLogo.classList.add('hidden');
        }

    } catch (error) {
        console.error("QR Generation Error:", error);
    }
}

// Placeholder for styled modules
function drawStyledModule(ctx, row, col, qr) {
    const isDark = (r, c) => {
        if (r < 0 || r >= qr.getModuleCount() || c < 0 || c >= qr.getModuleCount()) return false;
        return qr.isDark(r, c);
    };

    switch (selectedStyle) {
        case 'rounded':
            const hasTop = isDark(row - 1, col);
            const hasBottom = isDark(row + 1, col);
            const hasLeft = isDark(row, col - 1);
            const hasRight = isDark(row, col + 1);

            ctx.beginPath();
            // Using a simple rounded rect for each module if not connected
            // For a more advanced version, we'd check neighbors
            if (!hasTop && !hasBottom && !hasLeft && !hasRight) {
                // Isolated dot
                ctx.arc(col + 0.5, row + 0.5, 0.45, 0, Math.PI * 2);
            } else {
                // Simplified rounded module
                const r = 0.4;
                ctx.moveTo(col + 0.5, row);
                ctx.arcTo(col + 1, row, col + 1, row + 1, hasRight || hasTop ? 0 : r);
                ctx.arcTo(col + 1, row + 1, col, row + 1, hasRight || hasBottom ? 0 : r);
                ctx.arcTo(col, row + 1, col, row, hasLeft || hasBottom ? 0 : r);
                ctx.arcTo(col, row, col + 1, row, hasLeft || hasTop ? 0 : r);
            }
            ctx.fill();
            break;
        case 'dots':
            ctx.beginPath();
            ctx.arc(col + 0.5, row + 0.5, 0.4, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'blocks':
            ctx.fillRect(col + 0.05, row + 0.05, 0.9, 0.9);
            break;
        default: // square
            ctx.fillRect(col, row, 1, 1);
    }
}

async function downloadQR() {
    const qrCanvas = document.getElementById('qr-result-canvas');
    if (!qrCanvas) return;

    const bizName = qrBizNameInput.value || "Business Name";
    const text = qrUrlInput.value || "https://melaninmaps.africa";
    const fgColor = isPro ? qrFgColorInput.value : "#000000";
    const bgColor = isPro ? qrBgColorInput.value : "#FFFFFF";

    let logoToUse = "";
    if (isPro && customLogoFileUrl) {
        logoToUse = customLogoFileUrl;
    } else if (includeLogoCheckbox.checked && currentLogoUrl) {
        logoToUse = currentLogoUrl;
    }

    // Create high-res canvas (1200x1600 for a professional look)
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    // White Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Logo (if exists)
    let currentY = 120;
    if (logoToUse) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = logoToUse;
        await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = () => {
                console.warn("Logo failed to load for download, skipping.");
                resolve();
            };
        });

        const logoSize = 250;
        const x = (canvas.width - logoSize) / 2;
        ctx.drawImage(logoImg, x, currentY, logoSize, logoSize);
        currentY += logoSize + 60;
    }

    // 2. Draw Business Name
    ctx.fillStyle = "#000000";
    ctx.font = "bold 80px Cinzel, serif";
    ctx.textAlign = "center";
    ctx.fillText(bizName.toUpperCase(), canvas.width / 2, currentY);
    currentY += 120;

    // 3. Draw QR Code
    const qrDisplaySize = 700;
    const qrX = (canvas.width - qrDisplaySize) / 2;

    // Draw a subtle border around QR
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX - 20, currentY - 20, qrDisplaySize + 40, qrDisplaySize + 40);

    ctx.drawImage(qrCanvas, qrX, currentY, qrDisplaySize, qrDisplaySize);
    currentY += qrDisplaySize + 100;

    // 4. Draw Destination URL
    ctx.fillStyle = "#64748b";
    ctx.font = "40px Inter, sans-serif";
    ctx.fillText(text, canvas.width / 2, currentY);
    currentY += 100;

    // 5. Draw Footer Branding
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 30px Inter, sans-serif";
    ctx.fillText("GENERATED BY MELANINMAPS™ PRO", canvas.width / 2, canvas.height - 100);

    // Download
    const sanitizedName = bizName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const link = document.createElement("a");
    link.download = `${sanitizedName}-branded-qr.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
}

function resetEditor() {
    qrFgColorInput.value = "#000000";
    qrBgColorInput.value = "#FFFFFF";
    selectedStyle = "square";
    styleOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.style === 'square') opt.classList.add('active');
    });

    customLogoFileUrl = "";
    logoPreviewImg.src = "";
    logoPreviewContainer.classList.add('hidden');
    customLogoInput.value = "";

    generateQRCode();
}

// Event Listeners
qrBizNameInput.addEventListener('input', generateQRCode);
qrUrlInput.addEventListener('input', generateQRCode);
includeLogoCheckbox.addEventListener('change', generateQRCode);
qrFgColorInput.addEventListener('input', generateQRCode);
qrBgColorInput.addEventListener('input', generateQRCode);

updateBtn.addEventListener('click', generateQRCode);
downloadBtn.addEventListener('click', downloadQR);
resetBtn.addEventListener('click', resetEditor);

styleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        if (!isPro) return;
        styleOptions.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedStyle = opt.dataset.style;
        generateQRCode();
    });
});

uploadLogoBtn.addEventListener('click', () => {
    if (isPro) customLogoInput.click();
});

customLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate File Type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert("Invalid file type. Please upload PNG, JPG, or WEBP.");
        return;
    }

    // Validate File Size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        customLogoFileUrl = event.target.result;
        logoPreviewImg.src = customLogoFileUrl;
        logoPreviewContainer.classList.remove('hidden');
        generateQRCode();
    };
    reader.readAsDataURL(file);
});

removeLogoBtn.addEventListener('click', () => {
    customLogoFileUrl = "";
    logoPreviewImg.src = "";
    logoPreviewContainer.classList.add('hidden');
    customLogoInput.value = "";
    generateQRCode();
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}
