import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, serverTimestamp, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. FIREBASE КОНФИГУРАЦИЯСЫ ---
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

// --- 2. TOAST БИЛДИРМЕЛЕР ---
window.showToast = (message, type = 'success') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: 'check_circle', error: 'error', info: 'info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="material-icons-round">${icons[type]}</span>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
};

// --- 3. АВТОРИЗАЦИЯ ЖАНА АДМИН ПАНЕЛГЕ ӨТҮҮ ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Кирген колдонуучу:", user.email);
        
        // Эгерде админ кирсе, дароо admin.html баракчасына жөнөтүү
        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            window.location.replace("admin.html"); 
            return;
        }

        // Жөнөкөй колдонуучу болсо профилин көрсөтүү
        const authUi = document.getElementById('auth-ui');
        const profileUi = document.getElementById('user-profile-ui');
        if (authUi) authUi.style.display = "none";
        if (profileUi) profileUi.style.display = "block";
        
        const emailDisplay = document.getElementById('user-email-display');
        if (emailDisplay) emailDisplay.innerText = user.displayName || user.email;
        
        initUserTickets(user.uid);
    } else {
        const authUi = document.getElementById('auth-ui');
        const profileUi = document.getElementById('user-profile-ui');
        if (authUi) authUi.style.display = "block";
        if (profileUi) profileUi.style.display = "none";
        window.showAuthScreen('login-screen');
    }
});

// Кирүү функциясы
const loginActionBtn = document.getElementById('login-action-btn');
if (loginActionBtn) {
    loginActionBtn.onclick = async () => {
        const email = document.getElementById('login-email-input').value.trim();
        const pass = document.getElementById('login-pass-input').value;

        if (!email || !pass) return showToast("Логин жана паролду жазыңыз", "info");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            showToast("Ийгиликтүү кирдиңиз!");
            
            // Админ болсо багыттоо AuthStateChanged ичинде автоматтык түрдө болот
        } catch (err) {
            console.error(err);
            showToast("Ката: Логин же пароль туура эмес", "error");
        }
    };
}

// Каттоо функциясы
const regActionBtn = document.getElementById('reg-action-btn');
if (regActionBtn) {
    regActionBtn.onclick = async () => {
        const name = document.getElementById('reg-name-input').value.trim();
        const email = document.getElementById('reg-email-input').value.trim();
        const pass = document.getElementById('reg-pass-input').value;

        if (!name || pass.length < 6) return showToast("Маалыматтарды туура толтуруңуз (пароль 6+ символ)", "info");

        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await updateProfile(res.user, { displayName: name });
            showToast("Каттоо ийгиликтүү аяктады!");
        } catch (err) {
            showToast("Бул почта мурун катталган же ката кетти", "error");
        }
    };
}

window.handleLogout = () => signOut(auth).then(() => {
    showToast("Системадан чыктыңыз", "info");
    setTimeout(() => window.location.reload(), 500);
});

const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) logoutBtn.onclick = window.handleLogout;

// --- 4. НАВИГАЦИЯ ---
window.switchSection = (targetId) => {
    document.querySelectorAll('.content-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active-section');
    });

    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active-section');
    }
    
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.dataset.target === targetId);
    });
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => window.switchSection(item.dataset.target);
});

window.showAuthScreen = (screenId) => {
    document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
};

// --- 5. КИНОЛОРДУ ЧЫГАРУУ ---
function initMovies() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const main = document.getElementById('main-movie-grid');
        const soon = document.getElementById('soon-movie-grid');
        if (main) main.innerHTML = ""; 
        if (soon) soon.innerHTML = "";
        
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.innerHTML = `
                <img src="${m.image}">
                <div class="glass-footer">
                    <h3>${m.title}</h3>
                    ${m.category === 'now' 
                        ? `<button class="glass-btn" onclick="openBooking('${docSnap.id}', '${m.title}')">Билет алуу</button>` 
                        : `<span class="glass-date-tag">Жакында</span>`}
                </div>`;
            if (m.category === 'now' && main) main.appendChild(card);
            else if (soon) soon.appendChild(card);
        });
    });
}

// --- 6. БРОНДОО (MODAL) ---
window.openBooking = async (movieId, title) => {
    if (!auth.currentUser) {
        showToast("Алгач катталыңыз!", "info");
        window.switchSection('profile-section');
        return;
    }
    
    document.getElementById('selected-movie-name').innerText = title;
    const chipsCont = document.getElementById('movie-sessions-list');
    chipsCont.innerHTML = "<p style='color:grey; font-size:12px;'>Жүктөлүүдө...</p>";
    document.getElementById('booking-modal').style.display = 'flex';
    window.goToStep1();

    onSnapshot(doc(db, "movies", movieId), (docSnap) => {
        const sessions = docSnap.data().sessions || [];
        chipsCont.innerHTML = "";
        if (sessions.length === 0) chipsCont.innerHTML = "Сеанстар жок";
        sessions.forEach(s => {
            const chip = document.createElement('div');
            chip.className = "time-chip";
            chip.innerText = `${s.time} (${s.price}с)`;
            chip.onclick = () => {
                document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                document.getElementById('selected-session-time').value = s.time;
            };
            chipsCont.appendChild(chip);
        });
    });
};

window.closeBookingModal = () => document.getElementById('booking-modal').style.display = 'none';
window.goToStep1 = () => { 
    document.getElementById('step-1').style.display = 'block'; 
    document.getElementById('step-2').style.display = 'none'; 
};
window.goToStep2 = () => {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const sess = document.getElementById('selected-session-time').value;
    if (!name || !phone || !sess) return showToast("Маалыматтарды толук толтуруңуз!", "info");
    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
};

window.handlePaymentSubmit = async () => {
    const file = document.getElementById('check-file-input').files[0];
    const btn = document.getElementById('final-confirm-btn');
    if (!file) return showToast("Төлөм чегин жүктөңүз!", "error");

    try {
        btn.disabled = true; btn.innerText = "Жөнөтүлүүдө...";
        const formData = new FormData();
        formData.append("image", file);
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const imgData = await imgRes.json();

        await addDoc(collection(db, "user_tickets"), {
            userId: auth.currentUser.uid,
            userName: document.getElementById('user-name').value,
            userPhone: document.getElementById('user-phone').value,
            movieTitle: document.getElementById('selected-movie-name').innerText,
            sessionTime: document.getElementById('selected-session-time').value,
            count: document.getElementById('ticket-count').value,
            checkImg: imgData.data.url,
            status: "pending",
            createdAt: serverTimestamp()
        });

        showToast("Өтүнмө ийгиликтүү жөнөтүлдү!");
        window.closeBookingModal();
    } catch (err) {
        showToast("Ката кетти, кайра аракет кылыңыз", "error");
    } finally {
        btn.disabled = false; btn.innerText = "Ырастоо";
    }
};

// --- 7. КОЛДОНУУЧУНУН БИЛЕТТЕРИ ЖАНА QR ---
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
                const statusColor = isScanned ? "#94a3b8" : (isApproved ? "#2ecc71" : "#f39c12");

                const ticketCard = document.createElement('div');
                ticketCard.style.cssText = `
                    position: relative;
                    width: 90%;
                    max-width: 500px;
                    margin: 25px auto;
                    filter: ${isScanned ? 'grayscale(1) opacity(0.6)' : 'drop-shadow(0 15px 30px rgba(0,0,0,0.2))'};
                `;

                ticketCard.innerHTML = `
                    ${!isScanned ? `
                    <div onclick="deleteTicket('${id}')" style="
                        position:absolute; top:-10px; right:-10px; width:23px; height:23px; 
                        background:#ff4757; color:white; border-radius:50%; display:flex;
                        align-items:center; justify-content:center; z-index:100; 
                        border:2px solid #fff; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.3);
                    ">
                        <span class="material-icons-round" style="font-size:16px;">close</span>
                    </div>` : ''}

                    <svg viewBox="0 0 600 240" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:auto; display:block;">
                        <defs>
                            <mask id="m-${id}">
                                <rect x="0" y="0" width="600" height="240" fill="white" />
                                <circle cx="0" cy="0" r="20" fill="black"/>
                                <circle cx="600" cy="0" r="20" fill="black"/>
                                <circle cx="0" cy="240" r="20" fill="black"/>
                                <circle cx="600" cy="240" r="20" fill="black"/>
                                <g fill="black">
                                    ${[45, 75, 105, 135, 165, 195].map(y => `
                                        <circle cx="0" cy="${y}" r="6"/>
                                        <circle cx="600" cy="${y}" r="6"/>
                                    `).join('')}
                                    ${[35, 60, 85, 110, 135, 160, 185, 210].map(y => `<circle cx="415" cy="${y}" r="4"/>`).join('')}
                                </g>
                            </mask>
                        </defs>

                        <g mask="url(#m-${id})">
                            <rect width="415" height="240" fill="#2c313a" /> 
                            <rect x="415" width="185" height="240" fill="#e6d8b5" /> 
                        </g>

                        <foreignObject x="0" y="0" width="415" height="240">
                            <div xmlns="http://www.w3.org/1999/xhtml" style="height:100%; padding:35px 45px; color:white; display:flex; flex-direction:column; justify-content:center; box-sizing:border-box; font-family:sans-serif;">
                                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                                    <div style="width:10px; height:10px; border-radius:50%; background:${statusColor}"></div>
                                    <span style="font-size:19px; font-weight:800; color:${statusColor}; letter-spacing:1.5px; text-transform:uppercase;">
                                        ${isScanned ? "КОЛДОНУЛДУ" : (isApproved ? "ДАЯР" : "КҮТҮҮДӨ")}
                                    </span>
                                </div>
                                <h2 style="margin:0 0 20px 0; font-size:40px; font-weight:900; line-height:1.1; letter-spacing:0.5px; overflow:hidden; text-overflow:ellipsis;">
                                    ${t.movieTitle.toUpperCase()}
                                </h2>
                                <div style="display:flex; gap:35px;">
                                    <div>
                                        <p style="margin:0; font-size:19px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">БИЛЕТ ЭЭСИ</p>
                                        <p style="margin:4px 0; font-size:25px; font-weight:600;">${t.userName}</p>
                                    </div>
                                    <div>
                                        <p style="margin:0; font-size:19px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">САНЫ</p>
                                        <p style="margin:4px 0; font-size:25px; font-weight:600;">${t.count} киши</p>
                                    </div>
                                </div>
                            </div>
                        </foreignObject>

                        <foreignObject x="415" y="0" width="185" height="240">
                            <div xmlns="http://www.w3.org/1999/xhtml" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                                <div id="qr-${id}" style="line-height:0; padding:5px;">
                                    ${!isApproved ? `<div style="width:90px; height:90px; display:flex; align-items:center; justify-content:center; color:#555; font-size:10px; text-align:center; font-weight:bold;">КҮТҮҮ...</div>` : ''}
                                </div>
                                <p style="margin:12px 0 0 0; font-size:13px; color:#4a3f35; font-family:monospace; font-weight:900; letter-spacing:1px;">
                                    #${id.slice(-6).toUpperCase()}
                                </p>
                            </div>
                        </foreignObject>
                    </svg>
                `;

                list.appendChild(ticketCard);

                if (isApproved) {
                    setTimeout(() => {
                        const qrElem = document.getElementById(`qr-${id}`);
                        if (qrElem) {
                            qrElem.innerHTML = "";
                            new QRCode(qrElem, {
                                text: id,
                                width: 130, // Бир аз чоңойтулду
                                height: 130,
                                colorDark: "#2c313a", // Билеттин сол жагындагы түскө жакын же кочкул
                                colorLight: "rgba(0,0,0,0)", // Тунук фон
                                correctLevel: QRCode.CorrectLevel.H
                            });
                        }
                    }, 300);
                }
            }
        });
    });
}

window.deleteTicket = async (id) => {
    if (confirm("Билетти өчүрөсүзбү?")) {
        try { await deleteDoc(doc(db, "user_tickets", id)); showToast("Өчүрүлдү", "info"); } catch (e) { showToast("Ката", "error"); }
    }
};

initMovies();
    
