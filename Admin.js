import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, onSnapshot, doc, updateDoc, 
    deleteDoc, addDoc, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let html5QrCode = null; // Сканнер объектиси үчүн

// --- 1. КООПСУЗДУК ТЕКШЕРҮҮ ---
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "index.html";
    } else {
        initAdminTickets();
        initMoviesAdmin();
    }
});

// --- 2. НАВИГАЦИЯ ЖАНА ТАБТАР ---
window.switchAdminTab = (tabId) => {
    // Бардык табтарды жашыруу
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';
    
    // Навигациядагы активдүү класстарды тууралоо
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    // Эгер таб "scanner" болсо, сканнерди иштетүү, болбосо токтотуу
    if (tabId === 'scanner') {
        startQRScanner();
    } else {
        stopQRScanner();
        // Тиешелүү баскычка актив класс берүү
        const navBtn = document.getElementById('nav-' + tabId);
        if (navBtn) navBtn.classList.add('active');
    }
};

// --- 3. QR СКАНЕР ФУНКЦИЯСЫ ---
async function startQRScanner() {
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            async (decodedText) => {
                // QR код окулганда: decodedText бул билеттин ID'си болушу керек
                stopQRScanner();
                verifyTicket(decodedText);
            }
        );
    } catch (err) {
        console.error("Камера ачылган жок:", err);
    }
}

function stopQRScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error(err));
    }
}

// Билетти базадан текшерүү
async function verifyTicket(ticketId) {
    try {
        const ticketRef = doc(db, "user_tickets", ticketId);
        const snap = await getDoc(ticketRef);

        if (snap.exists()) {
            const data = snap.data();
            alert(`✅ БИЛЕТ ТАБЫЛДЫ!\nКино: ${data.movieTitle}\nКолдонуучу: ${data.userName}\nСаны: ${data.count}`);
        } else {
            alert("❌ Билет табылган жок же жараксыз!");
        }
    } catch (err) {
        alert("Ката кетти!");
    }
}

// --- 4. МОДАЛКА ЖАНА КИНО КОШУУ ---
window.openAddMovieFs = () => {
    tempSessions = [];
    document.getElementById('added-sessions-preview').innerHTML = "";
    document.getElementById('add-movie-modal').style.display = 'flex';
};

window.closeAddMovieFs = () => {
    document.getElementById('add-movie-modal').style.display = 'none';
};

window.addSessionToList = () => {
    const timeInp = document.getElementById('session-time-input');
    const priceInp = document.getElementById('session-price-input');
    const preview = document.getElementById('added-sessions-preview');

    if (!timeInp.value || !priceInp.value) return alert("Убакытты жана бааны жазыңыз!");

    const session = { time: timeInp.value, price: priceInp.value };
    tempSessions.push(session);

    const chip = document.createElement('div');
    chip.className = 'admin-session-chip';
    chip.innerHTML = `${session.time} - ${session.price}с <b style="cursor:pointer; color:#ff4757" onclick="this.parentElement.remove()">×</b>`;
    preview.appendChild(chip);

    timeInp.value = ""; priceInp.value = "";
};

window.handleAddMovie = async () => {
    const title = document.getElementById('new-movie-title').value;
    const cat = document.getElementById('new-movie-category').value;
    const file = document.getElementById('movie-file-input').files[0];
    
    if (!title || !file || tempSessions.length === 0) return alert("Толук толтуруңуз!");

    try {
        const formData = new FormData();
        formData.append("image", file);
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const imgData = await imgRes.json();

        await addDoc(collection(db, "movies"), {
            title, category: cat,
            image: imgData.data.url,
            sessions: tempSessions,
            createdAt: serverTimestamp()
        });

        alert("Кошулду!");
        location.reload();
    } catch (err) {
        console.error(err);
    }
};

// --- 5. БИЛЕТТЕРДИ ЖАНА КИНОЛОРДУ ЧЫГАРУУ ---
function initAdminTickets() {
    onSnapshot(collection(db, "user_tickets"), (snap) => {
        const list = document.getElementById('admin-tickets-list');
        if(!list) return; list.innerHTML = "";
        snap.forEach(docSnap => {
            const t = docSnap.data();
            if(t.status === 'pending') {
                const card = document.createElement('div');
                card.className = "glass-card";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between;">
                        <b style="color:#a855f7;">${t.movieTitle}</b>
                        <span style="color:#94a3b8; font-size:12px;">${t.sessionTime || ''}</span>
                    </div>
                    <div style="margin: 8px 0; font-size:14px; color:#e2e8f0;">
                        👤 ${t.userName} | 📞 ${t.userPhone} <br>
                        🎟️ Саны: ${t.count} киши
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="glass-btn" style="background:#2ecc71; color:white; flex:1; border:none; padding:8px; border-radius:10px;" onclick="approveTicket('${docSnap.id}')">Ырастоо</button>
                        <a href="${t.checkImg}" target="_blank" class="glass-btn" style="background:rgba(255,255,255,0.1); text-decoration:none; color:white; flex:0.5; display:flex; align-items:center; justify-content:center; border-radius:10px;">Чек</a>
                        <button onclick="deleteTicket('${docSnap.id}')" style="background:#ff4757; border:none; color:white; width:40px; border-radius:10px;"><span class="material-icons-round">delete</span></button>
                    </div>`;
                list.appendChild(card);
            }
        });
    });
}

function initMoviesAdmin() {
    onSnapshot(collection(db, "movies"), (snap) => {
        const listContainer = document.getElementById('admin-movie-list');
        if(!listContainer) return; listContainer.innerHTML = "";
        snap.forEach(docSnap => {
            const m = docSnap.data();
            const item = document.createElement('div');
            item.className = "admin-movie-item";
            item.innerHTML = `
                <img src="${m.image}" style="width:45px; height:55px; border-radius:6px; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:bold; color:white; font-size:14px;">${m.title}</div>
                    <div style="font-size:11px; color:#a855f7;">${m.category === 'now' ? 'Прокатта' : 'Жакында'}</div>
                </div>
                <button onclick="deleteMovie('${docSnap.id}')" style="background:none; border:none; color:#ff4757; cursor:pointer;">
                    <span class="material-icons-round">delete_outline</span>
                </button>`;
            listContainer.appendChild(item);
        });
    });
}

// Башка функциялар
window.goHome = () => window.location.href = "index.html";
window.handleLogout = async () => { if(confirm("Чыгуу?")) { await signOut(auth); window.location.href="index.html"; } };
window.approveTicket = (id) => updateDoc(doc(db, "user_tickets", id), { status: "approved" });
window.deleteTicket = async (id) => { if(confirm("Өчүрүү?")) await deleteDoc(doc(db, "user_tickets", id)); };
window.deleteMovie = async (id) => { if(confirm("Өчүрүү?")) await deleteDoc(doc(db, "movies", id)); };
