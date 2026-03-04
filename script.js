import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut 
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

//============== 2. ЗАМАНБАП БИЛДИРҮҮЛӨР =============
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
    setTimeout(() => { 
        toast.style.opacity = "0"; 
        toast.style.transform = "translateY(-10px)"; 
        setTimeout(() => toast.remove(), 400); 
    }, 3000);
};

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
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('m-cancel').onclick = () => overlay.remove();
    document.getElementById('m-ok').onclick = () => { onConfirm(); overlay.remove(); };
};

// --- 3. ФУНКЦИЯЛАР ---
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Сүрөт жүктөлбөй калды!");
}

window.switchSection = (targetId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(targetId);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === targetId) nav.classList.add('active');
    });
};

// --- 4. СВАЙП ЛОГИКАСЫ ---
let startX = 0;
window.initSwipe = (id) => {
    const el = document.getElementById(`item-${id}`);
    if(!el) return;
    el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
    el.addEventListener('touchmove', (e) => {
        let moveX = e.touches[0].clientX;
        let diff = startX - moveX;
        if (diff > 0 && diff <= 80) el.style.transform = `translateX(-${diff}px)`;
    }, {passive: true});
    el.addEventListener('touchend', (e) => {
        let endX = e.changedTouches[0].clientX;
        if (startX - endX > 40) el.style.transform = `translateX(-80px)`;
        else el.style.transform = `translateX(0)`;
    });
};

window.toggleSwipe = (id) => {
    const el = document.getElementById(`item-${id}`);
    if(!el) return;
    const isSwiped = el.style.transform === 'translateX(-80px)';
    el.style.transform = isSwiped ? 'translateX(0)' : 'translateX(-80px)';
};

// --- 5. БРОНДОО ---
window.openBooking = (title) => {
    document.getElementById('selected-movie-name').innerText = title;
    document.getElementById('booking-modal').style.display = 'flex';
    window.goToStep1();
};
window.closeBookingModal = () => document.getElementById('booking-modal').style.display = 'none';
window.goToStep1 = () => document.getElementById('modal-slider').style.transform = "translateX(0)";
window.goToStep2 = () => {
    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    if(!name || !phone) return window.showToast("Маалыматты толтуруңуз!", "error");
    document.getElementById('modal-slider').style.transform = "translateX(-50%)";
};

window.handlePaymentSubmit = async () => {
    const fileEl = document.getElementById('check-file-input');
    const file = fileEl?.files[0];
    const btn = document.getElementById('final-confirm-btn');
    if(!file) return window.showToast("Чекти жүктөңүз!", "error");
    try {
        btn.disabled = true; btn.innerText = "Жөнөтүлүүдө...";
        const checkUrl = await uploadToImgBB(file);
        await addDoc(collection(db, "user_tickets"), {
            userId: auth.currentUser.uid,
            userName: document.getElementById('user-name').value,
            userPhone: document.getElementById('user-phone').value,
            movieTitle: document.getElementById('selected-movie-name').innerText,
            count: document.getElementById('ticket-count').value,
            checkImg: checkUrl,
            status: "pending",
            createdAt: serverTimestamp()
        });
        window.showToast("Чек жөнөтүлдү!", "success");
        window.closeBookingModal();
    } catch (e) { window.showToast(e.message, "error"); }
    finally { btn.disabled = false; btn.innerText = "Ырастоо"; }
};

// --- 6. АДМИН ПАНЕЛЬ ---
window.switchAdminTab = (tabName, event) => {
    document.querySelectorAll('.admin-tab-content').forEach(tab => tab.style.display = 'none');
    const targetTab = document.getElementById('tab-' + tabName);
    if(targetTab) targetTab.style.display = 'block';
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    if (tabName === 'scanner' && !scannerInitialized) setTimeout(() => startScanner(), 300);
};

window.handleAddMovie = async () => {
    const title = document.getElementById('new-movie-title').value;
    const category = document.getElementById('new-movie-category').value;
    const file = document.getElementById('movie-file-input')?.files[0];
    if (!title || !file) return window.showToast("Толук толтуруңуз!", "error");
    try {
        const url = await uploadToImgBB(file);
        await addDoc(collection(db, "movies"), { title, category, image: url });
        window.showToast("Кино кошулду!", "success");
        document.getElementById('add-movie-modal').style.display = 'none';
    } catch (e) { window.showToast("Ката кетти", "error"); }
};

window.deleteMovie = (id) => {
    window.askConfirm("Бул кинону өчүрөсүзбү?", async () => {
        try {
            await deleteDoc(doc(db, "movies", id));
            window.showToast("Өчүрүлдү", "success");
        } catch (e) { window.showToast("Ката!", "error"); }
    });
};

window.approveTicket = async (id) => {
    window.askConfirm("Билетти ырастайсызбы?", async () => {
        await updateDoc(doc(db, "user_tickets", id), { status: "approved" });
        window.showToast("Ырасталды!", "success");
    });
};

window.deleteTicket = (id) => {
    window.askConfirm("Билетти өчүрөсүзбү?", async () => {
        await deleteDoc(doc(db, "user_tickets", id));
        window.showToast("Өчүрүлдү", "success");
    });
};

// --- 7. МОНИТОРИНГ ---
onAuthStateChanged(auth, (user) => {
    const navItem = document.querySelector('[data-target="profile-section"]');
    if (user) {
        document.querySelector('.auth-wrapper').style.display = "none";
        const isAdmin = user.email === ADMIN_EMAIL;
        document.getElementById('admin-panel-ui').style.display = isAdmin ? "block" : "none";
        document.getElementById('user-profile-ui').style.display = isAdmin ? "none" : "block";
        if (isAdmin && navItem) {
            navItem.querySelector('.material-icons-round').innerText = "admin_panel_settings";
            navItem.querySelector('span:not(.material-icons-round)').innerText = "Админ";
            navItem.style.color = "#00d2ff";
            initAdminPanel();
        }
        initData();
    } else {
        document.querySelector('.auth-wrapper').style.display = "block";
    }
});

function initData() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const main = document.getElementById('main-movie-grid');
        const soon = document.getElementById('soon-movie-grid');
        const adminMovies = document.getElementById('tab-movies'); 
        if(main) main.innerHTML = ""; if(soon) soon.innerHTML = "";
        let adminHtml = `<button class="btn-main" style="margin-bottom:20px; width:100%;" onclick="document.getElementById('add-movie-modal').style.display='flex'">+ Жаңы кино кошуу</button><div style="display:flex; flex-direction:column; gap:10px;">`;
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const id = docSnap.id;
            const html = `<div class="glass-card"><img src="${m.image}"><div class="glass-footer"><h3>${m.title}</h3>${m.category === 'now' ? `<button class="glass-btn" onclick="openBooking('${m.title}')">Билет алуу</button>` : `<span class="glass-date-tag">Жакында</span>`}</div></div>`;
            if(m.category === 'now') { if(main) main.innerHTML += html; } 
            else { if(soon) soon.innerHTML += html; }
            adminHtml += `<div style="position:relative; overflow:hidden; border-radius:12px; background:#ff416c; height:60px;"><div id="item-${id}" onclick="toggleSwipe('${id}')" style="display:flex; align-items:center; justify-content:space-between; background:#1a1a1a; padding:0 15px; position:relative; z-index:2; transition:transform 0.3s ease; height:100%; border:1px solid rgba(255,255,255,0.05); border-radius:12px;"><div style="display:flex; align-items:center; gap:12px;"><img src="${m.image}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;"><div style="text-align:left;"><div style="color:white; font-weight:600; font-size:14px;">${m.title}</div><div style="font-size:11px; color:gray;">${m.category === 'now' ? 'Прокатта' : 'Жакында'}</div></div></div><span class="material-icons-round" style="color:rgba(255,255,255,0.2);">chevron_left</span></div><div onclick="deleteMovie('${id}')" style="position:absolute; right:0; top:0; bottom:0; width:80px; background:#ff416c; color:white; display:flex; align-items:center; justify-content:center; z-index:1;"><span class="material-icons-round">delete_outline</span></div></div>`;
            setTimeout(() => window.initSwipe(id), 100);
        });
        if(adminMovies) adminMovies.innerHTML = adminHtml + `</div>`;
    });

    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const list = document.getElementById('user-tickets-list');
        if(!list) return; 
        list.innerHTML = "";
        snap.forEach(docSnap => {
            const t = docSnap.data();
            const id = docSnap.id;
            if(t.userId === auth.currentUser?.uid) {
                const isScanned = t.status === 'scanned';
                const isApproved = t.status === 'approved';
                let statusName = isScanned ? "ЖАРАКСЫЗ" : (isApproved ? "ЫРАСТАЛДЫ" : "КҮТҮҮДӨ");
                const cardStyle = isScanned ? "filter: grayscale(0.5); opacity: 0.7;" : "";
                list.innerHTML += `<div style="margin: 15px 0 10px 0; background:white; border-radius:18px; height:120px; display:flex; position:relative; box-shadow: 0 4px 15px rgba(0,0,0,0.1); ${cardStyle}"><div onclick="deleteTicket('${id}')" style="position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; background: #ff416c; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 20; border: 2px solid white;"><span class="material-icons-round" style="font-size: 14px; color: white;">close</span></div><div style="flex:2; padding:12px 15px; color:#1a1a1a; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden;"><div><h2 style="margin:0; font-size:15px; font-weight:700;">${t.movieTitle}</h2><div style="display:flex; align-items:center; gap:5px; margin-top:4px;"><span style="width:6px; height:6px; border-radius:50%; background:${isScanned ? '#555' : (isApproved ? '#00ff88' : '#ffb400')}"></span><small style="color:${isScanned ? '#555' : (isApproved ? '#00ff88' : '#ffb400')}; font-weight:bold; font-size:10px;">${statusName}</small></div></div><div style="font-size:10px; color:#666;">${t.userName} • ${t.count} билет</div></div><div style="flex:1; background:#1a1a1a; border-radius: 0 18px 18px 0; display:flex; align-items:center; justify-content:center; border-left: 2px dashed rgba(255,255,255,0.1);">${isApproved ? `<div id="qr-${id}" style="background:white; padding:5px; border-radius:6px;"></div>` : (isScanned ? `<span class="material-icons-round" style="color:white; opacity:0.3; font-size:30px;">no_photography</span>` : `<span class="material-icons-round" style="color:white; opacity:0.5; font-size:24px; animation: pulse 1.5s infinite;">history</span>`)}</div></div>`;
                if(isApproved) setTimeout(() => { new QRCode(document.getElementById(`qr-${id}`), { text: id, width: 65, height: 65 }); }, 100);
            }
        });
    });
}

function initAdminPanel() {
    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const adminList = document.getElementById('admin-tickets-list');
        if(!adminList) return; adminList.innerHTML = "";
        snap.forEach(docSnap => {
            const t = docSnap.data();
            if(t.status === 'pending') {
                adminList.innerHTML += `<div class="glass-card" style="margin-bottom:10px; padding:12px;"><b style="color:#00d2ff;">${t.movieTitle}</b><p style="font-size:12px; margin:5px 0;">${t.userName} (${t.userPhone})</p><div style="display:flex; gap:8px;"><a href="${t.checkImg}" target="_blank" style="background:rgba(0,210,255,0.1); color:#00d2ff; padding:5px 10px; border-radius:6px; font-size:11px; text-decoration:none;">Чек</a><button onclick="approveTicket('${docSnap.id}')" style="background:#00ff88; padding:5px 10px; border-radius:6px; font-size:11px; border:none; font-weight:bold;">Ырастоо</button><button onclick="deleteTicket('${docSnap.id}')" style="background:#ff416c; color:white; padding:5px 10px; border-radius:6px; font-size:11px; border:none;">Өчүрүү</button></div></div>`;
            }
        });
    });
}

async function startScanner() {
    if (scannerInitialized) return;
    html5QrCode = new Html5Qrcode("reader");
    try {
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (code) => {
            if (isScanning) return;
            isScanning = true;
            try {
                const snap = await getDoc(doc(db, "user_tickets", code));
                if (snap.exists()) {
                    if (snap.data().status === "scanned") window.showToast("Мурда колдонулган!", "error");
                    else { await updateDoc(doc(db, "user_tickets", code), { status: "scanned" }); window.showToast("Ийгиликтүү: " + snap.data().movieTitle, "success"); }
                } else window.showToast("Билет табылган жок!", "error");
            } catch (err) { console.error(err); }
            setTimeout(() => { isScanning = false; }, 2000);
        }, () => {});
        scannerInitialized = true;
    } catch (err) { window.showToast("Камерага уруксат бериңиз", "error"); }
}

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => window.switchSection(item.getAttribute('data-target'));
    });
    const loginBtn = document.getElementById('login-action-btn');
    if(loginBtn) {
        loginBtn.onclick = async () => {
            const e = document.getElementById('login-email-input').value;
            const p = document.getElementById('login-pass-input').value;
            try { await signInWithEmailAndPassword(auth, e, p); window.showToast("Кош келиңиз!", "success"); }
            catch { window.showToast("Логин же пароль ката!", "error"); }
        };
    }
    const uploadBtn = document.getElementById('upload-movie-btn');
    if(uploadBtn) uploadBtn.onclick = window.handleAddMovie;
    document.querySelectorAll('.logout-btn').forEach(btn => btn.onclick = () => signOut(auth));
});
