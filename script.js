import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, serverTimestamp, updateDoc, getDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIG ---
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

let html5QrCode;
let isScanning = false;
let scannerInitialized = false;

//============== 2. БИЛДИРҮҮЛӨР ЖАНА МОДАЛКАЛАРДЫ БАШКАРУУ =============

// Toast билдирүү
window.showToast = (message, type = "info") => {
    let container = document.getElementById('toast-box');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-box';
        container.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 20001; display: flex; flex-direction: column; align-items: center; width: 90%; pointer-events: none;`;
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: "#00ff88", error: "#ff416c", info: "#00d2ff" };
    const icons = { success: "check_circle", error: "error", info: "info" };
    toast.style.cssText = `background: rgba(25, 25, 25, 0.9); backdrop-filter: blur(15px); color: white; padding: 14px 20px; border-radius: 12px; border-bottom: 3px solid ${colors[type]}; min-width: 280px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 10px; transition: all 0.4s ease; opacity: 0; transform: translateY(-20px); pointer-events: auto;`;
    toast.innerHTML = `<span class="material-icons-round" style="color:${colors[type]}">${icons[type]}</span><span style="flex:1; font-size:14px; font-weight:500;">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; }, 10);
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(-10px)"; setTimeout(() => toast.remove(), 400); }, 3000);
};

// Модалканы жабуу функциясы (X баскычы үчүн)
window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Эгерде билет алуу модалкасы болсо, слайдерди баштапкы абалга келтиребиз
        const slider = document.getElementById('modal-slider');
        if (slider) slider.style.transform = "translateX(0)";
    }
};

// Ырастоо терезеси (Ооба/Жок)
window.askConfirm = (text, onConfirm) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 20000;`;
    overlay.innerHTML = `
        <div style="background: #1a1a1a; padding: 25px; border-radius: 20px; width: 85%; max-width: 320px; text-align: center; color: white; border: 1px solid rgba(255,255,255,0.1);">
            <h3 style="margin: 0 0 15px 0;">Ырастоо</h3>
            <p style="opacity: 0.8; font-size: 14px;">${text}</p>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button id="m-cancel" style="flex: 1; padding: 12px; border: none; border-radius: 10px; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">Жок</button>
                <button id="m-ok" style="flex: 1; padding: 12px; border: none; border-radius: 10px; background: #ff416c; color: white; font-weight: bold;">Ооба</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('m-cancel').onclick = () => overlay.remove();
    document.getElementById('m-ok').onclick = () => { onConfirm(); overlay.remove(); };
};

// --- 3. КИНОЛОР ЖАНА СВАЙП ---
function initMovies() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const main = document.getElementById('main-movie-grid');
        const soon = document.getElementById('soon-movie-grid');
        const adminTabMovies = document.getElementById('tab-movies'); 
        if(main) main.innerHTML = ""; if(soon) soon.innerHTML = "";
        
        let adminHtml = `<button class="btn-main" style="margin-bottom:20px; width:100%;" onclick="document.getElementById('add-movie-modal').style.display='flex'">+ Жаңы кино кошуу</button><div style="display:flex; flex-direction:column; gap:10px;">`;

        snap.forEach(docSnap => {
            const m = docSnap.data();
            const id = docSnap.id;
            
            const movieCard = `
                <div class="glass-card">
                    <img src="${m.image}">
                    <div class="glass-footer">
                        <h3>${m.title}</h3>
                        ${m.category === 'now' ? `<button class="glass-btn" onclick="handleBookingClick('${m.title}')">Билет алуу</button>` : `<span class="glass-date-tag">Жакында</span>`}
                    </div>
                </div>`;
            
            if(m.category === 'now') { if(main) main.innerHTML += movieCard; } 
            else { if(soon) soon.innerHTML += movieCard; }

            adminHtml += `
                <div style="position:relative; overflow:hidden; border-radius:12px; background:#ff416c; height:60px; margin-bottom:8px;">
                    <div id="item-${id}" onclick="toggleSwipe('${id}')" style="display:flex; align-items:center; justify-content:space-between; background:#1a1a1a; padding:0 15px; position:relative; z-index:2; transition:transform 0.3s ease; height:100%; border:1px solid rgba(255,255,255,0.05); border-radius:12px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${m.image}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                            <div style="text-align:left;">
                                <div style="color:white; font-weight:600; font-size:14px;">${m.title}</div>
                                <div style="font-size:11px; color:gray;">${m.category === 'now' ? 'Прокатта' : 'Жакында'}</div>
                            </div>
                        </div>
                        <span class="material-icons-round" style="color:rgba(255,255,255,0.2);">chevron_left</span>
                    </div>
                    <div onclick="deleteMovie('${id}')" style="position:absolute; right:0; top:0; bottom:0; width:80px; background:#ff416c; color:white; display:flex; align-items:center; justify-content:center; z-index:1; cursor:pointer;">
                        <span class="material-icons-round">delete_outline</span>
                    </div>
                </div>`;
            
            setTimeout(() => initSwipeLogic(id), 100);
        });
        if(adminTabMovies) adminTabMovies.innerHTML = adminHtml + `</div>`;
    });
}

function initSwipeLogic(id) {
    const el = document.getElementById(`item-${id}`);
    if (!el) return;
    let startX = 0;
    el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
    el.addEventListener('touchmove', (e) => {
        let diff = startX - e.touches[0].clientX;
        if (diff > 0 && diff <= 80) el.style.transform = `translateX(-${diff}px)`;
    }, {passive: true});
    el.addEventListener('touchend', (e) => {
        if (startX - e.changedTouches[0].clientX > 40) el.style.transform = `translateX(-80px)`;
        else el.style.transform = `translateX(0)`;
    });
}

window.toggleSwipe = (id) => {
    const el = document.getElementById(`item-${id}`);
    if(!el) return;
    el.style.transform = (el.style.transform === 'translateX(-80px)') ? 'translateX(0)' : 'translateX(-80px)';
};

// --- 4. БИЛЕТ АЛУУ ЖАНА КАДАМДАР (КИЙИНКИ БАСКЫЧЫ) ---
window.handleBookingClick = (title) => {
    if(!auth.currentUser) {
        window.showToast("Билет алуу үчүн профиль бөлүмүнөн катталыңыз!", "info");
        window.switchSection('profile-section');
    } else {
        document.getElementById('selected-movie-name').innerText = title;
        document.getElementById('booking-modal').style.display = 'flex';
        const slider = document.getElementById('modal-slider');
        if (slider) slider.style.transform = "translateX(0)";
    }
};

// "Кийинки" баскычы үчүн функция
window.goToStep2 = () => {
    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    if(!name || !phone) return window.showToast("Атыңызды жана номериңизди жазыңыз!", "error");
    
    const slider = document.getElementById('modal-slider');
    if (slider) {
        slider.style.transform = "translateX(-50%)"; // Экинчи кадамга (төлөмгө) өтүү
    }
};

window.handlePaymentSubmit = async () => {
    const file = document.getElementById('check-file-input').files[0];
    const btn = document.getElementById('final-confirm-btn');
    if(!file) return window.showToast("Төлөмдүн чегин жүктөңүз!", "error");
    
    try {
        btn.innerText = "Жөнөтүлүүдө..."; btn.disabled = true;
        const url = await uploadToImgBB(file);
        await addDoc(collection(db, "user_tickets"), {
            userId: auth.currentUser.uid,
            userName: document.getElementById('user-name').value,
            userPhone: document.getElementById('user-phone').value,
            movieTitle: document.getElementById('selected-movie-name').innerText,
            count: document.getElementById('ticket-count').value,
            checkImg: url,
            status: "pending",
            createdAt: serverTimestamp()
        });
        window.showToast("Билетке билдирме жөнөтүлдү!", "success");
        window.closeModal('booking-modal');
    } catch (e) { 
        window.showToast("Ката кетти!", "error"); 
    } finally { 
        btn.innerText = "Ырастоо"; btn.disabled = false; 
    }
};

// --- 5. АВТОРИЗАЦИЯ ---
onAuthStateChanged(auth, (user) => {
    const navItem = document.querySelector('[data-target="profile-section"]');
    if (user) {
        document.getElementById('auth-ui').style.display = "none";
        const isAdmin = user.email === ADMIN_EMAIL;
        document.getElementById('admin-panel-ui').style.display = isAdmin ? "block" : "none";
        document.getElementById('user-profile-ui').style.display = isAdmin ? "none" : "block";
        document.getElementById('user-email-display').innerText = user.displayName || user.email;
        if (isAdmin && navItem) {
            navItem.querySelector('.material-icons-round').innerText = "admin_panel_settings";
            navItem.querySelector('span:not(.material-icons-round)').innerText = "Админ";
            initAdminTickets();
        }
        initUserTickets(user.uid);
    } else {
        document.getElementById('auth-ui').style.display = "block";
        document.getElementById('admin-panel-ui').style.display = "none";
        document.getElementById('user-profile-ui').style.display = "none";
    }
});

// Калган админ функциялары (Кино өчүрүү ж.б.)
window.deleteMovie = (id) => {
    window.askConfirm("Бул кинону өчүрөсүзбү?", async () => {
        try { await deleteDoc(doc(db, "movies", id)); window.showToast("Кино өчүрүлдү", "success"); }
        catch { window.showToast("Өчүрүүдө ката кетти", "error"); }
    });
};

window.handleAddMovie = async () => {
    const title = document.getElementById('new-movie-title').value;
    const category = document.getElementById('new-movie-category').value;
    const file = document.getElementById('movie-file-input')?.files[0];
    if(!title || !file) return window.showToast("Маалыматты толук толтуруңуз!", "error");
    
    try {
        window.showToast("Кино жүктөлүүдө...", "info");
        const url = await uploadToImgBB(file);
        await addDoc(collection(db, "movies"), { title, category, image: url });
        window.showToast("Жаңы кино кошулду!", "success");
        window.closeModal('add-movie-modal');
    } catch { window.showToast("Жүктөөдө ката кетти!", "error"); }
};

// --- 6. БИЛЕТТЕР ЖАНА QR ---
function initUserTickets(uid) {
    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const list = document.getElementById('user-tickets-list');
        if(!list) return; list.innerHTML = "";
        snap.forEach(docSnap => {
            const t = docSnap.data();
            if(t.userId === uid) {
                const isApproved = t.status === 'approved';
                const isScanned = t.status === 'scanned';
                list.innerHTML += `
                    <div style="margin: 15px 0; background:white; border-radius:18px; padding:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(0,0,0,0.1); ${isScanned ? 'opacity:0.5' : ''}">
                        <div style="color:#1a1a1a">
                            <h4 style="margin:0">${t.movieTitle}</h4>
                            <small style="color:${isApproved ? 'green' : (isScanned ? 'gray' : 'orange')}">
                                ${isScanned ? 'Колдонулган' : (isApproved ? 'Ырасталган (QR)' : 'Күтүүдө')}
                            </small>
                        </div>
                        <div id="qr-${docSnap.id}"></div>
                    </div>`;
                if(isApproved) {
                    setTimeout(() => {
                        const qrDiv = document.getElementById(`qr-${docSnap.id}`);
                        if(qrDiv) { qrDiv.innerHTML = ""; new QRCode(qrDiv, { text: docSnap.id, width: 60, height: 60 }); }
                    }, 200);
                }
            }
        });
    });
}

// Калган жардамчы функциялар
window.switchSection = (targetId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(targetId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === targetId) nav.classList.add('active');
    });
};

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const data = await res.json();
    return data.data.url;
}

// Секцияларды алмаштыруу (Админ)
window.switchAdminTab = (tab) => {
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    document.getElementById('tab-'+tab).style.display = 'block';
    if(tab === 'scanner') startScanner();
};

// DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    initMovies();
    
    // Жабуу (X) баскычтарын иштетүү
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            const modal = btn.closest('.modal-overlay');
            if(modal) modal.style.display = 'none';
        };
    });

    document.getElementById('login-action-btn').onclick = window.handleLogin;
    document.getElementById('reg-action-btn').onclick = () => {
        // Каттоо логикасы...
    };
    
    document.querySelectorAll('.nav-item').forEach(n => n.onclick = () => window.switchSection(n.dataset.target));
});
    
