const NAV_DRAWER_HTML = `
<div id="mobile-menu-overlay" class="mobile-menu-overlay">
    <div class="mobile-menu-content">
        <button id="close-mobile-menu" class="close-menu">&times;</button>
        <div class="mobile-menu-links">
            <a href="index.html">Home</a>
            <a href="melanin-map.html">Explore Map</a>
            <a href="melanin-map.html#categories">Categories</a>
            <a href="dashboard.html" class="auth-only hidden">Dashboard</a>
            <a href="restaurant.html?edit=true" class="auth-only hidden">Business Profile</a>
            <a href="dashboard.html#qr-code" class="auth-only hidden">QR Codes</a>
            <a href="toolkit.html" class="auth-only hidden pro-only hidden">Business Toolkit</a>
            <a href="pricing.html">Plans & Pricing</a>
            <a href="login.html" class="guest-only">Sign In</a>
            <a href="login.html?mode=register" class="guest-only">Create Account</a>
            <a href="#" id="mobile-logout-btn" class="auth-only hidden">Logout</a>

            <div class="mobile-theme-toggle" style="margin-top: 2rem;">
                <div class="theme-toggle-container">
                    <button id="mobile-theme-dark-btn" class="theme-btn">🌙 Dark</button>
                    <button id="mobile-theme-standard-btn" class="theme-btn">☀ Standard</button>
                </div>
            </div>
        </div>
    </div>
</div>
`;

import { auth, db, signOut } from "./auth.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    // Inject Navigation Drawer if not present
    if (!document.getElementById("mobile-menu-overlay")) {
        document.body.insertAdjacentHTML('beforeend', NAV_DRAWER_HTML);
    }

    const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
    const closeMobileMenu = document.getElementById("close-mobile-menu");
    const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");

    if (mobileMenuToggle && mobileMenuOverlay) {
        mobileMenuToggle.addEventListener("click", () => {
            mobileMenuOverlay.classList.add("active");
            document.body.style.overflow = "hidden"; // Prevent scrolling when menu is open
        });
    }

    if (closeMobileMenu && mobileMenuOverlay) {
        closeMobileMenu.addEventListener("click", () => {
            mobileMenuOverlay.classList.remove("active");
            document.body.style.overflow = ""; // Restore scrolling
        });
    }

    // Close menu when clicking on a link
    const mobileMenuLinks = document.querySelectorAll(".mobile-menu-links a");
    mobileMenuLinks.forEach(link => {
        if (link.id !== 'mobile-logout-btn') {
            link.addEventListener("click", () => {
                mobileMenuOverlay.classList.remove("active");
                document.body.style.overflow = "";
            });
        }
    });

    // Handle Logout
    const mobileLogoutBtn = document.getElementById("mobile-logout-btn");
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = "index.html";
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }

    // Auth State Handling for Menu
    onAuthStateChanged(auth, async (user) => {
        const authOnlyLinks = document.querySelectorAll(".auth-only");
        const guestOnlyLinks = document.querySelectorAll(".guest-only");
        const proOnlyLinks = document.querySelectorAll(".pro-only");

        if (user) {
            authOnlyLinks.forEach(link => link.classList.remove("hidden"));
            guestOnlyLinks.forEach(link => link.classList.add("hidden"));

            // Check for Pro status
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists() && userDoc.data().plan === 'pro') {
                    proOnlyLinks.forEach(link => link.classList.remove("hidden"));
                } else {
                    proOnlyLinks.forEach(link => link.classList.add("hidden"));
                }
            } catch (error) {
                console.error("Error checking user plan:", error);
            }
        } else {
            authOnlyLinks.forEach(link => link.classList.add("hidden"));
            guestOnlyLinks.forEach(link => link.classList.remove("hidden"));
        }
    });

    // Theme toggle in mobile menu
    const mobileDarkBtn = document.getElementById('mobile-theme-dark-btn');
    const mobileStandardBtn = document.getElementById('mobile-theme-standard-btn');

    if (mobileDarkBtn && mobileStandardBtn) {
        // Sync with existing theme
        const currentTheme = localStorage.getItem("melaninMapsTheme") || 'dark';
        updateMobileThemeButtons(currentTheme);

        mobileDarkBtn.addEventListener('click', () => {
            applyTheme('dark');
            updateMobileThemeButtons('dark');
        });

        mobileStandardBtn.addEventListener('click', () => {
            applyTheme('standard');
            updateMobileThemeButtons('standard');
        });
    }

    function updateMobileThemeButtons(theme) {
        if (theme === 'dark') {
            mobileDarkBtn.classList.add('active');
            mobileStandardBtn.classList.remove('active');
        } else {
            mobileStandardBtn.classList.add('active');
            mobileDarkBtn.classList.remove('active');
        }
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        document.body.classList.add('melaninmaps-theme');
        localStorage.setItem("melaninMapsTheme", theme);
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));

        const darkBtn = document.getElementById('theme-dark-btn');
        const standardBtn = document.getElementById('theme-standard-btn');
        if (darkBtn && standardBtn) {
            if (theme === 'dark') {
                darkBtn.classList.add('active');
                standardBtn.classList.remove('active');
            } else {
                standardBtn.classList.add('active');
                darkBtn.classList.remove('active');
            }
        }
    }
});
