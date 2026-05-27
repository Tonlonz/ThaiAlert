// ----------------------------------------------------
// Global State & Configuration
// ----------------------------------------------------
let map;
let geoJsonLayer;
let userMarker;
let userCoords = null;
let socket;
let incidents = [];
let filteredIncidents = [];
let provincesList = [];
let favoriteIncidents = [];

// Map Style & Layer References
let activeMapStyle = 'vector';
let currentBaseLayer = null;

// Audio variables
let audioCtx = null;
let activeRedSirenNode = null;
let isMuted = false;

// UI & Translation State
let currentLang = localStorage.getItem('lang') || 'th';
let currentTheme = localStorage.getItem('theme') || 'dark';
let adminToken = localStorage.getItem('adminToken') || null;

// User Account & Session State
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let userToken = localStorage.getItem('userToken') || null;
let activeSidebarTab = 'warnings'; // 'warnings' or 'favorites'

// Timeline Playback State
let isPlayingTimeline = false;
let timelineInterval = null;
let currentTimelineVal = 60; // 0 to 60 minutes ago
let activeWaveAnimations = [];
let activeWaveCircles = [];

// Sidebar drag resize references
let isResizingSidebar = false;
let sidebarWidth = parseInt(localStorage.getItem('sidebarWidth')) || 380;

// Translations Dictionary
const translations = {
    th: {
        app_title: "ThaiAlert! ระบบเตือนภัยฉุกเฉินและแผ่นดินไหวแห่งประเทศไทย",
        app_name: "ThaiAlert! <span>ระบบเตือนภัยภัยพิบัติเรียลไทม์</span>",
        btn_operator: "ห้องสั่งการเจ้าหน้าที่",
        monitoring_center: "📡 ศูนย์เฝ้าระวังภัยพิบัติ",
        status_ready: "ระบบออนไลน์ เฝ้าระวังปกติ",
        status_warning: "⚠️ แจ้งเตือนภัยระดับเฝ้าระวัง",
        status_critical: "🚨 มีภัยพิบัติฉุกเฉินระดับวิกฤต!",
        total_incidents: "เหตุการณ์ทั้งหมด",
        active_warnings: "ภัยพิบัติรุนแรงสะสม",
        severity_level: "ระดับความรุนแรง",
        sev_red: "วิกฤต (สีแดง / ขนาด > 5.5 / ภัยรุนแรง)",
        sev_yellow: "เฝ้าระวัง (สีเหลือง / ขนาด 4.0 - 5.5)",
        sev_green: "ปกติ/ภัยเล็กน้อย (สีเขียว / ขนาด < 4.0)",
        user_location: "ตำแหน่งของคุณ (You Are Here)",
        emergency_warning: "⚠️ การแจ้งเตือนภัยวิกฤตฉุกเฉิน",
        timeline_realtime: "ประวัติย้อนหลัง: สด (เรียลไทม์)",
        timeline_past: "ประวัติย้อนหลัง: {min} นาทีที่แล้ว ({time})",
        sidebar_title: "แจ้งเตือนล่าสุด",
        audio_unmuted: "เปิดเสียงเตือน",
        audio_muted: "ปิดเสียงเตือน",
        filter_type_label: "ประเภทภัยพิบัติ",
        filter_severity_label: "ความรุนแรง",
        filter_province_label: "จังหวัดที่ได้รับผลกระทบ",
        filter_sim_label: "ประเภทข้อมูล",
        opt_all: "ทั้งหมด",
        opt_all_incidents: "รวมประวัติการซ้อมจำลอง",
        opt_real_only: "เฉพาะเหตุการณ์จริง",
        opt_sim_only: "เฉพาะการซ้อมจำลอง",
        opt_earthquake: "แผ่นดินไหว (Earthquake)",
        opt_tsunami: "สึนามิ (Tsunami)",
        opt_civil: "เหตุความไม่สงบ (Civil Unrest)",
        opt_accident: "ภัยพิบัติ/อุบัติเหตุรุนแรง",
        opt_green: "เล็กน้อย / ท้องถิ่น (เขียว)",
        opt_yellow: "ปานกลาง / เฝ้าระวัง (เหลือง)",
        opt_red: "วิกฤต / รุนแรง (แดง)",
        loading: "กำลังโหลดฐานข้อมูลและขอบเขตจังหวัด...",
        admin_modal_title: "ห้องควบคุมสั่งการเตือนภัย (Operator Control Panel)",
        auth_instruction: "กรุณาป้อนรหัสผ่านของเจ้าหน้าที่เพื่อเปิดเครื่องมือส่งสัญญาณเตือนภัยเสมือนจริง",
        label_password: "รหัสผ่านสำหรับเจ้าหน้าที่",
        btn_login: "เข้าสู่ระบบควบคุม",
        label_sim_mode: "เปิดโหมดซ้อมแผนจำลอง (Simulated Drill)",
        sim_mode_desc: "ข้อมูลการเตือนภัยนี้จะถูกทำเครื่องหมายเป็นการซ้อม เพื่อความปลอดภัย",
        label_title: "หัวข้อการแจ้งเตือนภัย (ภาษาไทย)",
        label_description: "ข้อความรายละเอียดและคำแนะนำด้านความปลอดภัย (ภาษาไทย)",
        label_mag: "ขนาดแผ่นดินไหว (Magnitude) *ถ้ามี",
        label_maps_extractor: "ดึงพิกัดจากลิงก์",
        btn_extract: "ดึงจาก Google Maps Link",
        label_lat: "พิกัดละติจูด (Latitude)",
        label_lon: "พิกัดลองจิจูด (Longitude)",
        btn_cancel: "ยกเลิก",
        btn_broadcast: "ส่งสัญญาณเตือนภัยทันที 🚀",
        auth_failed: "รหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง",
        no_incidents: "ไม่พบข้อมูลเหตุการณ์ตามเงื่อนไขที่เลือก",
        distance_km: "ห่างจากคุณ {dist} กม.",
        distance_unknown: "ไม่ทราบระยะทาง (กรุณาอนุญาตระบุตำแหน่ง)",
        magnitude_label: "ขนาด {mag} ริกเตอร์",
        time_just_now: "เมื่อครู่นี้",
        time_minutes_ago: "{m} นาทีที่แล้ว",
        time_hours_ago: "{h} ชั่วโมงที่แล้ว",
        safety_take_cover: "กรุณาหมอบใต้โต๊ะ หลีกเลี่ยงอาคารสูง หรือเคลื่อนย้ายไปพื้นที่ปลอดภัยทันที!",
        safety_tsunami: "คลื่นยักษ์อาจเข้าฝั่งในไม่ช้า อพยพขึ้นที่สูงเหนือแนวสีแดงของเทศบาลด่วน!",
        safety_civil: "การปะทะปะทุขึ้นในบริเวณดังกล่าว หลีกเลี่ยงเส้นทางและอยู่ในตัวอาคาร!",
        safety_accident: "เกิดการรั่วไหล/อุบัติภัยขนาดใหญ่ หลีกเลี่ยงกระแสลมและปิดประตูหน้าต่างให้มิดชิด!"
    },
    en: {
        app_title: "ThaiAlert! Emergency Early Warning & Earthquake System",
        app_name: "ThaiAlert! <span>Disaster Warning System</span>",
        btn_operator: "Operator Dashboard",
        monitoring_center: "📡 Monitoring Center",
        status_ready: "System Online (Normal)",
        status_warning: "⚠️ System Alert (Advisory)",
        status_critical: "🚨 Active Critical Disaster Warning!",
        total_incidents: "Total Incidents",
        active_warnings: "Active Disasters",
        severity_level: "Severity Levels",
        sev_red: "Critical (Red / Mag > 5.5)",
        sev_yellow: "Advisory (Yellow / Mag 4.0 - 5.5)",
        sev_green: "Minor / Local (Green / Mag < 4.0)",
        user_location: "You Are Here",
        emergency_warning: "⚠️ EMERGENCY DISASTER WARNING",
        timeline_realtime: "Timeline History: Live Mode",
        timeline_past: "Timeline: {min} mins ago ({time})",
        sidebar_title: "Active Incident Feed",
        audio_unmuted: "Sound On",
        audio_muted: "Sound Muted",
        filter_type_label: "Disaster Category",
        filter_severity_label: "Severity",
        filter_province_label: "Affected Province",
        filter_sim_label: "Data Mode",
        opt_all: "All",
        opt_all_incidents: "Show Simulation Drills",
        opt_real_only: "Real Incidents Only",
        opt_sim_only: "Simulation Drills Only",
        opt_earthquake: "Earthquake",
        opt_tsunami: "Tsunami",
        opt_civil: "Civil Unrest",
        opt_accident: "Major Accident / Hazard",
        opt_green: "Minor / Green",
        opt_yellow: "Moderate / Yellow",
        opt_red: "Critical / Red",
        loading: "Loading database and map coordinates...",
        admin_modal_title: "Emergency Broadcast Panel",
        auth_instruction: "Please enter dispatcher password to unlock system trigger forms.",
        label_password: "Operator Password",
        btn_login: "Authorize Console",
        label_sim_mode: "Simulation Mode (Drill Mode)",
        sim_mode_desc: "This warning data will be tagged as simulation and isolated.",
        label_title: "Warning Title (Thai)",
        label_description: "Detailed description & safety instruction",
        label_mag: "Magnitude (Optional)",
        label_maps_extractor: "Extract Coordinates",
        btn_extract: "From Google Maps URL",
        label_lat: "Latitude coordinate",
        label_lon: "Longitude coordinate",
        btn_cancel: "Cancel",
        btn_broadcast: "Broadcast Emergency Signal 🚀",
        auth_failed: "Invalid operator password.",
        no_incidents: "No incident reports matches your filters",
        distance_km: "{dist} km away from you",
        distance_unknown: "Distance unknown (Grant geolocation)",
        magnitude_label: "Magnitude {mag}",
        time_just_now: "Just now",
        time_minutes_ago: "{m}m ago",
        time_hours_ago: "{h}h ago",
        safety_take_cover: "Drop, cover, and hold on! Avoid windows and tall structures immediately.",
        safety_tsunami: "Move inland and climb to high ground or designated tsunami shelters immediately!",
        safety_civil: "Clashes reported. Avoid the area and shelter inside secure buildings.",
        safety_accident: "Hazardous leak reported. Stay upwind and seal all windows and doors."
    }
};

// ----------------------------------------------------
// Initialization
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initLanguage();
    initMap();
    setupSocket();
    fetchIncidents();
    initSidebarDragResize();
    updateAuthHeaderUI();
    initFavicon();
});

// Exclamation Caution Mark Favicon Injection
function initFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Cpath d='M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM13 16h-2v-2h2v2zm0-4h-2V8h2v4z'/%3E%3C/svg%3E";
}

// Theme Logic
function initTheme() {
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌑';
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    const themeBtn = document.getElementById('btn-theme');
    if (themeBtn) themeBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌑';
    
    // Switch tile layers base on theme/style selection
    refreshMapLayer();
}

// Language Logic
function initLanguage() {
    translateDOM();
}

function toggleLanguage() {
    currentLang = currentLang === 'th' ? 'en' : 'th';
    localStorage.setItem('lang', currentLang);
    translateDOM();
    
    // Refresh elements depending on active language
    populateProvinceDropdown();
    refreshFeed();
    updateMapTooltips();
    
    // Refresh localized map tiles labels!
    refreshMapLayer();
}

function translateDOM() {
    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        if (translations[currentLang] && translations[currentLang][key]) {
            if (key === 'app_name') {
                el.innerHTML = translations[currentLang][key];
            } else {
                el.textContent = translations[currentLang][key];
            }
        }
    });

    // Update document head title
    document.title = "ThaiAlert!";

    // Update placeholders in inputs
    const passInput = document.getElementById('admin-pass');
    if (passInput) {
        passInput.placeholder = currentLang === 'th' 
            ? 'ป้อนรหัสผ่าน (ค่าเริ่มต้นคือ admin)' 
            : 'Enter password (default: admin)';
    }

    const btnLang = document.getElementById('btn-lang');
    if (btnLang) {
        btnLang.innerHTML = currentLang === 'th' ? 'TH / <b>EN</b>' : '<b>TH</b> / EN';
    }
}

// ----------------------------------------------------
// Map Logic
// ----------------------------------------------------
function initMap() {
    // Center map of Thailand
    map = L.map('map', {
        zoomControl: false, // Turn off default so we can place custom css styled zoom under left overlay
        maxZoom: 18,
        minZoom: 5
    }).setView([13.7367, 101.0], 6);

    // Add zoom control manually
    L.control.zoom({
        position: 'topleft' // Custom styled and repositioned in CSS below Left monitoring panel
    }).addTo(map);

    // Initial base layer render
    refreshMapLayer();

    // Get Geolocation
    requestUserLocation();

    // Fetch and load Thailand geoJSON
    fetch('thailand.json')
        .then(response => response.json())
        .then(data => {
            // Style callback
            const provinceStyle = (feature) => {
                return {
                    fillColor: 'transparent',
                    weight: 1.2,
                    opacity: 0.4,
                    color: currentTheme === 'dark' ? '#475569' : '#94a3b8',
                    fillOpacity: 0.02
                };
            };

            // Interactions
            const onEachProvince = (feature, layer) => {
                const provNameTh = feature.properties.name || feature.properties.pro_th || feature.properties.PV_TH;
                if (provNameTh && !provincesList.includes(provNameTh)) {
                    provincesList.push(provNameTh);
                }

                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({
                            fillColor: currentTheme === 'dark' ? '#3b82f6' : '#60a5fa',
                            fillOpacity: 0.15,
                            opacity: 0.5 // Keep border thin, remove harsh white highlight
                        });
                        l.openTooltip();
                    },
                    mouseout: (e) => {
                        const l = e.target;
                        geoJsonLayer.resetStyle(l);
                        l.closeTooltip();
                    },
                    click: (e) => {
                        map.fitBounds(e.target.getBounds(), { padding: [20, 20] });
                    }
                });

                layer.bindTooltip(() => {
                    const name = feature.properties.name || feature.properties.pro_th || 'Province';
                    return `<div style="font-weight: 700; font-family: var(--font-primary);">${name}</div>`;
                }, { sticky: true, className: 'province-tooltip' });
            };

            geoJsonLayer = L.geoJSON(data, {
                style: provinceStyle,
                onEachFeature: onEachProvince
            }).addTo(map);

            provincesList.sort((a, b) => a.localeCompare(b, 'th'));
            populateProvinceDropdown();
        })
        .catch(err => console.error('Error loading Thailand GeoJSON boundaries:', err));
}

// Refresh base tiles based on theme, switching style (vector/satellite), and selected language labels
function refreshMapLayer() {
    if (!map) return;

    if (currentBaseLayer) {
        map.removeLayer(currentBaseLayer);
    }

    if (activeMapStyle === 'satellite') {
        currentBaseLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });
    } else {
        // Localization: Thai mode loads OpenStreetMap tiles (which have local Thai labels). 
        // English mode loads CartoDB Voyager tiles (which have clean English labels).
        if (currentLang === 'th') {
            currentBaseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            });
        } else {
            const tileUrl = currentTheme === 'dark' 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
                
            currentBaseLayer = L.tileLayer(tileUrl, {
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            });
        }
    }

    currentBaseLayer.addTo(map);

    // Apply dark filter if using Vector OSM (Thai mode) with dark theme
    if (activeMapStyle === 'vector' && currentLang === 'th' && currentTheme === 'dark') {
        document.getElementById('map').classList.add('map-dark-invert');
    } else {
        document.getElementById('map').classList.remove('map-dark-invert');
    }
}

// Switch between Vector base map and Satellite base map
function switchMapStyle(style) {
    activeMapStyle = style;
    document.getElementById('btn-map-vector').classList.toggle('active', style === 'vector');
    document.getElementById('btn-map-satellite').classList.toggle('active', style === 'satellite');
    refreshMapLayer();
}

function requestUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userCoords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                
                const userIcon = L.divIcon({
                    className: 'pulse-user-marker',
                    html: '<div class="pulse-user-ring"></div><div class="pulse-user-dot"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                if (userMarker) {
                    userMarker.setLatLng([userCoords.lat, userCoords.lon]);
                } else {
                    userMarker = L.marker([userCoords.lat, userCoords.lon], { icon: userIcon }).addTo(map);
                    map.setView([userCoords.lat, userCoords.lon], 7);
                }

                console.log(`User geolocated: Lat ${userCoords.lat}, Lon ${userCoords.lon}`);
                refreshFeed();
            },
            (error) => {
                console.warn('Geolocation failed:', error.message);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }
}

function populateProvinceDropdown() {
    const dropdown = document.getElementById('filter-province');
    if (!dropdown) return;
    
    const currentVal = dropdown.value;
    dropdown.innerHTML = `<option value="all">${translations[currentLang].opt_all}</option>`;
    
    provincesList.forEach(provName => {
        const option = document.createElement('option');
        option.value = provName;
        option.textContent = provName;
        dropdown.appendChild(option);
    });

    if (currentVal && provincesList.includes(currentVal)) {
        dropdown.value = currentVal;
    }
}

function updateMapTooltips() {
    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(layer => {
            const feature = layer.feature;
            const provName = feature.properties.name || feature.properties.pro_th || 'Province';
            layer.setTooltipContent(`<div style="font-weight: 700; font-family: var(--font-primary);">${provName}</div>`);
        });
    }
}

// ----------------------------------------------------
// Real-time Event Broadcaster & WebSockets
// ----------------------------------------------------
function setupSocket() {
    socket = io();

    socket.on('initial_data', (mockData) => {
        if (mockData && incidents.length === 0) {
            incidents = mockData;
            applyFilters();
        }
    });

    socket.on('new_alert', (newIncident) => {
        console.log('🔔 Live WebSocket alert received:', newIncident);
        
        // Push to top of list
        incidents.unshift(newIncident);
        applyFilters();

        // 1. Play synthesize warning sound
        playAlertSound(newIncident.severity);

        // 2. Play Map ripple wave animations
        triggerWavePropagation(newIncident.latitude, newIncident.longitude, newIncident.severity, newIncident.magnitude);

        // 3. Highlight/Blink emergency banner if Red Alert
        if (newIncident.severity === 'red') {
            displayEmergencyBanner(newIncident);
        }

        // 4. Auto Epicenter Zoom: Zoom in immediately, hold, then zoom out after 6 seconds!
        autoFocusIncidentZoom(newIncident);

        // 5. Update PIP widget warning logs
        updatePipWidgetStatus(newIncident);
    });
}

// Auto Zoom epicenters camera animation
function autoFocusIncidentZoom(inc) {
    if (!map) return;

    // Zoom in closely (level 12)
    map.setView([inc.latitude, inc.longitude], 12, { animate: true, duration: 1.2 });

    // Open information popups automatically
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            const latLng = layer.getLatLng();
            if (Math.abs(latLng.lat - inc.latitude) < 0.0002 && Math.abs(latLng.lng - inc.longitude) < 0.0002) {
                setTimeout(() => layer.openPopup(), 1200);
            }
        }
    });

    // Hold zoom focus for 6 seconds, then slowly ease back to comfortable wide coverage view (level 7)
    setTimeout(() => {
        if (!isPlayingTimeline) {
            map.setView([13.7367, 101.0], 6, { animate: true, duration: 1.8 });
        }
    }, 6000);
}

// ----------------------------------------------------
// UI Logic & Lists rendering
// ----------------------------------------------------
function fetchIncidents() {
    fetch('/api/incidents')
        .then(res => res.json())
        .then(data => {
            incidents = data;
            applyFilters();
            if (currentUser) {
                fetchFavorites();
            }
        })
        .catch(err => {
            console.error('REST API error fetching incidents:', err);
            document.getElementById('feed-container').innerHTML = `
                <div style="text-align: center; color: var(--accent-red); padding: 20px;">
                    ❌ Unable to connect to backend server.
                </div>
            `;
        });
}

function applyFilters() {
    if (activeSidebarTab === 'favorites') {
        renderFavoritesList();
        return;
    }

    const filterType = document.getElementById('filter-type').value;
    const filterSeverity = document.getElementById('filter-severity').value;
    const filterProvince = document.getElementById('filter-province').value;
    const filterSim = document.getElementById('filter-simulation').value;

    filteredIncidents = incidents.filter(inc => {
        if (filterType !== 'all' && inc.type !== filterType) return false;
        if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
        if (filterSim !== 'all' && inc.is_simulation !== parseInt(filterSim)) return false;
        
        if (filterProvince !== 'all') {
            const inTitle = inc.title.includes(filterProvince);
            const inDesc = inc.description ? inc.description.includes(filterProvince) : false;
            if (!inTitle && !inDesc) {
                return false;
            }
        }
        return true;
    });

    renderIncidentList();
    updateStatistics();
    redrawMapMarkers();
}

function updateStatistics() {
    const totalCountEl = document.getElementById('stat-total-count');
    const activeWarningsEl = document.getElementById('stat-active-warnings');
    
    if (totalCountEl) totalCountEl.textContent = filteredIncidents.length;
    
    const redCount = filteredIncidents.filter(inc => inc.severity === 'red').length;
    if (activeWarningsEl) activeWarningsEl.textContent = redCount;

    const countBadge = document.getElementById('incident-count-badge');
    if (countBadge) countBadge.textContent = activeSidebarTab === 'favorites' ? favoriteIncidents.length : filteredIncidents.length;

    // Update status pulses
    const statusPulse = document.getElementById('status-pulse');
    const statusText = document.getElementById('status-text');

    if (statusPulse && statusText) {
        const hasActiveRed = filteredIncidents.some(inc => inc.severity === 'red');
        const hasActiveYellow = filteredIncidents.some(inc => inc.severity === 'yellow');

        if (hasActiveRed) {
            statusPulse.className = 'pulse-dot critical';
            statusText.textContent = translations[currentLang].status_critical;
            statusText.style.color = 'var(--accent-red)';
        } else if (hasActiveYellow) {
            statusPulse.className = 'pulse-dot warning';
            statusText.textContent = translations[currentLang].status_warning;
            statusText.style.color = 'var(--accent-yellow)';
        } else {
            statusPulse.className = 'pulse-dot';
            statusText.textContent = translations[currentLang].status_ready;
            statusText.style.color = 'var(--text-secondary)';
        }
    }
}

// Refresh feed container base on selected tab
function refreshFeed() {
    if (activeSidebarTab === 'favorites') {
        renderFavoritesList();
    } else {
        applyFilters();
    }
}

function renderIncidentList() {
    const feed = document.getElementById('feed-container');
    if (!feed) return;

    if (filteredIncidents.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 10px;">
                ${translations[currentLang].no_incidents}
            </div>
        `;
        return;
    }

    feed.innerHTML = '';

    filteredIncidents.forEach(inc => {
        let distText = translations[currentLang].distance_unknown;
        if (userCoords) {
            const dist = calculateDistance(userCoords.lat, userCoords.lon, inc.latitude, inc.longitude);
            distText = translations[currentLang].distance_km.replace('{dist}', dist.toFixed(2));
        }

        const dateObj = new Date(inc.timestamp);
        const timeFormatted = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
        const timeRelative = getRelativeTime(dateObj);

        let disasterIcon = '⚠️';
        if (inc.type === 'earthquake') disasterIcon = '🌋';
        if (inc.type === 'tsunami') disasterIcon = '🌊';
        if (inc.type === 'civil_unrest') disasterIcon = '🔥';
        if (inc.type === 'accident') disasterIcon = '☣️';

        const severityText = translations[currentLang][`opt_${inc.severity}`] || inc.severity;
        const isFav = favoriteIncidents.some(f => f.id === inc.id);

        const card = document.createElement('div');
        // Live vs Test border marking styling: Dashed outline for simulation test drills
        const testClass = inc.is_simulation ? 'test-drill-dashed' : '';
        const testLabel = inc.is_simulation ? '[TEST] ' : '';

        card.className = `incident-card ${inc.severity} ${testClass}`;
        
        // Determine whether map epicenter zoom-in is inside Thailand or outside
        const outsideClass = inc.is_inside_thailand === 0 ? 'outside-th-fade' : '';
        if (outsideClass) card.classList.add(outsideClass);

        card.innerHTML = `
            ${inc.is_simulation ? `<span class="sim-badge">SIMULATION</span>` : ''}
            <div class="card-header-info">
                <div class="card-title-wrap">
                    <span class="card-icon">${disasterIcon}</span>
                    <span class="card-title">${testLabel}${inc.title}</span>
                </div>
                <span class="severity-badge ${inc.severity}">${severityText}</span>
            </div>
            <div class="card-description">${inc.description || ''}</div>
            <div class="card-meta">
                <div class="meta-item">🕒 <strong>${timeRelative}</strong> (${timeFormatted})</div>
                <div class="meta-item">📍 <strong>${distText}</strong></div>
                ${inc.magnitude ? `<div class="meta-item">📈 <strong>${translations[currentLang].magnitude_label.replace('{mag}', inc.magnitude)}</strong></div>` : ''}
                <div class="meta-item">🗺️ <span>${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}</span></div>
            </div>
            
            <button class="favorite-star-btn ${isFav ? 'active' : ''}" onclick="toggleIncidentFavorite(${inc.id}, event)" title="เก็บเหตุการณ์โปรดและจดบันทึก memo">
                ${isFav ? '★' : '☆'}
            </button>
        `;
        
        // Clicking body zooms map
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('favorite-star-btn')) {
                focusIncidentOnMap(inc);
            }
        });

        feed.appendChild(card);
    });
}

function redrawMapMarkers() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            map.removeLayer(layer);
        }
    });

    const listToDraw = activeSidebarTab === 'favorites' ? favoriteIncidents : filteredIncidents;

    listToDraw.forEach(inc => {
        let markerColor = 'var(--accent-green)';
        if (inc.severity === 'yellow') markerColor = 'var(--accent-yellow)';
        if (inc.severity === 'red') markerColor = 'var(--accent-red)';

        let disasterIcon = '⚠️';
        if (inc.type === 'earthquake') disasterIcon = '🌋';
        if (inc.type === 'tsunami') disasterIcon = '🌊';
        if (inc.type === 'civil_unrest') disasterIcon = '🔥';
        if (inc.type === 'accident') disasterIcon = '☣️';

        // Lighter/faded style for events occurring outside of Thailand
        const outsideFaded = inc.is_inside_thailand === 0 ? 'opacity: 0.45; filter: grayscale(50%);' : '';

        const customIcon = L.divIcon({
            className: 'epicenter-marker',
            html: `<div class="epicenter-core" style="color: ${markerColor}; ${outsideFaded}">${disasterIcon}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon }).addTo(map);

        const testLabel = inc.is_simulation ? '<span style="color:var(--accent-blue); font-weight:bold;">[TEST DRILL]</span> ' : '';
        const memoLabel = inc.memo ? `<div style="margin-top:6px; padding:6px; background:rgba(245,158,11,0.1); border-left:2px solid var(--accent-yellow); font-size:0.75rem; border-radius:4px;"><b>📝 Memo:</b> ${inc.memo}</div>` : '';

        marker.bindPopup(`
            <div style="font-family: var(--font-primary); padding: 4px; width:220px;">
                <h4 style="font-weight:700; margin-bottom:4px; font-size:0.95rem;">${testLabel}${inc.title}</h4>
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:8px;">${inc.description || ''}</p>
                ${memoLabel}
                <div style="font-size:0.75rem; border-top:1px solid var(--border-color); padding-top:6px; color:var(--text-muted);">
                    <b>พิกัด:</b> ${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}<br>
                    <b>เวลา:</b> ${new Date(inc.timestamp).toLocaleString('th-TH')}
                </div>
            </div>
        `);
    });
}

function focusIncidentOnMap(inc) {
    if (!map) return;
    map.setView([inc.latitude, inc.longitude], 9, { animate: true, duration: 0.8 });
    
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && layer !== userMarker) {
            const latLng = layer.getLatLng();
            if (Math.abs(latLng.lat - inc.latitude) < 0.0001 && Math.abs(latLng.lng - inc.longitude) < 0.0001) {
                layer.openPopup();
                triggerWavePropagation(inc.latitude, inc.longitude, inc.severity, inc.magnitude);
            }
        }
    });
}

// ----------------------------------------------------
// Seismic Wave Propagation Animation
// ----------------------------------------------------
function triggerWavePropagation(lat, lon, severity, magnitude = 5.0) {
    clearActiveWaves();

    const maxRadiusKm = severity === 'red' ? 450 : severity === 'yellow' ? 250 : 100;
    const pWaveSpeed = 6.0; 
    const sWaveSpeed = 3.4; 

    const pColor = severity === 'red' ? '#60a5fa' : '#93c5fd';
    const sColor = severity === 'red' ? '#ef4444' : severity === 'yellow' ? '#f59e0b' : '#10b981';

    const pCircle = L.circle([lat, lon], {
        radius: 0,
        color: pColor,
        weight: 1.5,
        fillColor: 'transparent',
        dashArray: '4, 4'
    }).addTo(map);

    const sCircle = L.circle([lat, lon], {
        radius: 0,
        color: sColor,
        weight: 3.5,
        fillColor: sColor,
        fillOpacity: 0.03
    }).addTo(map);

    activeWaveCircles.push(pCircle);
    activeWaveCircles.push(sCircle);

    let elapsedSeconds = 0;
    const intervalMs = 60;
    let currentStep = 0;

    const waveTimer = setInterval(() => {
        currentStep++;
        elapsedSeconds = (currentStep * intervalMs) / 1000;

        const pRadiusMeters = elapsedSeconds * pWaveSpeed * 1000;
        const sRadiusMeters = elapsedSeconds * sWaveSpeed * 1000;

        pCircle.setRadius(pRadiusMeters);
        sCircle.setRadius(sRadiusMeters);

        highlightAffectedProvinces(lat, lon, sRadiusMeters / 1000, severity);

        if (pRadiusMeters >= maxRadiusKm * 1000) {
            clearInterval(waveTimer);
            let opacity = 0.8;
            const fadeTimer = setInterval(() => {
                opacity -= 0.1;
                if (opacity <= 0) {
                    clearInterval(fadeTimer);
                    clearActiveWaves();
                    resetGeoJSONStyle();
                } else {
                    pCircle.setStyle({ opacity: opacity });
                    sCircle.setStyle({ opacity: opacity, fillOpacity: opacity * 0.03 });
                }
            }, 50);
        }
    }, intervalMs);

    activeWaveAnimations.push(waveTimer);
}

function clearActiveWaves() {
    activeWaveAnimations.forEach(timer => clearInterval(timer));
    activeWaveAnimations = [];
    activeWaveCircles.forEach(circle => {
        if (map.hasLayer(circle)) {
            map.removeLayer(circle);
        }
    });
    activeWaveCircles = [];
}

function highlightAffectedProvinces(epicenterLat, epicenterLon, radiusKm, severity) {
    if (!geoJsonLayer) return;

    geoJsonLayer.eachLayer(layer => {
        const centroid = getPolygonCentroid(layer);
        
        if (centroid) {
            const dist = calculateDistance(epicenterLat, epicenterLon, centroid[0], centroid[1]);
            
            if (dist <= radiusKm) {
                let activeColor = 'rgba(16, 185, 129, 0.25)';
                if (severity === 'yellow') activeColor = 'rgba(245, 158, 11, 0.35)';
                if (severity === 'red') activeColor = 'rgba(239, 68, 68, 0.45)';

                layer.setStyle({
                    fillColor: activeColor,
                    fillOpacity: 0.3,
                    color: severity === 'red' ? '#ef4444' : '#f59e0b',
                    weight: 1.8
                });
            }
        }
    });
}

function resetGeoJSONStyle() {
    if (geoJsonLayer) {
        geoJsonLayer.eachLayer(layer => {
            geoJsonLayer.resetStyle(layer);
        });
    }
}

function getPolygonCentroid(layer) {
    if (layer.getBounds) {
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        return [center.lat, center.lng];
    }
    return null;
}

// ----------------------------------------------------
// bottom Emergency Warning Banner with Predictive Radius
// ----------------------------------------------------
function displayEmergencyBanner(inc) {
    const banner = document.getElementById('emergency-banner');
    const desc = document.getElementById('emergency-banner-desc');
    if (!banner || !desc) return;

    // Calculate distance
    let distText = translations[currentLang].distance_unknown;
    if (userCoords) {
        const dist = calculateDistance(userCoords.lat, userCoords.lon, inc.latitude, inc.longitude);
        distText = translations[currentLang].distance_km.replace('{dist}', dist.toFixed(2));
    }

    // Directives
    let directive = '';
    if (inc.type === 'earthquake') directive = translations[currentLang].safety_take_cover;
    else if (inc.type === 'tsunami') directive = translations[currentLang].safety_tsunami;
    else if (inc.type === 'civil_unrest') directive = translations[currentLang].safety_civil;
    else if (inc.type === 'accident') directive = translations[currentLang].safety_accident;

    // Calculate Impact Radius & Prediction
    let radius = 100;
    let predictionText = '';

    if (inc.type === 'earthquake') {
        const mag = inc.magnitude || 4.5;
        radius = Math.round(Math.pow(10, (mag - 3.5) / 2) * 50); // Logarithmic physical formula based on magnitude
        predictionText = `คลื่นแผ่นดินไหวแบบ P/S-wave คาดเดาความเสียหายและแรงสั่นสะเทือนกินรัศมีกว้างประมาณ ${radius} กม. และอาจมีอาฟเตอร์ช็อกตามมาในอีก 24 ชั่วโมงข้างหน้า`;
    } else if (inc.type === 'tsunami') {
        radius = 350;
        predictionText = `เฝ้าระวังภัยพิบัติสึนามิตลอดแนวชายฝั่งทะเลอันดามันและเกาะรอบนอก รัศมีกระจายคลื่นมหาสมุทรกินวงกว้างกว่า ${radius} กม.`;
    } else {
        radius = 50;
        predictionText = `สถานการณ์อันตรายระงับภัยในจุดเกิดเหตุ รัศมีปนเปื้อนและจำกัดพื้นที่ฉุกเฉินครอบคลุมเป็นวงกว้างประมาณ ${radius} กม.`;
    }

    const testPrefix = inc.is_simulation ? '<span style="color:var(--accent-blue);">[TEST DRILL]</span> ' : '';

    desc.innerHTML = `
        <strong>${testPrefix}${inc.title}</strong> - <b>${distText}</b><br>
        <span style="font-size:0.95rem; color:#fef08a; display:block; margin:4px 0;">⚠️ ${directive}</span>
        <span style="font-size:0.8rem; color:rgba(255,255,255,0.85); display:block; border-top:1px dashed rgba(255,255,255,0.25); padding-top:4px; margin-top:4px;">🌐 <b>รัศมีจุดเกิดเหตุภัยพิบัติ:</b> ~${radius} กม. | <b>คาดเดาสถานการณ์ล่วงหน้า:</b> ${predictionText}</span>
    `;

    banner.className = 'emergency-banner show';
}

function closeEmergencyBanner() {
    const banner = document.getElementById('emergency-banner');
    if (banner) banner.className = 'emergency-banner';
    stopRedSiren();
}

// ----------------------------------------------------
// Siren Audio API (Web Audio API Synthesizer)
// ----------------------------------------------------
function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playAlertSound(severity) {
    if (isMuted) return;

    try {
        initAudioContext();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (severity === 'green') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            gainNode.gain.setValueAtTime(0.01, now);
            gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            
            osc.frequency.setValueAtTime(659.25, now + 0.2);
            gainNode.gain.setValueAtTime(0.01, now + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.25);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.start(now);
            osc.stop(now + 0.5);

        } else if (severity === 'yellow') {
            osc.type = 'triangle';
            gainNode.gain.setValueAtTime(0.01, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
            
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.setValueAtTime(880, now + 0.4);
            osc.frequency.setValueAtTime(660, now + 0.8);
            osc.frequency.setValueAtTime(880, now + 1.2);
            osc.frequency.setValueAtTime(660, now + 1.6);
            osc.frequency.setValueAtTime(880, now + 2.0);

            gainNode.gain.setValueAtTime(0.2, now + 2.0);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

            osc.start(now);
            osc.stop(now + 2.6);

        } else if (severity === 'red') {
            stopRedSiren();
            
            const redOsc = audioCtx.createOscillator();
            const redGain = audioCtx.createGain();
            
            redOsc.type = 'sawtooth';
            redOsc.frequency.setValueAtTime(440, now);
            
            redGain.gain.setValueAtTime(0.01, now);
            redGain.gain.linearRampToValueAtTime(0.25, now + 0.5);

            let sweepUp = true;
            let currentFreq = 440;
            
            const interval = setInterval(() => {
                if (isMuted || !audioCtx) {
                    clearInterval(interval);
                    return;
                }
                
                if (sweepUp) {
                    currentFreq += 30;
                    if (currentFreq >= 880) sweepUp = false;
                } else {
                    currentFreq -= 30;
                    if (currentFreq <= 440) sweepUp = true;
                }
                
                try {
                    redOsc.frequency.setValueAtTime(currentFreq, audioCtx.currentTime);
                } catch(e) {
                    clearInterval(interval);
                }
            }, 30);

            redOsc.connect(redGain);
            redGain.connect(audioCtx.destination);
            
            redOsc.start(now);
            
            activeRedSirenNode = {
                osc: redOsc,
                gain: redGain,
                timer: interval
            };
        }
    } catch (e) {
        console.error('Audio synthesis failed:', e);
    }
}

function stopRedSiren() {
    if (activeRedSirenNode) {
        clearInterval(activeRedSirenNode.timer);
        try {
            activeRedSirenNode.osc.stop();
            activeRedSirenNode.osc.disconnect();
            activeRedSirenNode.gain.disconnect();
        } catch (e) {}
        activeRedSirenNode = null;
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-mute');
    if (!btn) return;

    if (isMuted) {
        stopRedSiren();
        btn.innerHTML = `🔇 <span data-translate="audio_muted">${translations[currentLang].audio_muted}</span>`;
        btn.classList.add('active');
    } else {
        btn.innerHTML = `🔊 <span data-translate="audio_unmuted">${translations[currentLang].audio_unmuted}</span>`;
        btn.classList.remove('active');
    }
}

// ----------------------------------------------------
// NVR Playback Mode (NVR Playback Retro UI)
// ----------------------------------------------------
function enterNvrMode() {
    isPlayingTimeline = false;
    currentTimelineVal = 60;
    
    // Slide up NVR time slider panel at map bottom
    document.getElementById('timeline-nvr-container').style.display = 'flex';
    
    // Add retro CRT screen filter style to the map panel!
    document.querySelector('.map-panel').classList.add('nvr-playback-crt-effect');
    
    // Reset play/pause buttons
    document.getElementById('btn-timeline-play').textContent = '▶';
    document.getElementById('timeline-slider').value = 60;
    
    updateTimelineUI();
    filterIncidentsByTimeline();
}

function exitNvrMode() {
    isPlayingTimeline = false;
    clearInterval(timelineInterval);
    
    document.getElementById('timeline-nvr-container').style.display = 'none';
    document.querySelector('.map-panel').classList.remove('nvr-playback-crt-effect');
    
    resetTimeline();
}

function onTimelineSliderChange(val) {
    currentTimelineVal = parseInt(val);
    updateTimelineUI();
    filterIncidentsByTimeline();
}

function updateTimelineUI() {
    const label = document.getElementById('timeline-time-label');
    const status = document.getElementById('timeline-status');
    
    if (currentTimelineVal === 60) {
        label.textContent = translations[currentLang].timeline_realtime;
        status.textContent = 'LIVE';
        status.style.color = 'var(--accent-blue)';
    } else {
        const minutesAgo = 60 - currentTimelineVal;
        const pastTimeStr = new Date(Date.now() - (minutesAgo * 60000)).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'});
        
        label.textContent = translations[currentLang].timeline_past
            .replace('{min}', minutesAgo)
            .replace('{time}', pastTimeStr);
        status.textContent = 'NVR PLAYBACK';
        status.style.color = 'var(--accent-yellow)';
    }
}

function filterIncidentsByTimeline() {
    if (currentTimelineVal === 60) {
        fetchIncidents();
        return;
    }

    const minutesAgo = 60 - currentTimelineVal;
    const cutoffTime = new Date(Date.now() - (minutesAgo * 60000));

    filteredIncidents = incidents.filter(inc => {
        return new Date(inc.timestamp) <= cutoffTime;
    });

    renderIncidentList();
    updateStatistics();
    redrawMapMarkers();
}

function toggleTimelinePlayback() {
    const playBtn = document.getElementById('btn-timeline-play');
    
    if (isPlayingTimeline) {
        isPlayingTimeline = false;
        clearInterval(timelineInterval);
        playBtn.textContent = '▶';
    } else {
        isPlayingTimeline = true;
        playBtn.textContent = '⏸';

        if (currentTimelineVal >= 60) {
            currentTimelineVal = 0;
            const slider = document.getElementById('timeline-slider');
            if (slider) slider.value = 0;
        }

        timelineInterval = setInterval(() => {
            currentTimelineVal += 1;
            const slider = document.getElementById('timeline-slider');
            if (slider) slider.value = currentTimelineVal;

            updateTimelineUI();
            filterIncidentsByTimeline();

            triggerTimelineWaveCheck();

            if (currentTimelineVal >= 60) {
                isPlayingTimeline = false;
                clearInterval(timelineInterval);
                playBtn.textContent = '▶';
            }
        }, 1500); 
    }
}

function triggerTimelineWaveCheck() {
    const minutesAgo = 60 - currentTimelineVal;
    const startBoundary = new Date(Date.now() - (minutesAgo * 60000));
    const endBoundary = new Date(Date.now() - ((minutesAgo - 1) * 60000));

    incidents.forEach(inc => {
        const t = new Date(inc.timestamp);
        if (t >= startBoundary && t < endBoundary) {
            triggerWavePropagation(inc.latitude, inc.longitude, inc.severity, inc.magnitude);
        }
    });
}

function resetTimeline() {
    isPlayingTimeline = false;
    clearInterval(timelineInterval);
    const playBtn = document.getElementById('btn-timeline-play');
    if (playBtn) playBtn.textContent = '▶';

    currentTimelineVal = 60;
    const slider = document.getElementById('timeline-slider');
    if (slider) slider.value = 60;

    updateTimelineUI();
    fetchIncidents();
    closeEmergencyBanner();
    resetGeoJSONStyle();
}

// ----------------------------------------------------
// Resizable Columns & Collapse Sidebar
// ----------------------------------------------------
function initSidebarDragResize() {
    const handle = document.getElementById('sidebar-resize-handle');
    const sidebar = document.getElementById('sidebar-panel');
    const mapContainer = document.querySelector('.map-panel');
    
    // Apply saved size
    sidebar.style.width = `${sidebarWidth}px`;
    mapContainer.style.width = `calc(100% - ${sidebarWidth}px)`;

    handle.addEventListener('mousedown', (e) => {
        isResizingSidebar = true;
        document.body.classList.add('sidebar-resizing-active');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizingSidebar) return;
        
        // Calculate new size from right viewport border
        const newWidth = window.innerWidth - e.clientX;
        
        // Enforce structural limits
        if (newWidth >= 260 && newWidth <= 600) {
            sidebarWidth = newWidth;
            sidebar.style.width = `${sidebarWidth}px`;
            mapContainer.style.width = `calc(100% - ${sidebarWidth}px)`;
            
            // Adjust Leaflet bounds dynamically to avoid distortion
            if (map) map.invalidateSize();
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizingSidebar) {
            isResizingSidebar = false;
            document.body.classList.remove('sidebar-resizing-active');
            localStorage.setItem('sidebarWidth', sidebarWidth);
            if (map) map.invalidateSize();
        }
    });
}

// Expand / Collapse sidebar panel. Toggles picture-in-picture widgets
function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar-panel');
    const handle = document.getElementById('sidebar-resize-handle');
    const mapContainer = document.querySelector('.map-panel');
    const btn = document.getElementById('btn-collapse-sidebar');
    const pip = document.getElementById('pip-warning-widget');
    
    const isCollapsed = sidebar.classList.toggle('collapsed');
    
    if (isCollapsed) {
        btn.textContent = '⏴';
        handle.style.display = 'none';
        
        sidebar.style.width = '0px';
        mapContainer.style.width = '100%';
        
        // Render Picture in Picture widget
        pip.style.display = 'flex';
        updatePipWidgetStatus(null);
    } else {
        btn.textContent = '⏵';
        handle.style.display = 'block';
        
        sidebar.style.width = `${sidebarWidth}px`;
        mapContainer.style.width = `calc(100% - ${sidebarWidth}px)`;
        
        pip.style.display = 'none';
    }
    
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 310);
}

// Update Picture in Picture overlay status warning log
function updatePipWidgetStatus(newInc = null) {
    const pipTitle = document.getElementById('pip-latest-title');
    if (!pipTitle) return;

    const source = newInc || incidents[0] || null;
    if (source) {
        const testLabel = source.is_simulation ? '[TEST] ' : '';
        pipTitle.textContent = `${testLabel}${source.title}`;
        pipTitle.style.color = source.severity === 'red' ? 'var(--accent-red)' : (source.severity === 'yellow' ? 'var(--accent-yellow)' : 'var(--text-primary)');
    } else {
        pipTitle.textContent = 'ไม่มีข้อมูลการแจ้งเตือน';
        pipTitle.style.color = 'var(--text-muted)';
    }
}

// ----------------------------------------------------
// Tab selectors Warnings vs Favorites
// ----------------------------------------------------
function switchSidebarTab(tab) {
    activeSidebarTab = tab;
    
    const tabWarnings = document.getElementById('tab-warnings');
    const tabFavorites = document.getElementById('tab-favorites');
    
    const warningsView = document.getElementById('sidebar-warnings-view');
    const favoritesView = document.getElementById('sidebar-favorites-view');
    
    tabWarnings.classList.toggle('active', tab === 'warnings');
    tabFavorites.classList.toggle('active', tab === 'favorites');
    
    if (tab === 'warnings') {
        warningsView.style.display = 'block';
        favoritesView.style.display = 'none';
        applyFilters();
    } else {
        warningsView.style.display = 'none';
        favoritesView.style.display = 'block';
        
        const anonAlert = document.getElementById('fav-anonymous-alert');
        if (currentUser) {
            anonAlert.style.display = 'none';
            renderFavoritesList();
        } else {
            anonAlert.style.display = 'block';
            document.getElementById('feed-container').innerHTML = '';
        }
    }
}

// ----------------------------------------------------
// Floating Hotlines Panel
// ----------------------------------------------------
function toggleHotlinePanel() {
    const panel = document.getElementById('hotline-panel');
    const btn = document.getElementById('btn-hotline');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.classList.add('active');
    } else {
        panel.style.display = 'none';
        btn.classList.remove('active');
    }
}

// ----------------------------------------------------
// Operator Dashboard (Admin Controls Panel)
// ----------------------------------------------------
function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.add('show');
        
        const authSec = document.getElementById('admin-auth-section');
        const controlSec = document.getElementById('admin-controls-section');
        
        if (adminToken) {
            authSec.style.display = 'none';
            controlSec.style.display = 'block';
        } else {
            authSec.style.display = 'block';
            controlSec.style.display = 'none';
            
            // Clear passwords input on prompt
            document.getElementById('admin-user').value = '';
            document.getElementById('admin-pass').value = '';
        }
    }
}

function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.classList.remove('show');
}

function submitAdminAuth() {
    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;
    const errorMsg = document.getElementById('auth-error-msg');
    
    if (!username || !password) return;

    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(async res => {
        const data = await res.json();
        if (res.status === 200) {
            adminToken = data.token;
            localStorage.setItem('adminToken', adminToken);
            
            document.getElementById('admin-auth-section').style.display = 'none';
            document.getElementById('admin-controls-section').style.display = 'block';
            if (errorMsg) errorMsg.style.display = 'none';
        } else {
            if (errorMsg) {
                errorMsg.textContent = data.error || translations[currentLang].auth_failed;
                errorMsg.style.display = 'block';
            }
        }
    })
    .catch(err => {
        console.error(err);
        if (errorMsg) {
            errorMsg.textContent = 'Connection error.';
            errorMsg.style.display = 'block';
        }
    });
}

function toggleMagnitudeField() {
    const type = document.getElementById('inc-type').value;
    const magGroup = document.getElementById('magnitude-group');
    
    if (type === 'earthquake') {
        magGroup.style.opacity = '1';
        document.getElementById('inc-mag').disabled = false;
    } else {
        magGroup.style.opacity = '0.5';
        document.getElementById('inc-mag').disabled = true;
        document.getElementById('inc-mag').value = '';
    }
}

function promptGoogleMapsLink() {
    const url = prompt(
        currentLang === 'th' 
        ? "วางลิงก์แชร์จาก Google Maps เพื่อดึงพิกัดอัตโนมัติ:" 
        : "Paste Google Maps share link to extract coordinates:"
    );
    
    if (!url) return;

    const regex1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const regex2 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const regex3 = /[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/;

    let match = url.match(regex1) || url.match(regex2) || url.match(regex3);

    if (match) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        
        document.getElementById('inc-lat').value = lat.toFixed(5);
        document.getElementById('inc-lon').value = lon.toFixed(5);
        
        alert(
            currentLang === 'th' 
            ? `ดึงข้อมูลสำเร็จ พิกัด: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
            : `Coordinates extracted: ${lat.toFixed(5)}, ${lon.toFixed(5)}`
        );
    } else {
        alert(
            currentLang === 'th'
            ? "ไม่พบพิกัดในลิงก์ดังกล่าว กรุณาตรวจสอบรูปแบบลิงก์"
            : "No coordinates pattern found in the URL. Please verify."
        );
    }
}

function triggerMockIncident(event) {
    event.preventDefault();

    if (!adminToken) {
        alert('Unauthorized');
        return;
    }

    const title = document.getElementById('inc-title').value;
    const description = document.getElementById('inc-desc').value;
    const type = document.getElementById('inc-type').value;
    const severity = document.getElementById('inc-severity').value;
    const magnitude = document.getElementById('inc-mag').value;
    const latitude = document.getElementById('inc-lat').value;
    const longitude = document.getElementById('inc-lon').value;
    const is_simulation = document.getElementById('sim-drill-toggle').checked ? 1 : 0;

    const payload = {
        title,
        description,
        type,
        severity,
        magnitude: magnitude ? parseFloat(magnitude) : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        is_simulation
    };

    fetch('/api/admin/trigger', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const data = await res.json();
        if (res.status === 200) {
            closeAdminModal();
            document.getElementById('incident-trigger-form').reset();
            toggleMagnitudeField();
        } else {
            alert(`Error: ${data.error || 'Failed to trigger'}`);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error sending warning broadcast signal.');
    });
}

// ----------------------------------------------------
// User Authentication Flow (Login & Sign Up Overlay Modals)
// ----------------------------------------------------
function openAuthModal() {
    if (currentUser) {
        // Toggle logout directly if already logged in
        if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
            handleUserLogout();
        }
        return;
    }
    document.getElementById('auth-modal').classList.add('show');
    switchAuthSection('signin');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('show');
}

function switchAuthSection(section) {
    const signinSec = document.getElementById('signin-section');
    const signupSec = document.getElementById('signup-section');
    const title = document.getElementById('auth-modal-title');
    
    if (section === 'signin') {
        signinSec.style.display = 'block';
        signupSec.style.display = 'none';
        title.textContent = 'เข้าสู่ระบบ (Sign In)';
    } else {
        signinSec.style.display = 'none';
        signupSec.style.display = 'block';
        title.textContent = 'สมัครสมาชิกใหม่ (Sign Up)';
    }
    
    // Clear alerts errors
    document.getElementById('signin-error-msg').style.display = 'none';
    document.getElementById('signup-error-msg').style.display = 'none';
}

function handleUserSignIn(event) {
    event.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-pass').value;
    const errorEl = document.getElementById('signin-error-msg');
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            userToken = data.token;
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('userToken', userToken);
            
            updateAuthHeaderUI();
            closeAuthModal();
            fetchFavorites();
            
            // Shift tabs if active in bookmarks
            if (activeSidebarTab === 'favorites') {
                switchSidebarTab('favorites');
            }
        } else {
            errorEl.textContent = data.error || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
            errorEl.style.display = 'block';
        }
    })
    .catch(err => {
        console.error(err);
        errorEl.textContent = 'Connection error.';
        errorEl.style.display = 'block';
    });
}

function handleUserSignUp(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-pass').value;
    const errorEl = document.getElementById('signup-error-msg');
    
    fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user;
            userToken = data.token;
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('userToken', userToken);
            
            updateAuthHeaderUI();
            closeAuthModal();
            fetchFavorites();
            
            if (activeSidebarTab === 'favorites') {
                switchSidebarTab('favorites');
            }
        } else {
            errorEl.textContent = data.error || 'เกิดข้อผิดพลาดในการลงทะเบียน';
            errorEl.style.display = 'block';
        }
    })
    .catch(err => {
        console.error(err);
        errorEl.textContent = 'Connection error.';
        errorEl.style.display = 'block';
    });
}

function handleUserLogout() {
    currentUser = null;
    userToken = null;
    favoriteIncidents = [];
    
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userToken');
    
    updateAuthHeaderUI();
    switchSidebarTab('warnings');
}

function updateAuthHeaderUI() {
    const text = document.getElementById('auth-btn-text');
    if (!text) return;
    
    if (currentUser) {
        text.textContent = currentLang === 'th' 
            ? `สวัสดี, ${currentUser.name} (ออก)` 
            : `Hello, ${currentUser.name} (Log out)`;
    } else {
        text.textContent = currentLang === 'th' 
            ? 'เข้าสู่ระบบ / สมัครสมาชิก' 
            : 'Login / Sign Up';
    }
}

// ----------------------------------------------------
// Favorites Bookmarking & Memo Annotations
// ----------------------------------------------------
function fetchFavorites() {
    if (!userToken) return;
    
    fetch('/api/favorites', {
        headers: { 'Authorization': `Bearer ${userToken}` }
    })
    .then(res => res.json())
    .then(data => {
        favoriteIncidents = data;
        
        // Sync star badges
        refreshFeed();
    })
    .catch(err => console.error('Error fetching favorites:', err));
}

// Clicking star bookmark prompts Memo overlays dialogs
function toggleIncidentFavorite(incidentId, event) {
    if (event) event.stopPropagation();
    
    if (!currentUser) {
        alert('กรุณาเข้าสู่ระบบก่อนทำการบันทึกเหตุการณ์โปรด');
        openAuthModal();
        return;
    }

    const existing = favoriteIncidents.find(f => f.id === incidentId);
    
    if (existing) {
        // Edit Memo or remove directly
        const answer = confirm('ต้องการลบเหตุการณ์นี้ออกจากรายการโปรด หรือกด "ยกเลิก" เพื่อพิมพ์แก้ไขบันทึกความทรงจำเพิ่มเติม?');
        if (answer) {
            // Delete bookmark
            fetch(`/api/favorites/${incidentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userToken}` }
            })
            .then(res => res.json())
            .then(() => {
                favoriteIncidents = favoriteIncidents.filter(f => f.id !== incidentId);
                refreshFeed();
                redrawMapMarkers();
            })
            .catch(err => console.error('Error removing favorite:', err));
            return;
        }
    }
    
    // Open Memo Modal to write custom description memo
    document.getElementById('memo-incident-id').value = incidentId;
    document.getElementById('memo-text').value = existing ? existing.memo : '';
    document.getElementById('memo-modal').classList.add('show');
}

function closeMemoModal() {
    document.getElementById('memo-modal').classList.remove('show');
}

function saveFavoriteWithMemo() {
    const incidentId = parseInt(document.getElementById('memo-incident-id').value);
    const memo = document.getElementById('memo-text').value;
    
    fetch('/api/favorites', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ incident_id: incidentId, memo })
    })
    .then(res => res.json())
    .then(data => {
        closeMemoModal();
        fetchFavorites();
    })
    .catch(err => {
        console.error(err);
        alert('ไม่สามารถบันทึกข้อมูลได้ในขณะนี้');
    });
}

function renderFavoritesList() {
    const feed = document.getElementById('feed-container');
    if (!feed) return;
    feed.innerHTML = '';
    
    updateStatistics();

    if (favoriteIncidents.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 10px; font-size:0.85rem;">
                ⭐ ไม่พบรายการโปรดที่บันทึกไว้ คลิกไอคอนรูปดาวในฟีดแจ้งเตือนเพื่อบันทึกเหตุการณ์ประทับจำของคุณ
            </div>
        `;
        return;
    }

    favoriteIncidents.forEach(inc => {
        let distText = translations[currentLang].distance_unknown;
        if (userCoords) {
            const dist = calculateDistance(userCoords.lat, userCoords.lon, inc.latitude, inc.longitude);
            distText = translations[currentLang].distance_km.replace('{dist}', dist.toFixed(2));
        }

        const dateObj = new Date(inc.timestamp);
        const timeFormatted = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.';
        const timeRelative = getRelativeTime(dateObj);

        let disasterIcon = '⚠️';
        if (inc.type === 'earthquake') disasterIcon = '🌋';
        if (inc.type === 'tsunami') disasterIcon = '🌊';
        if (inc.type === 'civil_unrest') disasterIcon = '🔥';
        if (inc.type === 'accident') disasterIcon = '☣️';

        const severityText = translations[currentLang][`opt_${inc.severity}`] || inc.severity;

        const card = document.createElement('div');
        card.className = `incident-card ${inc.severity}`;
        card.onclick = () => focusIncidentOnMap(inc);

        card.innerHTML = `
            ${inc.is_simulation ? `<span class="sim-badge">SIMULATION</span>` : ''}
            <div class="card-header-info">
                <div class="card-title-wrap">
                    <span class="card-icon">${disasterIcon}</span>
                    <span class="card-title">${inc.title}</span>
                </div>
                <span class="severity-badge ${inc.severity}">${severityText}</span>
            </div>
            <div class="card-description">${inc.description || ''}</div>
            
            <!-- Personal memo indicator card block -->
            <div class="user-memo-annotation-block">
                <strong>📝 บันทึกความทรงจำส่วนตัว:</strong>
                <p>${inc.memo || 'ไม่ได้พิมพ์ข้อความ'}</p>
            </div>
            
            <div class="card-meta" style="margin-top:10px;">
                <div class="meta-item">🕒 <strong>${timeRelative}</strong></div>
                <div class="meta-item">📍 <strong>${distText}</strong></div>
                <div class="meta-item">🗺️ <span>${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}</span></div>
            </div>
            
            <button class="favorite-star-btn active" onclick="toggleIncidentFavorite(${inc.id}, event)" title="แก้ไขบันทึก / ลบออกจากรายการโปรด">
                ★
            </button>
        `;
        feed.appendChild(card);
    });

    redrawMapMarkers();
}

// ----------------------------------------------------
// Utility Functions
// ----------------------------------------------------
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getRelativeTime(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return translations[currentLang].time_just_now;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return translations[currentLang].time_minutes_ago.replace('{m}', minutes);
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return translations[currentLang].time_hours_ago.replace('{h}', hours);
    }

    return date.toLocaleDateString(currentLang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' });
}
