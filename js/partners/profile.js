import { auth, db } from "../auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        loadProfile(user.uid);
    }
});

async function loadProfile(uid) {
    const docSnap = await getDoc(doc(db, "partners", uid));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('fullName').value = data.fullName || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('mobile').value = data.mobile || '';
        document.getElementById('country').value = data.country || '';
        document.getElementById('city').value = data.city || '';
        document.getElementById('paymentDetails').value = data.paymentDetails || '';
        document.getElementById('instagram').value = data.instagram || '';
        document.getElementById('twitter').value = data.twitter || '';
    }
}

const profileForm = document.getElementById('partner-profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const submitBtn = profileForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving...';

        try {
            const updateData = {
                fullName: document.getElementById('fullName').value,
                mobile: document.getElementById('mobile').value,
                country: document.getElementById('country').value,
                city: document.getElementById('city').value,
                paymentDetails: document.getElementById('paymentDetails').value,
                instagram: document.getElementById('instagram').value,
                twitter: document.getElementById('twitter').value,
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, "partners", user.uid), updateData);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Failed to update profile.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Save Changes';
        }
    });
}
