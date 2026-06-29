import { auth, db } from "../auth.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
    query,
    collection,
    where,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

/**
 * Generates a unique Partner ID
 * Format: MMP + 6 digits
 */
async function generatePartnerId() {
    let partnerId = '';
    let exists = true;

    while (exists) {
        const randomNum = Math.floor(100000 + Math.random() * 899999);
        partnerId = `MMP${randomNum}`;

        const q = query(collection(db, "partners"), where("partnerId", "==", partnerId), limit(1));
        const querySnapshot = await getDocs(q);
        exists = !querySnapshot.empty;
    }

    return partnerId;
}

/**
 * Generates a unique Referral Code
 */
function generateReferralCode(name) {
    const cleanName = name ? name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5) : 'MAPS';
    const randomSuffix = Math.floor(100 + Math.random() * 899);
    return `${cleanName}${randomSuffix}`;
}

// Form Listeners
const loginForm = document.getElementById('partner-login-form');
const registerForm = document.getElementById('partner-register-form');
const errorMessage = document.getElementById('error-message');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const submitBtn = document.getElementById('auth-submit-btn');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        setLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if user is actually a partner
            const partnerDoc = await getDoc(doc(db, "partners", user.uid));
            if (partnerDoc.exists()) {
                window.location.href = 'dashboard.html';
            } else {
                await signOut(auth);
                throw { code: 'auth/not-a-partner', message: 'This account is not registered as a Partner.' };
            }
        } catch (error) {
            showError(error.message || 'Login failed');
            setLoading(false);
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const mobile = document.getElementById('mobile').value;
        const country = document.getElementById('country').value;
        const city = document.getElementById('city').value;
        const referralName = document.getElementById('referralName').value;

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const partnerId = await generatePartnerId();
            const referralCode = generateReferralCode(fullName);

            const partnerData = {
                uid: user.uid,
                partnerId: partnerId,
                fullName: fullName,
                email: email,
                mobile: mobile,
                country: country,
                city: city,
                referralName: referralName,
                referralCode: referralCode,
                status: 'active', // Default to active for now as per requirements
                level: 'Bronze',
                commissionEarned: 0,
                pendingCommission: 0,
                paidCommission: 0,
                totalBusinesses: 0,
                totalProBusinesses: 0,
                createdAt: serverTimestamp()
            };

            await setDoc(doc(db, "partners", user.uid), partnerData);

            // Also create public referral code mapping
            await setDoc(doc(db, "referralCodes", referralCode), {
                uid: user.uid,
                type: 'partner',
                createdAt: serverTimestamp()
            });

            window.location.href = 'dashboard.html';
        } catch (error) {
            showError(error.message || 'Registration failed');
            setLoading(false);
        }
    });
}

// UI Helpers
function setLoading(isLoading) {
    if (isLoading) {
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');
        submitBtn.disabled = true;
        errorMessage.classList.add('hidden');
    } else {
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function showError(message) {
    errorMessage.innerText = message;
    errorMessage.classList.remove('hidden');
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'login.html';
    });
}

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html') || path.includes('register.html');

    if (user) {
        if (isLoginPage) {
            const partnerDoc = await getDoc(doc(db, "partners", user.uid));
            if (partnerDoc.exists()) {
                window.location.href = 'dashboard.html';
            }
        }
    } else {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});
