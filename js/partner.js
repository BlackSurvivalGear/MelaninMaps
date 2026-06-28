import { auth, db } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { generateAffiliateId, generateReferralCode } from "./affiliate-utils.js";

const regSection = document.getElementById("partner-registration");
const dashboardSection = document.getElementById("partner-dashboard");
const joinBtn = document.getElementById("join-partner-btn");

onAuthStateChanged(auth, async (user) => {
    if (user) {
        checkPartnerStatus(user);
    } else {
        window.location.href = "login.html";
    }
});

async function checkPartnerStatus(user) {
    const affiliateRef = doc(db, "affiliates", user.uid);
    const docSnap = await getDoc(affiliateRef);

    if (docSnap.exists()) {
        showDashboard(docSnap.data());
    } else {
        regSection.classList.remove("hidden");
    }
}

joinBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    joinBtn.disabled = true;
    joinBtn.innerHTML = '<div class="loader"></div>';

    try {
        const affiliateId = generateAffiliateId();
        // Use part of email for initial referral code
        const baseName = user.email.split('@')[0];
        const referralCode = generateReferralCode(baseName);

        const affiliateData = {
            affiliateId: affiliateId,
            uid: user.uid,
            name: user.displayName || baseName,
            email: user.email,
            referralCode: referralCode,
            totalClicks: 0,
            totalBusinesses: 0,
            pendingCommission: 0,
            paidCommission: 0,
            lifetimeCommission: 0,
            paypal: "",
            bankDetails: "",
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, "affiliates", user.uid), affiliateData);
        regSection.classList.add("hidden");
        showDashboard(affiliateData);
    } catch (error) {
        console.error("Error creating affiliate account:", error);
        alert("Failed to activate partner account. Please try again.");
    } finally {
        joinBtn.disabled = false;
        joinBtn.innerText = "Activate Partner Account";
    }
});

function showDashboard(affiliateData) {
    dashboardSection.classList.remove("hidden");

    // Set static info
    document.getElementById("display-ref-code").innerText = affiliateData.referralCode;
    const refLink = `${window.location.origin}/login.html?mode=register&ref=${affiliateData.referralCode}`;
    document.getElementById("display-ref-link").innerText = refLink;

    // Initialize tab switching
    initTabs();

    // Setup real-time listeners
    setupListeners(affiliateData.uid, affiliateData.referralCode);

    // Copy link functionality
    document.getElementById("copy-ref-link").addEventListener("click", () => {
        navigator.clipboard.writeText(refLink);
        alert("Referral link copied to clipboard!");
    });
}

function setupListeners(uid, referralCode) {
    // Affiliate Doc Listener
    onSnapshot(doc(db, "affiliates", uid), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            document.getElementById("stat-clicks").innerText = data.totalClicks || 0;
            document.getElementById("stat-referred").innerText = data.totalBusinesses || 0;
            document.getElementById("earn-pending").innerText = `£${(data.pendingCommission || 0).toFixed(2)}`;
            document.getElementById("earn-paid").innerText = `£${(data.paidCommission || 0).toFixed(2)}`;
            document.getElementById("earn-lifetime").innerText = `£${(data.lifetimeCommission || 0).toFixed(2)}`;
        }
    });

    // Referrals Listener (using the new referrals collection)
    const referralsQuery = query(
        collection(db, "referrals"),
        where("affiliateId", "==", uid),
        orderBy("joinedAt", "desc")
    );

    onSnapshot(referralsQuery, (snapshot) => {
        const tableBody = document.getElementById("referrals-table-body");

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No referrals yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement("tr");
            const joinedAt = data.joinedAt ? data.joinedAt.toDate().toLocaleDateString() : "N/A";

            tr.innerHTML = `
                <td><strong>${data.businessName || "Pending Profile"}</strong></td>
                <td>${joinedAt}</td>
                <td><span class="badge ${data.subscription === 'Pro' ? 'badge-featured' : ''}">${data.subscription || 'Preview'}</span></td>
                <td>${data.status}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Update Paid Subscriptions stat (those with Pro subscription in referral doc)
        const paidCount = snapshot.docs.filter(d => d.data().subscription === 'Pro').length;
        document.getElementById("stat-paid-subs").innerText = paidCount;
    });

    // Commissions Listener
    const commissionsQuery = query(
        collection(db, "commissions"),
        where("affiliateId", "==", uid),
        orderBy("createdAt", "desc")
    );

    onSnapshot(commissionsQuery, (snapshot) => {
        const tableBody = document.getElementById("commissions-table-body");

        if (snapshot.empty) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No commissions earned yet.</td></tr>';
            return;
        }

        tableBody.innerHTML = "";
        snapshot.forEach(async (comDoc) => {
            const data = comDoc.data();
            const tr = document.createElement("tr");
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : "N/A";

            // Get business name (ideally this should be in the commission doc as per spec)
            const bizName = data.businessName || "Business";

            tr.innerHTML = `
                <td>${bizName}</td>
                <td>${data.subscription || 'Pro'}</td>
                <td>£${(data.commission || 0).toFixed(2)}</td>
                <td><span class="badge ${data.status === 'Paid' ? 'badge-available' : 'badge-preview'}">${data.status}</span></td>
                <td>${date}</td>
                <td><small>${data.source || 'web'}</small></td>
            `;
            tableBody.appendChild(tr);
        });
    });
}

function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-tab");

            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            tabContents.forEach(content => {
                if (content.id === target) {
                    content.classList.remove("hidden");
                } else {
                    content.classList.add("hidden");
                }
            });
        });
    });
}
