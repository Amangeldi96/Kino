import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, 
    deleteDoc, addDoc, serverTimestamp, getDoc, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- FIREBASE КОНФИГУРАЦИЯ ---
const firebaseConfig = { 
    apiKey: "AIzaSyBNLp79nMRg1hdQVE74sOtc4IYO3yYI2dY",
    authDomain: "kino-a534f.firebaseapp.com",
    projectId: "kino-a534f",
    storageBucket: "kino-a534f.firebasestorage.app",
    messagingSenderId: "409051638364",
    appId: "1:409051638364:web:396ddd729f9cb833075499"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMIN_EMAIL = "cinematoktogul@gmail.com";
const IMGBB_API_KEY = "B0e9710e452799f0de0e787b998c600d";

let tempSessions = [];
let selectedType = "food"; 
let selectedCat = "now"; // Демейки: "Азыр кинодо"

// --- 1. ПРЕМИУМ ТОСТ (БИЛДИРҮҮЛӨР) ---
window.showToast = (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');
    toast.innerHTML = `<span class="material-icons-round">${icon}</span><div class="toast-message">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

// --- 2. CUSTOM CONFIRM (ЫРАСТОО) ---
window.askConfirm = (title, msg) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm');
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;
        modal.style.display = 'flex';
        
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        
        const onYes = () => { modal.style.display = 'none'; cleanup(); resolve(true); };
        const onNo = () => { modal.style.display = 'none'; cleanup(); resolve(false); };
        const cleanup = () => {
            yesBtn.removeEventListener('click', onYes);
            noBtn.removeEventListener('click', onNo);
        };
        yesBtn.addEventListener('click', onYes);
        noBtn.addEventListener('click', onNo);
    });
};

// --- 3. UI БАШКАРУУ (ТАБТАР ЖАНА DROPDOWN) ---
window.switchAdminTab = (id) => {
    // Бардык табтарды жашыруу
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    
    // Тандалган табды көрсөтүү
    const target = id === 'requests' ? 'tab-requests' : (id === 'movies' ? 'tab-movies' : 'tab-scanner');
    const targetEl = document.getElementById(target);
    if (targetEl) targetEl.style.display = 'block';
    
    // Навигациядагы активдүү классты алмаштыруу
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    const activeNav = document.getElementById('nav-' + id);
    if (activeNav) activeNav.classList.add('active');

    // --- QR СКАНЕРДИ БАШКАРУУ ---
    if (id === 'scanner') {
        // Эгер "Сканер" табы тандалса, камераны иштетүү
        if (typeof startQRScanner === "function") {
            startQRScanner();
        }
    } else {
        // Башка табга өткөндө камераны өчүрүү (ресурсту үнөмдөө үчүн)
        if (typeof stopQRScanner === "function") {
            stopQRScanner();
        }
    }
};

window.toggleDropdown = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.style.display === 'block';
    document.querySelectorAll('.dropdown-options').forEach(d => d.style.display = 'none');
    el.style.display = isOpen ? 'none' : 'block';
};

window.selectType = (val, label) => {
    selectedType = val;
    const labelEl = document.getElementById('type-label');
    const optionsEl = document.getElementById('type-options');
    if (labelEl) labelEl.innerText = label;
    if (optionsEl) optionsEl.style.display = 'none';
};


// КАТЕГОРИЯ ТАНДОО ЖАНА ИНПУТТАРДЫ АЛМАШТЫРУУ
window.selectCat = (val, label) => {
    selectedCat = val;
    document.getElementById('cat-label').innerText = label;
    document.getElementById('cat-options').style.display = 'none';

    const sessSec = document.getElementById('section-sessions-admin');
    const dateSec = document.getElementById('section-date-admin');

    if (val === 'soon') {
        sessSec.style.display = 'none';
        dateSec.style.display = 'block';
        tempSessions = []; 
    } else {
        sessSec.style.display = 'block';
        dateSec.style.display = 'none';
    }
};

window.toggleAdminAccordion = (id) => {
    const el = document.getElementById(id);
    const arrowSuffix = id.includes('movies') ? 'movies' : 'menu';
    const arrow = document.getElementById('arrow-' + arrowSuffix);
    const isVisible = el.style.display === 'block';
    
    document.querySelectorAll('.admin-accordion-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.arrow-icon').forEach(a => a.style.transform = 'rotate(0deg)');
    
    if(!isVisible) {
        el.style.display = 'block';
        if(arrow) arrow.style.transform = 'rotate(180deg)';
    }
};

// --- 4. АДМИН ТЕКШЕРҮҮ ---
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "index.html";
    } else {
        initAdminTickets();
        initMoviesAdmin();
        initMenuAdmin();
    }
});

// --- 5. МЕНЮ БАШКАРУУ (АТКН) ---
function initMenuAdmin() {
    const foodList = document.getElementById('admin-food-list');
    const drinkList = document.getElementById('admin-drink-list');
    
    const q = query(collection(db, "atkn_menu"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        if(!foodList || !drinkList) return;
        
        // Тизмелерди тазалоо жана баш сөздөрүн кошуу
        foodList.innerHTML = `<h4 style="color: #94a3b8; margin: 15px 0 10px 5px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="font-size: 18px; color: #84CC16;">restaurant</span> Тамак-аштар</h4>`;
            
        drinkList.innerHTML = `<h4 style="color: #94a3b8; margin: 25px 0 10px 5px; font-size: 14px; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="font-size: 18px; color: #0ea5e9;">local_bar</span> Суусундуктар</h4>`;

        let foodCount = 0;
        let drinkCount = 0;

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const html = `
                <div class="menu-admin-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); padding:14px; border-radius:18px; margin-bottom:10px; border: 1px solid rgba(255,255,255,0.05); transition: 0.3s;">
                    <div>
                        <div style="font-weight:700; font-size: 15px; color: #fff;">${item.name}</div>
                        <div style="color:#a855f7; font-size:13px; font-weight: 600; margin-top: 2px;">${item.price} сом</div>
                    </div>
                    <button onclick="window.deleteMenuItem('${docSnap.id}', '${item.name}')" style="background:none; border:none; color:#06B6D4; width:40px; height:40px; border-radius:12px; cursor:pointer; display: flex; align-items: center; justify-content: center;">
                        <span class="material-icons-round" style="font-size:20px;">delete</span>
                    </button>
                </div>`;
            
            if (item.type === "food") {
                foodList.innerHTML += html;
                foodCount++;
            } else {
                drinkList.innerHTML += html;
                drinkCount++;
            }
        });

        // Эгер тизме бош болсо, билдирүү чыгаруу
        if(foodCount === 0) foodList.innerHTML += `<div style="color: #475569; font-size: 13px; padding: 10px;">Азырынча тамак жок...</div>`;
        if(drinkCount === 0) drinkList.innerHTML += `<div style="color: #475569; font-size: 13px; padding: 10px;">Азырынча суусундук жок...</div>`;
    });
}


// --- 6. КИНОЛОРДУ БАШКАРУУ (АЗЫР / ЖАКЫНДА) ---
window.openAddMovieFs = () => {
    tempSessions = [];
    document.getElementById('added-sessions-preview').innerHTML = "";
    // Инпутту баштапкы абалга келтирүү
    document.getElementById('new-movie-title').value = "";
    document.getElementById('movie-max-seats').value = "34"; 
    document.getElementById('add-movie-modal').style.display = 'flex';
    window.selectCat('now', 'Азыр кинодо');
};

window.closeAddMovieFs = () => document.getElementById('add-movie-modal').style.display = 'none';

window.addSessionToList = () => {
    const t = document.getElementById('session-time-input').value;
    const p = document.getElementById('session-price-input').value;
    if(!t || !p) return showToast("Убакыт жана баа!", "error");
    tempSessions.push({ time: t, price: Number(p) });
    const chip = document.createElement('div');
    chip.style = "background:#a855f7; padding:6px 12px; border-radius:12px; font-size:12px; color:white; margin:2px; display:flex; align-items:center; gap:5px;";
    chip.innerHTML = `<span>${t} - ${p}с</span><i class="material-icons-round" style="font-size:14px; cursor:pointer;" onclick="this.parentElement.remove()">close</i>`;
    document.getElementById('added-sessions-preview').appendChild(chip);
};

window.handleAddMovie = async (event) => {
    // Формадагы маалыматтарды алуу
    const title = document.getElementById('new-movie-title').value.trim();
    const maxSeats = document.getElementById('movie-max-seats').value;
    const fileInput = document.getElementById('movie-file-input');
    const file = fileInput.files[0];
    
    // Баскычты таап алуу (Жүктөө баскычы)
    const btn = document.querySelector('#add-movie-modal .btn-main');

    // Текшерүүлөр
    if (!title || !file) return showToast("Аты жана сүрөтү керек!", "error");
    
    let releaseDate = "";
    if (selectedCat === 'now' && tempSessions.length === 0) return showToast("Сеанстарды кошуңуз!", "error");
    if (selectedCat === 'soon') {
        releaseDate = document.getElementById('movie-release-date').value;
        if (!releaseDate) return showToast("Датаны тандаңыз!", "error");
    }

    try {
        // 1. Баскычты өчүрүү жана текстти алмаштыруу (Кайра-кайра басылбашы үчүн)
        btn.disabled = true;
        btn.style.opacity = "0.7";
        btn.innerHTML = `<span style="display:flex; align-items:center; gap:8px; justify-content:center;">
                            Жүктөлүүдө... <i class="material-icons-round rotate">sync</i>
                         </span>`;
        
        // 2. Сүрөттү ImgBB серверине жүктөө
        const fd = new FormData(); 
        fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const imgData = await res.json();

        if (!imgData.success) throw new Error("Сүрөт жүктөлбөй калды");

        // 3. Базага сактала турган объект
        const movieObj = { 
            title, 
            category: selectedCat, 
            image: imgData.data.url, 
            maxSeats: Number(maxSeats) || 34, // Инпуттан алынган сан же автоматтык түрдө 34
            createdAt: serverTimestamp() 
        };

        if (selectedCat === 'now') {
            movieObj.sessions = tempSessions;
        } else { 
            movieObj.releaseDate = releaseDate; 
            movieObj.sessions = []; 
        }

        // 4. Firestore базасына кошуу
        await addDoc(collection(db, "movies"), movieObj);
        
        showToast("Тасма ийгиликтүү кошулду!", "success");
        closeAddMovieFs();

    } catch (e) { 
        console.error(e);
        showToast("Ката кетти! Кайра аракет кылыңыз.", "error"); 
    } finally { 
        // 5. Баскычты кайра активдештирүү
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerText = "Жүктөө"; 
    }
};

function initMoviesAdmin() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const list = document.getElementById('admin-movie-list');
        if(!list) return; 
        list.innerHTML = "";
        snap.forEach(d => {
            const m = d.data();
            list.innerHTML += `
                <div class="admin-movie-card" style="display:flex; gap:10px; background:rgba(255,255,255,0.03); padding:10px; border-radius:12px; margin-bottom:8px; align-items:center;">
                    <img src="${m.image}" style="width:40px; height:55px; border-radius:5px; object-fit:cover;">
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:700;">${m.title}</div>
                        <div style="font-size:11px; opacity:0.5;">
                            ${m.category === 'now' ? 'Кинодо' : 'Жакында'} | <span style="color:#00ffcc;">${m.maxSeats} орун</span>
                        </div>
                    </div>
                    <button onclick="window.deleteMovie('${d.id}')" style="background:none; border:none; color:#06B6D4;">
                        <span class="material-icons-round">delete</span>
                    </button>
                </div>`;
        });
    });
}

window.deleteMovie = async (id) => {
    if (await askConfirm("Өчүрүү", "Тасма өчүрүлсүнбү?")) { 
        await deleteDoc(doc(db, "movies", id)); 
    }
};


// --- БААРДЫК БАСКЫЧТАРДЫН ЛОГИКАСЫ ---

// Чекти көрүү
window.viewReceipt = (url) => {
    if (!url || url === 'undefined') return window.showToast("Чек табылган жок!", "error");
    const win = window.open("");
    win.document.write(`
        <body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center;">
            <img src="${url}" style="max-width:100%; max-height:100vh; object-fit:contain;">
        </body>
    `);
};

// Билетти ырастоо
window.approveTicket = async (id) => {
    const ok = await window.askConfirm("Ырастоо", "Бул билетти ырастап, QR кодду активдештиресизби?");
    if (!ok) return;

    try {
        const ticketRef = doc(db, "user_tickets", id);
        await updateDoc(ticketRef, { status: "approved" });
        window.showToast("Билет ийгиликтүү ырасталды!", "success");
    } catch (e) {
        window.showToast("Ката: " + e.message, "error");
    }
};

// Билетти өчүрүү
window.deleteTicket = async (id) => {
    const ok = await window.askConfirm("Өчүрүү", "Бул билетти базадан биротоло өчүрөсүзбү?");
    if (!ok) return;

    try {
        await deleteDoc(doc(db, "user_tickets", id));
        window.showToast("Билет өчүрүлдү", "success");
    } catch (e) {
        window.showToast("Өчүрүүдө ката кетти", "error");
    }
};

// --- ЧЫГУУ ЖАНА БАШКЫ БЕТКЕ ӨТҮҮ (Эми иштейт) ---
window.handleLogout = async () => { 
    if(await askConfirm("Чыгуу", "Админ панелден чыгасызбы?")) { 
        try {
            await signOut(auth); 
            window.location.href = "index.html"; 
        } catch (e) {
            showToast("Чыгууда ката кетти", "error");
        }
    } 
};

window.goHome = () => {
    window.location.href = "index.html";
};




// --- 7. БИЛЕТТЕРДИ БАШКАРУУ (PREMIUM GLASS UI) ---
function initAdminTickets() {
    const list = document.getElementById('admin-tickets-list');
    const approvedList = document.getElementById('approved-tickets-list');
    const logoutBtnContainer = document.getElementById('logout-container');

    // Чыгуу баскычын кошуу (эгер контейнер болсо)
    if (logoutBtnContainer) {
        logoutBtnContainer.innerHTML = `
            <button onclick="window.adminLogout()" style="display:flex; align-items:center; gap:8px; padding:12px 24px; background:rgba(255,77,77,0.1); border:1px solid rgba(255,77,77,0.3); border-radius:15px; color:#ff4d4d; font-weight:800; cursor:pointer; transition:0.3s;">
                <span class="material-icons-round">logout</span> ЧЫГУУ
            </button>
        `;
    }

    onSnapshot(collection(db, "user_tickets"), (snap) => {
        if(!list) return;
        list.innerHTML = ""; 
        if(approvedList) approvedList.innerHTML = "";
        
        snap.forEach((d) => {
            const t = d.data();
            const ticketId = d.id;
            const receiptUrl = t.checkImg || t.paymentImg || Object.values(t).find(v => typeof v === 'string' && v.startsWith('http'));

         const ticketHTML = `
<div class="ticket-card" style="
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    color: #fff;
    animation: fadeIn .3s ease-out;
">

    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
            <div style="background:#FFD700; width:3px; height:16px; border-radius:4px;"></div>
            <span style="font-weight:800; font-size:14px; line-height:1.2; max-width:180px;">
                ${t.movieTitle}
            </span>
        </div>
        <button onclick="window.deleteTicket('${ticketId}')" style="
            background: rgba(77,77,77,0.15);
            border: none; color: #ffd700;
            width: 26px; height: 26px;
            border-radius: 8px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
        ">
            <span class="material-icons-round" style="font-size:16px;">delete_outline</span>
        </button>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:10px; padding:0 2px;">
        <div>
            <div style="font-size:10px; opacity:0.6; text-transform:uppercase; letter-spacing:0.5px;">Кардар</div>
            <div style="font-size:13px; font-weight:700;">${t.userName || 'Аты жок'}</div>
            <div style="font-size:12px; color:#00ffcc; font-weight:600; display:flex; align-items:center; gap:3px; margin-top:2px;">
                <span class="material-icons-round" style="font-size:12px;">call</span>
                ${t.userPhone || '—'}
            </div>
        </div>
        
        <div style="background:rgba(255,255,255,0.08); padding:4px 8px; border-radius:8px; display:flex; align-items:center; gap:4px; border:1px solid rgba(255,255,255,0.05);">
            <span class="material-icons-round" style="color:#FFD700; font-size:13px;">schedule</span>
            <span style="font-size:13px; font-weight:800;">${t.sessionTime}</span>
        </div>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:8px 10px; border-radius:12px;">
        
        <div style="display:flex; gap:10px;">
            <div style="display:flex; align-items:center; gap:3px;">
                <span class="material-icons-round" style="color:#FFD700; font-size:14px;">person</span>
                <span style="font-size:13px; font-weight:700;">${t.adults || 0}</span>
            </div>
            <div style="display:flex; align-items:center; gap:3px;">
                <span class="material-icons-round" style="color:#4ade80; font-size:14px;">child_care</span>
                <span style="font-size:13px; font-weight:700;">${t.children || 0}</span>
            </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
            <div style="text-align:right; margin-right:4px;">
                <div style="font-size:13px; font-weight:900; color:#fff;">
                    ${t.totalPrice} <span style="font-size:9px; font-weight:400; opacity:0.8;">сом</span>
                </div>
            </div>
            
            <div style="display:flex; gap:5px;">
                ${receiptUrl ? `
                <button onclick="window.viewReceipt('${receiptUrl}')" style="
                    background:rgba(255,215,0,0.1);
                    border:1px solid rgba(255,215,0,0.4);
                    color:#FFD700; width:28px; height:28px;
                    border-radius:8px; cursor:pointer;
                    display:flex; align-items:center; justify-content:center;
                ">
                    <span class="material-icons-round" style="font-size:16px;">receipt_long</span>
                </button>
                ` : ''}
                ${renderStatusButton(t, ticketId)}
            </div>
        </div>
    </div>

</div>
`;


            if(t.status === 'pending') list.innerHTML += ticketHTML;
            else if(approvedList) approvedList.innerHTML += ticketHTML;
        });
    });
}

function renderStatusButton(t, ticketId) {
    // Баскычтын жалпы базалык стили (бийиктиги жана текст өлчөмү компактталды)
    const baseStyle = `
        height: 29px; 
        padding: 0 12px; 
        border-radius: 10px; 
        font-weight: 800; 
        font-size: 11px; 
        display: flex; 
        align-items: center; 
        gap: 5px; 
        cursor: pointer; 
        border: none; 
        transition: 0.2s;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    `;

    if (t.status === 'pending') {  
        return `  
        <button onclick="window.approveTicket('${ticketId}')" style="${baseStyle} 
            background: linear-gradient(135deg, #6366f1, #a855f7); 
            color: #fff; 
            box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        ">  
            <span class="material-icons-round" style="font-size: 16px;">verified</span> Ырастоо  
        </button>`;  
    } else if (t.status === 'approved') {  
        return `  
        <div style="${baseStyle} 
            background: rgba(255, 215, 0, 0.1); 
            border: 1px solid rgba(255, 215, 0, 0.4); 
            color: #FFD700; 
            cursor: default;
        ">  
            <span class="material-icons-round" style="font-size: 16px;">qr_code_2</span> Активдүү  
        </div>`;  
    } else {  
        return `  
        <div style="${baseStyle} 
            background: rgba(0, 255, 204, 0.1); 
            border: 1px solid rgba(0, 255, 204, 0.4); 
            color: #00ffcc; 
            cursor: default;
        ">  
            <span class="material-icons-round" style="font-size: 16px;">check_circle</span> Колдонулду  
        </div>`;  
    }
}










// --- 8. QR СКАНЕР ЛОГИКАСЫ ---
let html5QrCode = null;

window.startQRScanner = async () => {
    const scannerContainer = document.getElementById('reader');
    if (!scannerContainer) return;

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 15, qrbox: { width: 250, height: 250 } };

    try {
        await html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess);
    } catch (err) {
        showToast("Камера иштеген жок!", "error");
    }
};

window.stopQRScanner = async () => {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode = null;
        } catch (e) { console.error(e); }
    }
};

async function onScanSuccess(decodedText) {
    if (html5QrCode) await html5QrCode.pause();
    
    try {
        const ticketRef = doc(db, "user_tickets", decodedText);
        const ticketSnap = await getDoc(ticketRef);

        if (ticketSnap.exists()) {
            const data = ticketSnap.data();
            const seats = data.selectedSeats ? data.selectedSeats.length : 1;

            if (data.status === 'checked-in') {
                await Swal.fire("КАТА", "Бул билет колдонулуп бүткөн! ❌", "error");
            } 
            else if (data.status === 'approved') {
                const confirm = await askConfirm("КИРҮҮГӨ УРУКСАТ", `Кардар: ${data.userName}\nОрундар: ${seats}\nКино: ${data.movieTitle}`);
                if (confirm) {
                    await updateDoc(ticketRef, { status: "checked-in" });
                    showToast("Кирүү катталды! ✅", "success");
                }
            } 
            else {
                showToast("Билет али ырастала элек! ⚠️", "warning");
            }
        } else {
            showToast("Табылбады!", "error");
        }
    } catch (e) {
        showToast("QR ката!", "error");
    }

    setTimeout(async () => {
        if (html5QrCode) await html5QrCode.resume();
    }, 2500);
}
