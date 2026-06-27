import { auth, db, signOut } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import qrcode from "./qrcode.js";

const qrBizNameInput = document.getElementById('qr-biz-name');
const qrUrlInput = document.getElementById('qr-url');
const includeLogoCheckbox = document.getElementById('include-logo');
const updateBtn = document.getElementById('update-qr-btn');
const downloadBtn = document.getElementById('download-qr-btn');
const canvasHolder = document.getElementById('qr-canvas-holder');
const previewLogo = document.getElementById('preview-logo');
const previewBizName = document.getElementById('preview-biz-name');
const previewUrl = document.getElementById('preview-url');
const logoutBtn = document.getElementById("logout-btn");

let currentLogoUrl = "";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userPlan = userDoc.exists() ? userDoc.data().plan : "preview";

            if (userPlan !== "pro") {
                window.location.href = "toolkit.html";
                return;
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

function generateQRCode() {
    const text = qrUrlInput.value || "https://melaninmaps.africa";
    const bizName = qrBizNameInput.value || "Business Name";
    const showLogo = includeLogoCheckbox.checked;

    try {
        const qr = qrcode(0, 'H');
        qr.addData(text);
        qr.make();

        const cellSize = 8;
        const margin = 20;
        const qrSize = qr.getModuleCount();

        const canvas = document.createElement('canvas');
        canvas.id = "qr-result-canvas";
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code scaled to fit
        const scale = (300 - margin * 2) / (qrSize * cellSize);
        ctx.save();
        ctx.translate(margin, margin);
        ctx.scale(scale * cellSize, scale * cellSize);

        for (let row = 0; row < qrSize; row++) {
            for (let col = 0; col < qrSize; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(col, row, 1, 1);
                }
            }
        }
        ctx.restore();

        // Update UI
        canvasHolder.innerHTML = "";
        canvasHolder.appendChild(canvas);

        previewBizName.textContent = bizName;
        previewUrl.textContent = text;

        if (showLogo && currentLogoUrl) {
            previewLogo.src = currentLogoUrl;
            previewLogo.classList.remove('hidden');
        } else {
            previewLogo.classList.add('hidden');
        }

    } catch (error) {
        console.error("QR Generation Error:", error);
    }
}

function downloadQR() {
    const canvas = document.getElementById('qr-result-canvas');
    if (!canvas) return;

    // To provide a full branded card download, we'd need to draw the whole card to a large canvas.
    // For now, we follow the existing behavior of downloading the QR code itself.

    const bizName = qrBizNameInput.value || "restaurant";
    const sanitizedName = bizName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const link = document.createElement("a");
    link.download = `${sanitizedName}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
}

updateBtn.addEventListener('click', generateQRCode);
downloadBtn.addEventListener('click', downloadQR);

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
