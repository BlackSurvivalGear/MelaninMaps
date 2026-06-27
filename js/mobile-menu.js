document.addEventListener("DOMContentLoaded", () => {
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
        link.addEventListener("click", () => {
            mobileMenuOverlay.classList.remove("active");
            document.body.style.overflow = "";
        });
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

    // Helper to apply theme (matches logic in map.js but made global-safe)
    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        document.body.classList.add('melaninmaps-theme');
        localStorage.setItem("melaninMapsTheme", theme);

        // Dispatch event for map.js if it's listening or just rely on localStorage
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));

        // Also update desktop buttons if they exist
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
