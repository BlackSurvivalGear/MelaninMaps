import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import { COUNTRIES } from "./countries.js";
import { DIASPORA_COMMUNITIES, EVENTS, PUBLIC_TRANSPORT, CONNECTIVITY, TOURIST_HIGHLIGHTS } from "./overlays-data.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Map State
let map;
let tileLayer;
let markerCluster;
let businesses = [];
let currentTheme = 'dark'; // Default theme

// Overlay Layers
let diasporaLayer;
let eventsLayer;
let transportLayer;
let connectivityLayer;
let touristLayer;
let trustedLayer;

let activeLayersState = {
    selectedCategory: 'food',
    activeOverlays: []
};

const CATEGORY_MAP = {
    'food': ['Restaurant', 'Cafe', 'Bakery', 'Bar', 'Food Truck', 'Food Vendor', 'Catering', 'Takeaway', 'Dessert Shop', 'Juice Bar'],
    'shopping': ['Grocery Store', 'Market', 'Fashion', 'Beauty', 'Bookstore', 'Electronics', 'Home', 'Artisan', 'Gifts', 'Convenience Store'],
    'accommodation': ['Hotel', 'Guest House', 'Resort', 'Apartment', 'Hostel', 'Lodge', 'Holiday Rental'],
    'culture': ['Museum', 'Gallery', 'Cultural Centre', 'Historic Site', 'Library'],
    'entertainment': ['Nightclub', 'Live Music', 'Theatre', 'Cinema', 'Comedy Club', 'Festival', 'Event Venue'],
    'travel': ['Tour Operator', 'Travel Agency', 'Car Hire', 'Tourist Attraction', 'Safari', 'Boat Tour'],
    'health': ['Hospital', 'Clinic', 'Pharmacy', 'Dentist', 'Gym', 'Wellness', 'Massage', 'Mental Health'],
    'faith': ['Church', 'Mosque', 'Temple', 'Community Organisation', 'NGO', 'Association', 'Community Centre', 'Youth Organisation'],
    'professional': ['Lawyer', 'Accountant', 'Bank', 'Insurance', 'Real Estate', 'Recruitment', 'Consultant', 'Financial Services'],
    'education': ['School', 'University', 'College', 'Training Centre', 'Language School', 'Tutor'],
    'automotive': ['Mechanic', 'Car Dealer', 'Car Wash', 'Fuel Station', 'Auto Parts', 'Vehicle Hire']
};

// DOM Elements
const searchInput = document.getElementById('search-input');
const countryFilter = document.getElementById('country-filter');
const cityFilter = document.getElementById('city-filter');
const cuisineFilter = document.getElementById('cuisine-filter');
const applyFiltersBtn = document.getElementById('apply-filters');
const nearMeBtn = document.getElementById('near-me-btn');
const fullscreenBtn = document.getElementById('map-fullscreen');
const layersToggleBtn = document.getElementById('layers-toggle');
const closeLayersBtn = document.getElementById('close-layers');
const layerPanel = document.getElementById('layer-panel');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const mapContainer = document.querySelector('.map-container');

/**
 * Initialize the map
 */
function initMap() {
    // Default center (Africa context)
    map = L.map('map', {
        zoomControl: false // We will add custom zoom controls later
    }).setView([0, 20], 3);

    updateMapTiles();

    // Restore state
    const savedState = localStorage.getItem('activeLayersState');
    if (savedState) {
        activeLayersState = JSON.parse(savedState);
        updateUIFromState();
    }

    // Initial fetch
    fetchBusinesses();
}

function updateUIFromState() {
    // Update Radio Buttons
    const radios = document.querySelectorAll('input[name="business-category"]');
    radios.forEach(radio => {
        radio.checked = radio.value === activeLayersState.selectedCategory;
    });

    // Update Checkboxes
    const checkboxes = document.querySelectorAll('input[name="map-overlay"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = activeLayersState.activeOverlays.includes(checkbox.value);
    });
}

/**
 * Update map tiles based on current theme
 */
function updateMapTiles() {
    if (tileLayer) {
        map.removeLayer(tileLayer);
    }

    if (currentTheme === 'dark') {
        tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });
    } else {
        tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        });
    }

    tileLayer.addTo(map);
}

/**
 * Fetch all businesses from Firestore
 */
async function fetchBusinesses() {
    try {
        const q = query(collection(db, "businesses"));
        const querySnapshot = await getDocs(q);

        businesses = [];
        querySnapshot.forEach((doc) => {
            businesses.push({ id: doc.id, ...doc.data() });
        });

        populateCountryFilter();
        applyFilters(); // Apply initial state and overlays
    } catch (error) {
        console.error("Error fetching businesses:", error);
    }
}

/**
 * Populate country dropdown with all supported countries
 */
function populateCountryFilter() {
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    COUNTRIES.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });
}

/**
 * Render markers on the map
 */
function renderMarkers(data) {
    // Clear existing clusters
    if (markerCluster) {
        map.removeLayer(markerCluster);
    }

    markerCluster = L.markerClusterGroup();

    const selectedCategoryTags = CATEGORY_MAP[activeLayersState.selectedCategory] || [];
    const showVerifiedOnly = activeLayersState.activeOverlays.includes('verified');
    const showTrendingOnly = activeLayersState.activeOverlays.includes('trending');
    const showAccessibleOnly = activeLayersState.activeOverlays.includes('accessibility');

    // Custom Icons - Theme Aware
    const goldIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const greyIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const orangeIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    data.forEach(biz => {
        // Filter by category
        if (selectedCategoryTags.length > 0 && !selectedCategoryTags.includes(biz.category)) {
            return;
        }

        // Filter by verified if overlay active
        if (showVerifiedOnly && !biz.verified) {
            return;
        }

        // Filter by trending (using profileViews as metric)
        if (showTrendingOnly && (!biz.profileViews || biz.profileViews < 100)) {
            return;
        }

        // Filter by accessibility
        if (showAccessibleOnly && !biz.isAccessible) {
            return;
        }

        if (biz.latitude && biz.longitude) {
            let icon;
            let statusText = "Pending Verification";
            let statusClass = "status-pending";

            if (currentTheme === 'dark') {
                icon = greyIcon; // Default: Pending (Black/Grey in Dark Mode)
                if (biz.status === "location_issue") {
                    icon = redIcon;
                    statusText = "Needs Attention";
                    statusClass = "status-error";
                } else if (biz.verified) {
                    icon = goldIcon;
                    statusText = "Verified Business";
                    statusClass = "status-verified";
                }
            } else {
                icon = orangeIcon; // Default: Pending (Orange in Standard Mode)
                if (biz.status === "location_issue") {
                    icon = redIcon;
                    statusText = "Location Issue";
                    statusClass = "status-error";
                } else if (biz.verified) {
                    icon = goldIcon;
                    statusText = "Verified Business";
                    statusClass = "status-verified";
                }
            }

            const marker = L.marker([biz.latitude, biz.longitude], { icon: icon });

            const popupContent = `
                <div class="map-popup">
                    ${biz.logoUrl ? `<img src="${biz.logoUrl}" class="popup-logo">` : '<div class="popup-logo" style="display:flex;align-items:center;justify-content:center;color:#ccc;">No Logo</div>'}
                    <div class="popup-info">
                        <div class="popup-title">${biz.businessName}</div>
                        <div class="popup-meta" style="margin-bottom:0.25rem;">${biz.category} • ${biz.city}, ${biz.country}</div>
                        <div class="popup-status ${statusClass}" style="font-size:0.75rem; font-weight:700; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.25rem;">
                            <span class="status-dot"></span> ${statusText}
                        </div>
                        <div class="popup-actions">
                            <a href="business.html?id=${biz.id}" class="btn btn-primary btn-small">View Profile</a>
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}" target="_blank" class="btn btn-outline btn-small">Directions</a>
                        </div>
                        <div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.25rem; align-items:center; font-size:0.8rem;">
                            ${biz.phone ? `<a href="tel:${biz.phone}" style="color:var(--text-color); font-weight:600;">📞 ${biz.phone}</a>` : ''}
                            ${biz.website ? `<a href="${biz.website}" target="_blank" style="color:var(--primary-color); font-weight:600;">🌐 Visit Website</a>` : ''}
                        </div>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            markerCluster.addLayer(marker);
        }
    });

    map.addLayer(markerCluster);

    // If data exists, adjust view
    if (data.length > 0) {
        map.fitBounds(markerCluster.getBounds().pad(0.1));
    }
}

/**
 * Apply filters
 */
function applyFilters() {
    const search = searchInput.value.toLowerCase();
    const country = countryFilter.value;
    const city = cityFilter.value.toLowerCase();
    const cuisine = cuisineFilter.value.toLowerCase();

    const filtered = businesses.filter(biz => {
        const matchesSearch = !search || biz.businessName.toLowerCase().includes(search);
        const matchesCountry = !country || biz.country === country;
        const matchesCity = !city || (biz.city && biz.city.toLowerCase().includes(city));
        const matchesCuisine = !cuisine || (biz.cuisine && biz.cuisine.toLowerCase().includes(cuisine));
        return matchesSearch && matchesCountry && matchesCity && matchesCuisine;
    });

    renderMarkers(filtered);
    updateOverlays();
}

/**
 * Update Overlay Layers
 */
function updateOverlays() {
    // 1. Diaspora Communities
    if (diasporaLayer) map.removeLayer(diasporaLayer);
    if (activeLayersState.activeOverlays.includes('diaspora')) {
        diasporaLayer = L.geoJSON(DIASPORA_COMMUNITIES, {
            style: (feature) => ({
                fillColor: feature.properties.color || 'gold',
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.4
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;
                const popupContent = `
                    <div class="community-popup">
                        <h3 style="color:var(--primary-color); margin-bottom:0.5rem;">${props.name}</h3>
                        <p><strong>${props.city}, ${props.country}</strong></p>
                        <p style="font-size:0.9rem; margin-bottom:1rem;">${props.description}</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.85rem; margin-bottom:1rem;">
                            <span>👥 Pop: ${props.population}</span>
                            <span>🏗️ Size: ${props.size}</span>
                            <span>🏢 Biz: ${props.localBusinesses}</span>
                            <span>🍽️ Food: ${props.restaurants}</span>
                        </div>
                        <button class="btn btn-primary btn-small explore-community-btn" data-id="${feature.id}">Explore Businesses</button>
                    </div>
                `;
                layer.bindPopup(popupContent);
            }
        }).addTo(map);
    }

    // 2. Events
    if (eventsLayer) map.removeLayer(eventsLayer);
    if (activeLayersState.activeOverlays.includes('events')) {
        eventsLayer = L.layerGroup();
        const eventIcon = L.divIcon({className: 'event-marker', html: '🎉', iconSize: [24, 24]});
        EVENTS.forEach(event => {
            L.marker(event.location, {icon: eventIcon})
                .bindPopup(`<strong>${event.name}</strong><br>${event.type}<br>${event.date}`)
                .addTo(eventsLayer);
        });
        eventsLayer.addTo(map);
    }

    // 3. Transport
    if (transportLayer) map.removeLayer(transportLayer);
    if (activeLayersState.activeOverlays.includes('transport')) {
        transportLayer = L.layerGroup();
        const transportIcon = L.divIcon({className: 'transport-marker', html: '🚌', iconSize: [24, 24]});
        PUBLIC_TRANSPORT.forEach(st => {
            L.marker(st.location, {icon: transportIcon})
                .bindPopup(`<strong>${st.name}</strong><br>${st.type}`)
                .addTo(transportLayer);
        });
        transportLayer.addTo(map);
    }

    // 4. Connectivity
    if (connectivityLayer) map.removeLayer(connectivityLayer);
    if (activeLayersState.activeOverlays.includes('connectivity')) {
        connectivityLayer = L.layerGroup();
        const wifiIcon = L.divIcon({className: 'wifi-marker', html: '📶', iconSize: [24, 24]});
        CONNECTIVITY.forEach(c => {
            L.marker(c.location, {icon: wifiIcon})
                .bindPopup(`<strong>${c.name}</strong><br>${c.type}<br>WiFi: ${c.wifi}`)
                .addTo(connectivityLayer);
        });
        connectivityLayer.addTo(map);
    }

    // 5. Tourist Highlights
    if (touristLayer) map.removeLayer(touristLayer);
    if (activeLayersState.activeOverlays.includes('tourist')) {
        touristLayer = L.layerGroup();
        const tourIcon = L.divIcon({className: 'tour-marker', html: '📍', iconSize: [24, 24]});
        TOURIST_HIGHLIGHTS.forEach(h => {
            L.marker(h.location, {icon: tourIcon})
                .bindPopup(`<strong>${h.name}</strong><br>${h.type}`)
                .addTo(touristLayer);
        });
        touristLayer.addTo(map);
    }

    // 6. Trusted Communities (Using specific property or classification)
    // For now, we'll reuse the Diaspora data but filter for 'Major Community'
    if (trustedLayer) map.removeLayer(trustedLayer);
    if (activeLayersState.activeOverlays.includes('trusted')) {
        trustedLayer = L.geoJSON(DIASPORA_COMMUNITIES, {
            filter: (feature) => feature.properties.classification === "Major Community",
            style: () => ({
                fillColor: "#D4AF37",
                weight: 3,
                opacity: 1,
                color: "#D4AF37",
                fillOpacity: 0.6
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(`<strong>🛡️ Trusted Community: ${feature.properties.name}</strong><br>High engagement and verified businesses.`);
            }
        }).addTo(map);
    }
}

/**
 * Near Me functionality
 */
function nearMe() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    nearMeBtn.textContent = "⌛ Finding...";
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            map.setView([latitude, longitude], 12);
            nearMeBtn.textContent = "📍 Near Me";
        },
        () => {
            alert("Unable to retrieve your location");
            nearMeBtn.textContent = "📍 Near Me";
        }
    );
}

// Event Listeners
applyFiltersBtn.addEventListener('click', applyFilters);
nearMeBtn.addEventListener('click', nearMe);

layersToggleBtn.addEventListener('click', () => {
    layerPanel.classList.toggle('hidden');
});

closeLayersBtn.addEventListener('click', () => {
    layerPanel.classList.add('hidden');
});

document.querySelectorAll('input[name="business-category"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        activeLayersState.selectedCategory = e.target.value;
        saveAndRefresh();
    });
});

document.querySelectorAll('input[name="map-overlay"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            activeLayersState.activeOverlays.push(e.target.value);
        } else {
            activeLayersState.activeOverlays = activeLayersState.activeOverlays.filter(id => id !== e.target.value);
        }
        saveAndRefresh();
    });
});

function saveAndRefresh() {
    localStorage.setItem('activeLayersState', JSON.stringify(activeLayersState));
    applyFilters();
}

// Handle Community Explore Button
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('explore-community-btn')) {
        const communityId = e.target.dataset.id;
        const feature = DIASPORA_COMMUNITIES.features.find(f => f.id === communityId);
        if (feature) {
            const bounds = L.geoJSON(feature).getBounds();
            map.fitBounds(bounds);
            // In a real app, you might also filter businesses by geographic bounds here
        }
    }
});

/**
 * Fullscreen functionality
 */
function toggleFullscreen() {
    const isFullscreen = document.fullscreenElement ||
                       document.webkitFullscreenElement ||
                       document.msFullscreenElement ||
                       mapContainer.classList.contains('fallback-fullscreen');

    if (!isFullscreen) {
        if (mapContainer.requestFullscreen) {
            mapContainer.requestFullscreen();
        } else if (mapContainer.webkitRequestFullscreen) { /* Safari */
            mapContainer.webkitRequestFullscreen();
        } else if (mapContainer.msRequestFullscreen) { /* IE11 */
            mapContainer.msRequestFullscreen();
        } else {
            // Fallback for browsers that don't support Fullscreen API
            mapContainer.classList.add('fallback-fullscreen');
            document.body.style.overflow = 'hidden';
            map.invalidateSize();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        } else if (mapContainer.classList.contains('fallback-fullscreen')) {
            mapContainer.classList.remove('fallback-fullscreen');
            document.body.style.overflow = '';
            map.invalidateSize();
        }
    }
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

// Handle fullscreen changes
document.addEventListener('fullscreenchange', () => {
    map.invalidateSize();
});

document.addEventListener('webkitfullscreenchange', () => {
    map.invalidateSize();
});

document.addEventListener('mozfullscreenchange', () => {
    map.invalidateSize();
});

document.addEventListener('MSFullscreenChange', () => {
    map.invalidateSize();
});

// Handle ESC key for fallback fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mapContainer.classList.contains('fallback-fullscreen')) {
        mapContainer.classList.remove('fallback-fullscreen');
        document.body.style.overflow = '';
        map.invalidateSize();
    }
});

zoomInBtn.addEventListener('click', () => {
    map.zoomIn();
});

zoomOutBtn.addEventListener('click', () => {
    map.zoomOut();
});

/**
 * Theme Management
 */
function initTheme() {
    const savedTheme = localStorage.getItem("melaninMapsTheme");
    if (savedTheme) {
        currentTheme = savedTheme;
    }
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    // Ensure the body has the melaninmaps-theme class
    document.body.classList.add('melaninmaps-theme');
    localStorage.setItem("melaninMapsTheme", theme);

    // Update Toggle UI
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

    // Update Map if already initialized
    if (map) {
        updateMapTiles();
        renderMarkers(businesses);
    }
}

// Theme Toggle Listeners
document.getElementById('theme-dark-btn')?.addEventListener('click', () => applyTheme('dark'));
document.getElementById('theme-standard-btn')?.addEventListener('click', () => applyTheme('standard'));

// Initialize
initTheme();
initMap();
