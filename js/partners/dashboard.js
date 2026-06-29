import { auth, db } from "../auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    doc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        initDashboard(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

function initDashboard(uid) {
    // Partner Doc Listener
    onSnapshot(doc(db, "partners", uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            updateUI(data);
            generateReferralQR(data.referralCode);
        }
    });

    // Tab Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(c => c.classList.add('hidden'));
            document.getElementById(target).classList.remove('hidden');
        });
    });

    // Copy Link Logic
    document.getElementById('copy-ref-link').addEventListener('click', () => {
        const link = document.getElementById('display-ref-link').innerText;
        navigator.clipboard.writeText(link).then(() => {
            alert('Referral link copied to clipboard!');
        });
    });
}

function updateUI(data) {
    document.getElementById('partner-name').innerText = data.fullName || 'Partner';
    document.getElementById('partner-id').innerText = data.partnerId || 'MMP------';
    document.getElementById('display-ref-link').innerText = `${window.location.origin}/register.html?ref=${data.referralCode}`;

    // Stats
    document.getElementById('stat-referred').innerText = data.totalBusinesses || 0;
    document.getElementById('stat-published').innerText = data.totalPublished || 0; // Assuming totalPublished is tracked
    document.getElementById('stat-pro').innerText = data.totalProBusinesses || 0;

    const conversion = data.totalBusinesses > 0
        ? ((data.totalProBusinesses / data.totalBusinesses) * 100).toFixed(1)
        : 0;
    document.getElementById('stat-conversion').innerText = `${conversion}%`;

    // Earnings
    document.getElementById('earn-earned').innerText = `£${(data.commissionEarned || 0).toFixed(2)}`;
    document.getElementById('earn-pending').innerText = `£${(data.pendingCommission || 0).toFixed(2)}`;
    document.getElementById('earn-paid').innerText = `£${(data.paidCommission || 0).toFixed(2)}`;

    // Calculate and update Partner Level
    const totalBusinesses = data.totalBusinesses || 0;
    let level = 'Bronze';
    if (totalBusinesses >= 500) level = 'Diamond';
    else if (totalBusinesses >= 250) level = 'Platinum';
    else if (totalBusinesses >= 100) level = 'Gold';
    else if (totalBusinesses >= 25) level = 'Silver';

    // Level
    const levelBadge = document.getElementById('partner-level');
    levelBadge.innerText = `${level} Level`;

    // Level Badge Colors
    const colors = {
        'Bronze': '#CD7F32',
        'Silver': '#C0C0C0',
        'Gold': '#FFD700',
        'Platinum': '#E5E4E2',
        'Diamond': '#B9F2FF'
    };
    levelBadge.style.backgroundColor = colors[level] || '#CD7F32';
    levelBadge.style.color = 'black';

    // Update level in Firestore if it changed
    if (level !== data.level) {
        updateDoc(doc(db, "partners", data.uid), { level: level }).catch(console.error);
    }
}

function generateReferralQR(code) {
    if (!code) return;
    const link = `${window.location.origin}/register.html?ref=${code}`;
    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = '';

    // qrcode-generator library (included in HTML)
    const typeNumber = 0;
    const errorCorrectionLevel = 'H';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(link);
    qr.make();
    qrContainer.innerHTML = qr.createImgTag(5);

    document.getElementById('download-qr-btn').onclick = () => {
        const img = qrContainer.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 250;
        canvas.height = img.naturalHeight || 250;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const downloadLink = document.createElement('a');
        downloadLink.download = `melaninmaps-ref-${code}.png`;
        downloadLink.href = canvas.toDataURL('image/png');
        downloadLink.click();
    };
}
