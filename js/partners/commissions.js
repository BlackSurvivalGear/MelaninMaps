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
        setupCommissionsListener(user.uid);
    }
});

function setupCommissionsListener(uid) {
    const tableBody = document.getElementById('commissions-table-body');
    if (!tableBody) return;

    // In a real application, we would have a 'commissions' collection
    // For now, let's group by month from partnerReferrals if commissions are not separate
    const q = query(
        collection(db, "commissions"),
        where("partnerId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No history yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');

            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'N/A';

            tr.innerHTML = `
                <td>${date}</td>
                <td>${data.referralCount || 0}</td>
                <td>${data.proCount || 0}</td>
                <td>£${(data.amount || 0).toFixed(2)}</td>
                <td><span class="badge badge-status-${data.status.toLowerCase()}">${data.status}</span></td>
            `;
            tableBody.appendChild(tr);
        });
    });
}
