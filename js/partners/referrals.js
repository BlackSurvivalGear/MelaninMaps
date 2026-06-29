import { db, auth } from "../auth.js";
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        setupReferralsListener(user.uid);
    }
});

function setupReferralsListener(uid) {
    const tableBody = document.getElementById('referrals-table-body');
    if (!tableBody) return;

    const referralsQuery = query(
        collection(db, "partnerReferrals"),
        where("partnerId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(referralsQuery, (snapshot) => {
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No referrals yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');

            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'N/A';
            const commission = data.commission ? `£${data.commission.toFixed(2)}` : '£0.00';

            tr.innerHTML = `
                <td><strong>${data.businessName || 'Pending...'}</strong></td>
                <td>${data.country || 'N/A'}</td>
                <td>${date}</td>
                <td><span class="badge badge-status-${data.status || 'registered'}">${data.status || 'Registered'}</span></td>
                <td>${data.plan || 'Preview'}</td>
                <td>${commission}</td>
            `;
            tableBody.appendChild(tr);
        });
    });
}
