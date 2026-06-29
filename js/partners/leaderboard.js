import { db } from "../auth.js";
import {
    collection,
    query,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

function setupLeaderboard() {
    const tableBody = document.getElementById('leaderboard-body');
    if (!tableBody) return;

    const q = query(
        collection(db, "partners"),
        orderBy("totalBusinesses", "desc"),
        limit(50)
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No rankings available.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');

            let rankClass = '';
            if (rank === 1) rankClass = 'rank-top-1';
            else if (rank === 2) rankClass = 'rank-top-2';
            else if (rank === 3) rankClass = 'rank-top-3';

            tr.innerHTML = `
                <td class="leaderboard-rank ${rankClass}">${rank}</td>
                <td><strong>${data.fullName || 'Anonymous'}</strong></td>
                <td>${data.totalBusinesses || 0}</td>
                <td>${data.totalProBusinesses || 0}</td>
                <td>£${(data.commissionEarned || 0).toFixed(2)}</td>
            `;
            tableBody.appendChild(tr);
            rank++;
        });
    });
}

setupLeaderboard();
