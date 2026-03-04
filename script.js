import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, serverTimestamp, updateDoc, getDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURATION ---
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

//============== 2. TOAST & NAVIGATION =============

window.showToast = (message, type = "info") => {
    let container = document.getElementById('toast-box');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-box';
        container.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 30000; display: flex; flex-direction: column; align-items: center; width: 90%; pointer-events: none;`;
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const colors = { success: "#00ff88", error: "#ff416c", info: "#00d2ff" };
    toast.style.cssText = `background: rgba(25, 25, 25, 0.9); backdrop-filter: blur(15px); color: white; padding: 14px 20px; border-radius: 12px; border-bottom: 3px solid ${colors[type]}; min-width: 280px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); margin-bottom: 10px; transition: all 0.4s ease; opacity: 0; transform: translateY(-20px); pointer-events: auto; font-family: sans-serif;`;
    toast.innerHTML = `<span class="material-icons-round" style="color:${colors[type]}">info</span><span style="flex:1; font-size:14px;">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "1"; toast.style.transform = "translateY(0)"; }, 10);
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateY(-10px)"; setTimeout(() => toast.remove(), 400); }, 3000);
};

window.switchSection = (targetId) => {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(targetId).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.target === targetId);
    });
};

//============== 3. МОДАЛКАЛАРДЫ БАШКАРУУ =============

window.goToStep2 = () => {
    const name = document.getElementById('user-name').value;
    const phone = document.getElementById('user-phone').value;
    if(!name || !phone) return window.showToast("Атыңызды жана номериңизди жазыңыз!", "error");
    document.getElementById('modal-slider').style.transform = "translateX(-50%)";
};

window.goToStep1 = () => {
    document.getElementById('modal-slider').style.transform = "translateX(0)";
};

window.closeBookingModal = () => {
    document.getElementById('booking-modal').style.display = 'none';
    window.goToStep1();
};

//============== 4. АВТОРИЗАЦИЯ (КИРҮҮ / КАТТАЛУУ) =============

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-ui').style.display = "none";
        const isAdmin = user.email === ADMIN_EMAIL;
        document.getElementById('admin-panel-ui').style.display = isAdmin ? "block" : "none";
        document.getElementById('user-profile-ui').style.display = isAdmin ? "none" : "block";
        document.getElementById('user-email-display').innerText = user.displayName || user.email;
        if (isAdmin) initAdminTickets();
        initUserTickets(user.uid);
    } else {
        document.getElementById('auth-ui').style.display = "block";
        document.getElementById('admin-panel-ui').style.display = "none";
        document.getElementById('user-profile-ui').style.display = "none";
    }
});

window.handleLogin = async () => {
    const e = document.getElementById('login-email-input').value.trim();
    const p = document.getElementById('login-pass-input').value;
    if(!e || !p) return window.showToast("Логин жана пароль толтуруңуз!", "error");
    try { 
        await signInWithEmailAndPassword(auth, e, p); 
        window.showToast("Кош келиңиз!", "success"); 
    } catch { window.showToast("Логин же пароль ката!", "error"); }
};

window.handleRegister = async () => {
    const name = document.getElementById('reg-name-input').value.trim();
    const email = document.getElementById('reg-email-input').value.trim();
    const pass = document.getElementById('reg-pass-input').value;
    if(!name || pass.length < 6) return window.showToast("Пароль кеминде 6 символ болушу керек!", "error");
    try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: name });
        window.showToast("Ийгиликтүү катталдыңыз!", "success");
    } catch (err) { window.showToast("Катталуу катасы!", "error"); }
};

window.handleLogout = () => {
    signOut(auth).then(() => window.showToast("Аккаунттан чыктыңыз", "info"));
};

//============== 5. КИНОЛОР ЖАНА БИЛЕТ АЛУУ =============

function initMovies() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const main = document.getElementById('main-movie-grid');
        const soon = document.getElementById('soon-movie-grid');
        const adminList = document.getElementById('tab-movies');
        if(main) main.innerHTML = ""; if(soon) soon.innerHTML = "";
        
        let adminHtml = `<button class="btn-main" style="margin-bottom:20px; width:100%;" onclick="document.getElementById('add-movie-modal').style.display='flex'">+ Жаңы кино кошуу</button>`;

        snap.forEach(docSnap => {
            const m = docSnap.data();
            const id = docSnap.id;
            const card = `<div class="glass-card"><img src="${m.image}"><div class="glass-footer"><h3>${m.title}</h3>${m.category === 'now' ? `<button class="glass-btn" onclick="handleBookingClick('${m.title}')">Билет алуу</button>` : `<span class="glass-date-tag">Жакында</span>`}</div></div>`;
            
            if(m.category === 'now') main.innerHTML += card;
            else soon.innerHTML += card;

            adminHtml += `<div style="background:#1a1a1a; margin-bottom:8px; padding:10px; border-radius:12px; display:flex; align-items:center; justify-content:space-between; border:1px solid rgba(255,255,255,0.1);">
                <div style="display:flex; align-items:center; gap:10px;"><img src="${m.image}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;"><span style="color:white; font-size:14px;">${m.title}</span></div>
                <button onclick="deleteMovie('${id}')" style="background:none; border:none; color:#ff416c;"><span class="material-icons-round">delete</span></button>
            </div>`;
        });
        if(adminList) adminList.innerHTML = adminHtml;
    });
}

window.handleBookingClick = (title) => {
    if(!auth.currentUser) {
        window.showToast("Кириңиз же катталыңыз!", "info");
        window.switchSection('profile-section');
    } else {
        document.getElementById('selected-movie-name').innerText = title;
        document.getElementById('booking-modal').style.display = 'flex';
        window.goToStep1();
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
        window.showToast("Билдирме жөнөтүлдү!", "success");
        window.closeBookingModal();
    } catch { window.showToast("Жүктөө катасы!", "error"); }
    finally { btn.innerText = "Ырастоо"; btn.disabled = false; }
};

// ... (Жогорудагы Firebase Config жана башка функциялар өзгөрүүсүз калат) ...

//============== 6. КИНОЛОРДУ ЧЫГАРУУ ЖАНА БИЛЕТТЕР (ЖАҢЫЛАНДЫ) =============

function initUserTickets(uid) {
    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const list = document.getElementById('user-tickets-list');
        if (!list) return;
        list.innerHTML = "";

        snap.forEach(docSnap => {
            const t = docSnap.data();
            if (t.userId === uid) {
                const id = docSnap.id;
                const isApproved = t.status === 'approved';
                const isScanned = t.status === 'scanned';

                const statusData = {
                    pending: { text: "Күтүүдө", color: "#ff9f43", icon: "schedule" },
                    approved: { text: "Даяр", color: "#00d2ff", icon: "confirmation_number" },
                    scanned: { text: "Колдонулган", color: "#8395a7", icon: "check_circle" }
                };

                const currentStatus = statusData[t.status] || statusData.pending;
                const qrWidth = 105;

                const mask = `radial-gradient(circle 12px at calc(100% - ${qrWidth}px) 0, transparent 100%, black 100%), 
                              radial-gradient(circle 12px at calc(100% - ${qrWidth}px) 100%, transparent 100%, black 100%)`;

                const ticketCard = document.createElement('div');
                ticketCard.style.cssText = `
                    position: relative;
                    margin-bottom: 30px;
                    filter: ${isScanned ? 'grayscale(1) opacity(0.6)' : 'none'};
                    /* Скандалган болсо иштебейт */
                    pointer-events: ${isScanned ? 'none' : 'auto'}; 
                `;

                ticketCard.innerHTML = `
                    ${!isScanned ? `
                        <div onclick="deleteTicket('${id}')" style="
                            position: absolute;
                            top: -10px;
                            right: -10px;
                            width: 25px;
                            height: 25px;
                            background: #ff4757;
                            color: white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 14px;
                            font-weight: bold;
                            cursor: pointer;
                            z-index: 100;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                            border: 2px solid #1a1a1a;
                        ">
                            <span class="material-icons-round" style="font-size: 16px;">close</span>
                        </div>
                    ` : ''}

                    <div style="
                        display:flex;
                        background:#1a1a1a;
                        border-radius:20px;
                        overflow:hidden;
                        border:1px solid rgba(255,255,255,0.08);
                        box-shadow:0 15px 35px rgba(0,0,0,0.45);
                        -webkit-mask-image: ${mask};
                        mask-image: ${mask};
                        -webkit-mask-composite: source-over, source-over;
                        mask-composite: intersect;
                    ">
                        
                        <div style="flex:1; padding:20px; padding-right:25px; position:relative;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
                                <span class="material-icons-round" style="color:${currentStatus.color}; font-size:18px;">
                                    ${currentStatus.icon}
                                </span>
                                <span style="color:${currentStatus.color}; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">
                                    ${currentStatus.text}
                                </span>
                            </div>

                            <h2 style="color:white; margin:0 0 10px 0; font-size:18px; font-weight:800;">
                                ${t.movieTitle}
                            </h2>

                            <div style="display:flex; gap:20px; margin-top:15px;">
                                <div>
                                    <p style="margin:0; font-size:9px; color:#555; text-transform:uppercase;">Билет ээси</p>
                                    <p style="margin:2px 0; font-size:13px; color:#ddd; font-weight:600;">${t.userName}</p>
                                </div>
                                <div>
                                    <p style="margin:0; font-size:9px; color:#555; text-transform:uppercase;">Саны</p>
                                    <p style="margin:2px 0; font-size:13px; color:#ddd; font-weight:600;">${t.count} киши</p>
                                </div>
                            </div>

                            <div style="
                                position:absolute;
                                right:0;
                                top:15px;
                                bottom:15px;
                                width:1px;
                                border-right:2px dashed rgba(255,255,255,0.15);
                            "></div>
                        </div>

                        <div style="
                            width:${qrWidth}px;
                            flex-shrink:0;
                            display:flex;
                            flex-direction:column;
                            align-items:center;
                            justify-content:center;
                            background:rgba(255,255,255,0.02);
                            padding:10px;
                        ">
                            <div style="background:white; padding:6px; border-radius:10px;">
                                ${isApproved ? 
                                    `<div id="qr-${id}"></div>` :
                                    `<div style="width:60px; height:60px; display:flex; align-items:center; justify-content:center; color:#444; font-size:8px; text-align:center; font-weight:bold;">КҮТҮҮ...</div>`
                                }
                            </div>
                            <p style="margin:8px 0 0 0; font-size:8px; color:#444; font-family:monospace;">
                                #${id.slice(-6).toUpperCase()}
                            </p>
                        </div>
                    </div>
                `;

                list.appendChild(ticketCard);

                if (isApproved) {
                    setTimeout(() => {
                        const qrElem = document.getElementById(`qr-${id}`);
                        if (qrElem) {
                            qrElem.innerHTML = "";
                            new QRCode(qrElem, {
                                text: id,
                                width: 60,
                                height: 60,
                                colorDark: "#000000",
                                colorLight: "#ffffff"
                            });
                        }
                    }, 200);
                }
            }
        });
    });
}

// Билетти өчүрүү функциясы (мисал)
function deleteTicket(ticketId) {
    if(confirm("Билетти өчүрүүнү каалайсызбы?")) {
        // Бул жерге Firebase өчүрүү кодун жазсаң болот:
        // deleteDoc(doc(db, "user_tickets", ticketId));
        console.log("Билет өчүрүлдү:", ticketId);
    }
}








                


//============== 7. АДМИН ПАНЕЛЬ ЖАНА QR СКАННЕР =============

function initAdminTickets() {
    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const adminList = document.getElementById('admin-tickets-list');
        if(!adminList) return; adminList.innerHTML = "";
        snap.forEach(docSnap => {
            const t = docSnap.data();
            if(t.status === 'pending') {
                adminList.innerHTML += `<div class="glass-card" style="padding:15px; margin-bottom:10px; background: rgba(255,255,255,0.02);">
                    <b style="color:#00d2ff">${t.movieTitle}</b><br><small style="color:#ccc;">${t.userName} (${t.userPhone})</small>
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button class="glass-btn" style="background:#00ff88; color:black; border:none;" onclick="approveTicket('${docSnap.id}')">Ырастоо</button>
                        <a href="${t.checkImg}" target="_blank" class="glass-btn" style="background:rgba(255,255,255,0.1); text-decoration:none;">Чек көрүү</a>
                    </div>
                </div>`;
            }
        });
    });
}

window.approveTicket = (id) => updateDoc(doc(db, "user_tickets", id), { status: "approved" });

window.deleteMovie = async (id) => {
    if(confirm("Өчүрөсүзбү?")) await deleteDoc(doc(db, "movies", id));
};

window.handleAddMovie = async () => {
    const title = document.getElementById('new-movie-title').value;
    const cat = document.getElementById('new-movie-category').value;
    const file = document.getElementById('movie-file-input').files[0];
    if(!title || !file) return window.showToast("Толук толтуруңуз!", "error");
    try {
        const url = await uploadToImgBB(file);
        await addDoc(collection(db, "movies"), { title, category: cat, image: url });
        document.getElementById('add-movie-modal').style.display = 'none';
        window.showToast("Жаңы кино кошулду!", "success");
    } catch { window.showToast("Ката кетти!", "error"); }
};

async function startScanner() {
    if (scannerInitialized) return;
    html5QrCode = new Html5Qrcode("reader");
    try {
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (code) => {
            if (isScanning) return;
            isScanning = true;
            const ref = doc(db, "user_tickets", code);
            const snap = await getDoc(ref);
            if (snap.exists() && snap.data().status === "approved") {
                await updateDoc(ref, { status: "scanned" });
                window.showToast("ИЙГИЛИКТҮҮ: Билет кабыл алынды!", "success");
            } else { window.showToast("КАТА: Билет жараксыз!", "error"); }
            setTimeout(() => isScanning = false, 3000);
        });
        scannerInitialized = true;
    } catch { window.showToast("Камера иштеген жок", "error"); }
}

window.switchAdminTab = (tab, event) => {
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    document.getElementById('tab-'+tab).style.display = 'block';
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    if(event) event.target.classList.add('active');
    if(tab === 'scanner') startScanner();
};

//============== 8. КӨМӨКЧҮ ФУНКЦИЯЛАР =============

async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const data = await res.json();
    return data.data.url;
}

document.addEventListener('DOMContentLoaded', () => {
    initMovies();
    
    // Auth баскычтары
    const loginBtn = document.getElementById('login-action-btn');
    if(loginBtn) loginBtn.onclick = window.handleLogin;

    const regBtn = document.getElementById('reg-action-btn');
    if(regBtn) regBtn.onclick = window.handleRegister;

    // Logout баскычтары
    document.querySelectorAll('.logout-btn').forEach(btn => btn.onclick = window.handleLogout);

    // Навигация
    document.querySelectorAll('.nav-item').forEach(n => n.onclick = () => window.switchSection(n.dataset.target));
});

// Глобалдык функцияларды терезеге (window) байлоо
window.closeBookingModal = window.closeBookingModal;
window.goToStep1 = window.goToStep1;
window.goToStep2 = window.goToStep2;
window.handlePaymentSubmit = window.handlePaymentSubmit;
window.handleAddMovie = window.handleAddMovie;
