import { auth, db, signOut } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const proOverlay = document.getElementById("pro-upgrade-overlay");
const toolkitContent = document.getElementById("toolkit-content");
const logoutBtn = document.getElementById("logout-btn");

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            // Fetch User Account Info to check plan
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            let userPlan = "preview";
            if (userDoc.exists()) {
                userPlan = userDoc.data().plan || "preview";
            }

            if (userPlan !== "pro") {
                // Not a Pro user, show upgrade message and blur content
                proOverlay.classList.remove("hidden");
                toolkitContent.classList.add("blurred-content");
            } else {
                // Pro user, allow access
                proOverlay.classList.add("hidden");
                toolkitContent.classList.remove("blurred-content");
            }

        } catch (error) {
            console.error("Error checking subscription status:", error);
            // Default to restricted if check fails
            proOverlay.classList.remove("hidden");
            toolkitContent.classList.add("blurred-content");
        }
    } else {
        // Not logged in, redirect to login page (auth.js usually handles this but safety first)
        window.location.href = "login.html";
    }
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
