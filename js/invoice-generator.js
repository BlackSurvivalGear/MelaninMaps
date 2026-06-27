import { auth, db, signOut } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const lineItemsContainer = document.getElementById('line-items');
const addItemBtn = document.getElementById('add-item-btn');
const previewBtn = document.getElementById('preview-invoice-btn');
const downloadBtn = document.getElementById('download-pdf-btn');
const previewContainer = document.getElementById('invoice-preview-container');
const logoutBtn = document.getElementById("logout-btn");

// Populate initial business data from Firestore
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            const userPlan = userDoc.exists() ? userDoc.data().plan : "preview";

            if (userPlan !== "pro") {
                window.location.href = "toolkit.html"; // Restricted access
                return;
            }

            const bizDocRef = doc(db, "businesses", user.uid);
            const bizDoc = await getDoc(bizDocRef);

            if (bizDoc.exists()) {
                const data = bizDoc.data();
                document.getElementById('from-name').value = data.businessName || "";
                document.getElementById('from-email').value = user.email || "";
                document.getElementById('from-address').value = data.address || "";

                if (data.currencySymbol) {
                    const currencySelect = document.getElementById('inv-currency');
                    // Add logic to select matching option if exists
                    for (let i = 0; i < currencySelect.options.length; i++) {
                        if (currencySelect.options[i].value === data.currencySymbol) {
                            currencySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching business data:", error);
        }
    }
});

function addLineItem() {
    const row = document.createElement('div');
    row.className = 'line-item-row';
    row.innerHTML = `
        <div class="form-group" style="margin-bottom:0">
            <input placeholder="Description" class="line-desc">
        </div>
        <div class="form-group" style="margin-bottom:0">
            <input type="number" placeholder="Qty" min="0" step="1" class="line-qty">
        </div>
        <div class="form-group" style="margin-bottom:0">
            <input type="number" placeholder="Rate" min="0" step="0.01" class="line-rate">
        </div>
        <button type="button" class="remove-item-btn" title="Remove Item">&times;</button>
    `;

    row.querySelector('.remove-item-btn').addEventListener('click', () => {
        row.remove();
    });

    lineItemsContainer.appendChild(row);
}

function renderInvoice() {
    const cur = document.getElementById('inv-currency').value;
    const fromName = document.getElementById('from-name').value || 'Your Business';
    const fromEmail = document.getElementById('from-email').value;
    const fromAddr = document.getElementById('from-address').value;
    const toName = document.getElementById('to-name').value || 'Client Name';
    const toEmail = document.getElementById('to-email').value;
    const toAddr = document.getElementById('to-address').value;
    const invNum = document.getElementById('inv-number').value || '001';
    const invDate = document.getElementById('inv-date').value || new Date().toISOString().slice(0, 10);
    const invDue = document.getElementById('inv-due').value || '';
    const notes = document.getElementById('inv-notes').value;

    const rows = document.querySelectorAll('.line-item-row');
    let items = [];
    let subtotal = 0;

    rows.forEach(r => {
        const desc = r.querySelector('.line-desc').value || 'Item';
        const qty = parseFloat(r.querySelector('.line-qty').value) || 0;
        const rate = parseFloat(r.querySelector('.line-rate').value) || 0;
        const amount = qty * rate;
        subtotal += amount;
        items.push({ desc, qty, rate, amount });
    });

    const nl = (s) => s ? s.replace(/\n/g, '<br>') : '';

    let html = `
    <div id="inv-pdf-target" style="font-family:'Inter', sans-serif; max-width:800px; margin:auto; padding:50px; background:#fff; color:#0f172a;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px;">
            <div>
                <h1 style="font-size:32px; font-weight:800; color:#0f172a; margin:0 0 8px 0; font-family:'Inter', sans-serif;">INVOICE</h1>
                <p style="color:#64748b; font-size:14px; margin:0; font-weight:600;">Ref: #${invNum}</p>
            </div>
            <div style="text-align:right;">
                <p style="font-weight:800; color:#0f172a; margin:0; font-size:16px;">${fromName}</p>
                ${fromEmail ? '<p style="color:#64748b; font-size:13px; margin:4px 0;">' + fromEmail + '</p>' : ''}
                ${fromAddr ? '<p style="color:#64748b; font-size:13px; margin:4px 0; line-height:1.5;">' + nl(fromAddr) + '</p>' : ''}
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:40px; padding:24px; background:#f8fafc; border-radius:12px;">
            <div>
                <p style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin:0 0 8px 0; letter-spacing:0.05em;">Bill To</p>
                <p style="font-weight:800; color:#0f172a; margin:0; font-size:15px;">${toName}</p>
                ${toEmail ? '<p style="color:#64748b; font-size:13px; margin:4px 0;">' + toEmail + '</p>' : ''}
                ${toAddr ? '<p style="color:#64748b; font-size:13px; margin:4px 0; line-height:1.5;">' + nl(toAddr) + '</p>' : ''}
            </div>
            <div style="text-align:right;">
                <div style="margin-bottom:8px;">
                    <p style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin:0; letter-spacing:0.05em;">Date Issued</p>
                    <p style="font-size:14px; color:#0f172a; font-weight:600; margin:2px 0;">${invDate}</p>
                </div>
                ${invDue ? `
                <div>
                    <p style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin:0; letter-spacing:0.05em;">Due Date</p>
                    <p style="font-size:14px; color:#ef4444; font-weight:700; margin:2px 0;">${invDue}</p>
                </div>` : ''}
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:32px;">
            <thead>
                <tr>
                    <th style="text-align:left; padding:12px 16px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; letter-spacing:0.05em;">Description</th>
                    <th style="text-align:center; padding:12px 16px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; letter-spacing:0.05em;">Qty</th>
                    <th style="text-align:right; padding:12px 16px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; letter-spacing:0.05em;">Rate</th>
                    <th style="text-align:right; padding:12px 16px; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; border-bottom:2px solid #e2e8f0; letter-spacing:0.05em;">Amount</th>
                </tr>
            </thead>
            <tbody>`;

    items.forEach(item => {
        html += `
            <tr>
                <td style="padding:16px; border-bottom:1px solid #f1f5f9; font-size:14px;">${item.desc}</td>
                <td style="padding:16px; text-align:center; border-bottom:1px solid #f1f5f9; font-size:14px;">${item.qty}</td>
                <td style="padding:16px; text-align:right; border-bottom:1px solid #f1f5f9; font-size:14px;">${cur}${item.rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="padding:16px; text-align:right; border-bottom:1px solid #f1f5f9; font-weight:700; font-size:14px;">${cur}${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>`;
    });

    html += `
            </tbody>
        </table>

        <div style="display:flex; justify-content:flex-end; margin-bottom:40px;">
            <div style="width:280px;">
                <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #f1f5f9;">
                    <span style="color:#64748b; font-weight:600; font-size:14px;">Subtotal</span>
                    <span style="font-weight:700; color:#0f172a;">${cur}${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div style="display:flex; justify-content:space-between; padding:20px 0; border-top:2px solid #0f172a; margin-top:4px;">
                    <span style="font-weight:800; color:#0f172a; font-size:18px; text-transform:uppercase; letter-spacing:0.05em;">Total</span>
                    <span style="font-weight:800; color:#D4AF37; font-size:24px;">${cur}${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>

        ${notes ? `
        <div style="background:#f8fafc; border-radius:12px; padding:24px; border-left:4px solid #D4AF37;">
            <p style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin:0 0 8px 0; letter-spacing:0.05em;">Notes & Payment Terms</p>
            <p style="color:#64748b; font-size:13px; margin:0; line-height:1.6;">${nl(notes)}</p>
        </div>` : ''}

        <div style="margin-top:60px; text-align:center; border-top:1px solid #f1f5f9; padding-top:24px;">
            <p style="color:#94a3b8; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; font-weight:600;">Powered by MelaninMaps™ Pro</p>
        </div>
    </div>`;

    previewContainer.innerHTML = html;
    downloadBtn.classList.remove('hidden');

    // Scroll to preview
    previewContainer.scrollIntoView({ behavior: 'smooth' });
}

function downloadPDF() {
    const el = document.getElementById('inv-pdf-target');
    if (!el) return;

    const invNum = document.getElementById('inv-number').value || '001';

    const opt = {
        margin: 0,
        filename: `invoice-${invNum}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    downloadBtn.disabled = true;
    downloadBtn.innerText = "Generating PDF...";

    html2pdf().set(opt).from(el).save().then(() => {
        downloadBtn.disabled = false;
        downloadBtn.innerText = "Download PDF";
    });
}

// Event Listeners
addItemBtn.addEventListener('click', addLineItem);
previewBtn.addEventListener('click', renderInvoice);
downloadBtn.addEventListener('click', downloadPDF);

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

// Init
addLineItem();
document.getElementById('inv-date').valueAsDate = new Date();
