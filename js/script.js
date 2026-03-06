import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    doc, serverTimestamp, deleteDoc, getDocs, query, where, getDoc 
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
window.getDocs = getDocs;
window.collection = collection;
window.db = db;

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

            // Эгер категория 'soon' болсо, админ киргизген датаны көрсөтөбүз
            // Эгер дата жок болсо, демейки "Жакында" сөзү калат
            const footerContent = m.category === 'now' 
                ? `<button class="glass-btn" onclick="openBooking('${docSnap.id}', '${m.title}')">Билет алуу</button>` 
                : `<div class="glass-date-tag">
                     <span class="material-icons-round" style="font-size:14px;">calendar_today</span>
                     ${m.releaseDate || 'Жакында'}
                   </div>`;

            card.innerHTML = `
                <img src="${m.image}">
                <div class="glass-footer">
                    <h3>${m.title}</h3>
                    ${footerContent}
                </div>`;

            if (m.category === 'now' && main) main.appendChild(card);
            else if (m.category === 'soon' && soon) soon.appendChild(card);
        });
    });
}


// ========================================================
// --- 6. БРОНДОО БӨЛҮМҮ (КИНО СЕАНСТАРЫ) ---
// ========================================================

let selectedSessionPrice = 0; 

// 1. МОДАЛДЫ АЧУУ
window.openBooking = async (movieId, title) => {
    if (!auth.currentUser) {
        showToast("Алгач катталыңыз!", "info");
        window.switchSection('profile-section');
        return;
    }
    
    window.clearBookingForm();
    document.getElementById('selected-movie-name').innerText = title;
    const chipsCont = document.getElementById('movie-sessions-list');
    chipsCont.innerHTML = "<p style='color:grey; font-size:12px;'>Сеанстар жүктөлүүдө...</p>";
    document.getElementById('booking-modal').style.display = 'flex';
    window.goToStep1();

    // Сеанстарды реалдуу убакытта алуу
    onSnapshot(doc(db, "movies", movieId), async (docSnap) => {
        if (!docSnap.exists()) {
            chipsCont.innerHTML = "Маалымат табылган жок";
            return;
        }
        
        const movieData = docSnap.data();
        const sessions = movieData.sessions || [];
        const maxSeats = movieData.maxSeats || 34; 
        chipsCont.innerHTML = "";
        
        if (sessions.length === 0) {
            chipsCont.innerHTML = "Сеанстар жок";
            return;
        }

        for (const s of sessions) {
            const q = query(
                collection(db, "user_tickets"),
                where("movieTitle", "==", title),
                where("sessionTime", "==", s.time),
                where("status", "==", "approved") 
            );
            
            const ticketSnap = await getDocs(q);
            let occupied = 0;
            ticketSnap.forEach(tDoc => {
                const d = tDoc.data();
                occupied += (Number(d.adults) || 0) + (Number(d.children) || 0);
            });

            const freeSeats = maxSeats - occupied;
            const chip = document.createElement('div');
            chip.className = "time-chip";
            
            if (freeSeats <= 0) {
                chip.classList.add('sold-out');
                chip.innerHTML = `<span>${s.time}</span><br><small style="font-size:9px; color:#ff4757;">Орун жок</small>`;
                chip.style.opacity = "0.5";
                chip.style.pointerEvents = "none";
            } else {
                chip.innerHTML = `<span>${s.time}</span><br><small style="font-size:9px; color:#00ffcc;">${freeSeats} орун</small>`;
                chip.onclick = () => {
                    document.querySelectorAll('.time-chip').forEach(c => c.classList.remove('selected'));
                    chip.classList.add('selected');
                    document.getElementById('selected-session-time').value = s.time;
                    selectedSessionPrice = Number(s.price); 
                };
            }
            chipsCont.appendChild(chip);
        }
    });
};

// 2. ТӨЛӨМ НУСКАМАСЫ (STEP 2)
window.goToStep2 = () => {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const sess = document.getElementById('selected-session-time').value;
    const adultCount = Number(document.getElementById('ticket-count').value) || 0;
    const childCount = Number(document.getElementById('children-count').value) || 0;

    if (!name || !phone || !sess) {
        return showToast("Атыңызды, номериңизди жазып, сеансты тандаңыз!", "info");
    }

    const totalAmount = (selectedSessionPrice * adultCount) + (childCount * 100);
    const mbankNumber = "0700 123 456"; // Өзүңүздүн номериңизди жазыңыз
    
    document.getElementById('payment-instruction').innerHTML = `
        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; border: 1px dashed #a855f7; text-align: center;">
            <p style="color: #fff; margin: 0; font-size: 14px;">Көрсөтүлгөн сумманы төлөңүз:</p>
            <h2 style="color: #00ffcc; margin: 10px 0; font-size: 32px; font-weight: 900;">${totalAmount} сом</h2>
            
            <div style="background: rgba(0, 255, 204, 0.1); padding: 15px; border-radius: 15px; margin-bottom: 15px;">
                <p style="color: #00ffcc; margin: 0; font-size: 11px; font-weight: bold;">МБАНК РЕКВИЗИТ:</p>
                <p style="color: #fff; margin: 5px 0 0 0; font-size: 20px; font-weight: 800;">${mbankNumber}</p>
            </div>
            
            <p style="color: #ffcc00; font-size: 12px; line-height: 1.4; font-weight: bold;">
                Ушул сумманы төлөп, чекти ылдый жака тиркеп жөнөтүңүз!
            </p>
        </div>
    `;

    document.getElementById('step-1').style.display = 'none';
    document.getElementById('step-2').style.display = 'block';
};

// 3. ТӨЛӨМДҮ ЖӨНӨТҮҮ (НЕГИЗГИ ОҢДОО)
window.handlePaymentSubmit = async () => {
    const fileInput = document.getElementById('check-file-input');
    const file = fileInput ? fileInput.files[0] : null;
    const btn = document.getElementById('final-confirm-btn');
    
    if (!file) return showToast("Төлөм чегин тиркеңиз!", "error");

    try {
        btn.disabled = true; 
        btn.innerText = "Жөнөтүлүүдө...";

        // ImgBB жүктөө (Текшерүү менен)
        const formData = new FormData();
        formData.append("image", file);
        
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
            method: "POST", 
            body: formData 
        });
        
        const imgJson = await imgRes.json();
        
        if (!imgJson.success) {
            console.error("ImgBB Error:", imgJson);
            throw new Error("Сүрөт жүктөлгөн жок");
        }

        const checkUrl = imgJson.data.url;
        const adultCount = Number(document.getElementById('ticket-count').value) || 0;
        const childCount = Number(document.getElementById('children-count').value) || 0;

        // Firestore'го жазуу
        await addDoc(collection(db, "user_tickets"), {
            userId: auth.currentUser.uid,
            userName: document.getElementById('user-name').value.trim(),
            userPhone: document.getElementById('user-phone').value.trim(),
            movieTitle: document.getElementById('selected-movie-name').innerText,
            sessionTime: document.getElementById('selected-session-time').value,
            adults: adultCount,
            children: childCount,
            totalPrice: (selectedSessionPrice * adultCount) + (childCount * 100),
            checkImg: checkUrl,
            status: "pending",
            createdAt: serverTimestamp()
        });

        showToast("Ийгиликтүү жөнөтүлдү!", "success");
        window.closeBookingModal();

    } catch (err) {
        console.error("Толук ката маалыматы:", err);
        showToast("Ката кетти! Сүрөттү же интернетти текшериңиз.", "error");
    } finally {
        btn.disabled = false; 
        btn.innerText = "Ырастоо";
    }
};

window.clearBookingForm = () => {
    const ids = ['user-name', 'user-phone', 'selected-session-time'];
    ids.forEach(id => { 
        const el = document.getElementById(id);
        if(el) el.value = ""; 
    });
    if(document.getElementById('ticket-count')) document.getElementById('ticket-count').value = 1;
    if(document.getElementById('children-count')) document.getElementById('children-count').value = 0;
    const fileInput = document.getElementById('check-file-input');
    if (fileInput) fileInput.value = "";
    selectedSessionPrice = 0;
};

window.closeBookingModal = () => {
    document.getElementById('booking-modal').style.display = 'none';
    window.clearBookingForm();
};

window.goToStep1 = () => { 
    document.getElementById('step-1').style.display = 'block'; 
    document.getElementById('step-2').style.display = 'none'; 
};





// ========================================================
// --- 7. АНТИ-КИНО БӨЛҮМҮ (ТОЛУК ОҢДОЛГОН) ---
// ========================================================

let selectedAtknFood = {}; 

// 1. ФОРМАНЫ ЖАНА МААЛЫМАТТАРДЫ ТАЗАЛОО
window.clearAtknForm = () => {
    const inputs = ['atkn-user-name', 'atkn-user-phone', 'atkn-adults', 'atkn-children'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = (id === 'atkn-adults') ? "1" : (id === 'atkn-children' ? "0" : "");
    });

    const fileInput = document.getElementById('atkn-receipt-upload');
    if (fileInput) fileInput.value = "";
    const fileText = document.getElementById('atkn-file-text');
    if (fileText) fileText.innerText = "Чекти жүктөө (Сүрөт)";

    selectedAtknFood = {};
    const totalTag = document.getElementById('atkn-total-price-tag');
    if (totalTag) totalTag.remove();

    // Менюларды жаап коюу (баштапкы абалга)
    document.querySelectorAll('.menu-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.arrow-icon').forEach(a => a.style.transform = 'rotate(0deg)');
};

// 2. МОДАЛДЫ АЧУУ
window.openAtknModal = async (roomName) => {
    if (roomName === 'PlayStation Зал') return showToast("Бул зал жакында ачылат!", "info");
    if (!auth.currentUser) {
        showToast("Алгач катталыңыз!", "info");
        window.switchSection('profile-section');
        return;
    }

    const modal = document.getElementById('atkn-modal-overlay');
    if (modal) {
        window.clearAtknForm(); 
        modal.style.display = 'flex';
        document.getElementById('selected-room').innerText = roomName;
        document.getElementById('atkn-modal-title').innerText = roomName.toUpperCase();
        document.getElementById('step-3').style.display = 'block';
        document.getElementById('step-4').style.display = 'none';

        await window.loadAtknMenu();
    }
};

// 3. АККОРДЕОНДУ АЧУУ/ЖАБУУ (ТАМАК-АШ ТАНДОО ҮЧҮН)
window.toggleAccordion = (id) => {
    const content = document.getElementById(id);
    if (!content) return;

    const allContents = document.querySelectorAll('.menu-content');
    const header = content.parentElement.querySelector('.menu-header');
    const arrow = header ? header.querySelector('.arrow-icon') : null;

    // Башка ачык турган менюларды жабуу
    allContents.forEach(c => {
        if (c.id !== id) {
            c.style.display = 'none';
            const otherHeader = c.parentElement.querySelector('.menu-header');
            const otherArrow = otherHeader ? otherHeader.querySelector('.arrow-icon') : null;
            if (otherArrow) otherArrow.style.transform = 'rotate(0deg)';
        }
    });

    // Тандалган менюну ачуу же жабуу
    const isHidden = window.getComputedStyle(content).display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
};

// 4. МЕНЮНУ ЖҮКТӨӨ (Firestore'дон)
window.loadAtknMenu = async () => {
    const foodList = document.getElementById('food-list');
    const drinkList = document.getElementById('drink-list');
    if (!foodList || !drinkList) return;

    try {
        const querySnapshot = await getDocs(collection(db, "atkn_menu"));
        foodList.innerHTML = ""; 
        drinkList.innerHTML = ""; 

        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const itemId = docSnap.id;
            const itemHTML = `
                <div class="atkn-menu-row" style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <div style="flex: 1;">
                        <div style="color: white; font-size: 14px; font-weight: 600;">${item.name}</div>
                        <div style="color: #00ffcc; font-size: 12px; font-weight: bold;">${item.price} сом</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.08); padding: 5px 10px; border-radius: 12px;">
                        <button type="button" onclick="window.updateAtknQty('${itemId}', -1, '${item.name}', ${item.price})" style="background:none; border:none; color:#ff4757; font-size:20px; cursor:pointer;">−</button>
                        <span id="qty-${itemId}" style="color: white; font-weight: bold; min-width: 20px; text-align: center;">0</span>
                        <button type="button" onclick="window.updateAtknQty('${itemId}', 1, '${item.name}', ${item.price})" style="background:none; border:none; color:#00ffcc; font-size:20px; cursor:pointer;">+</button>
                    </div>
                </div>`;
            
            if (item.type === "food") foodList.innerHTML += itemHTML;
            else if (item.type === "drink") drinkList.innerHTML += itemHTML;
        });
    } catch (err) { 
        console.error("Меню жүктөө катасы:", err); 
    }
};

// 5. САНДЫ ЖАҢЫЛОО
window.updateAtknQty = (id, delta, name, price) => {
    const qtySpan = document.getElementById(`qty-${id}`);
    if(!qtySpan) return;
    let qty = parseInt(qtySpan.innerText) || 0;
    qty += delta;
    if (qty < 0) qty = 0;
    qtySpan.innerText = qty;

    if (qty > 0) {
        selectedAtknFood[id] = { name: name, count: qty, price: price };
    } else {
        delete selectedAtknFood[id];
    }
};

// 6. ТӨЛӨМГӨ ӨТҮҮ ЖАНА ЭСЕПТӨӨ
window.goToStep4 = () => {
    const adults = parseInt(document.getElementById('atkn-adults').value) || 0;
    const children = parseInt(document.getElementById('atkn-children').value) || 0;
    const selectedTime = document.querySelector('input[name="atkn-time"]:checked')?.value;

    if (adults < 1 || !selectedTime) return showToast("Маалыматты толук толтуруңуз!", "info");

    let roomPrice = (adults <= 2) ? 1000 : 1000 + (adults - 2) * 350;
    let foodSum = 0;
    Object.values(selectedAtknFood).forEach(f => foodSum += (f.price * f.count));
    const total = roomPrice + (children * 200) + foodSum;

    const payInfo = document.querySelector('.payment-info');
    if (payInfo) {
        document.getElementById('atkn-total-price-tag')?.remove();
        const tag = document.createElement('div');
        tag.id = 'atkn-total-price-tag';
        tag.innerHTML = `
            <div style="text-align:center; margin-bottom:15px; background:rgba(0,255,204,0.1); padding:15px; border-radius:15px; border: 1px solid rgba(0,255,204,0.3);">
                <h2 style="color:#00ffcc; margin:0;">${total} сом</h2>
                <div style="font-size:11px; opacity:0.7; color: white;">Зал: ${roomPrice}с | Меню: ${foodSum}с | Балдар: ${children * 200}с</div>
            </div>`;
        payInfo.prepend(tag);
    }
    document.getElementById('step-3').style.display = 'none';
    document.getElementById('step-4').style.display = 'block';
};

// 7. ЖӨНӨТҮҮ ЖАНА ТАЗАЛОО
window.handleAtknSubmit = async (e) => {
    if (e) e.preventDefault();
    const file = document.getElementById('atkn-receipt-upload').files[0];
    const btn = document.getElementById('atkn-final-btn');
    if (!file) return showToast("Чекти жүктөңүз!", "error");

    try {
        btn.disabled = true;
        btn.innerText = "Жөнөтүлүүдө...";

        const fd = new FormData(); fd.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: fd });
        const img = await res.json();

        if (!img.success) throw new Error("Сүрөт жүктөлбөй калды");

        const adults = parseInt(document.getElementById('atkn-adults').value);
        const children = parseInt(document.getElementById('atkn-children').value) || 0;
        let roomPrice = (adults <= 2) ? 1000 : 1000 + (adults - 2) * 350;
        let foodSum = 0;
        Object.values(selectedAtknFood).forEach(f => foodSum += (f.price * f.count));

        await addDoc(collection(db, "user_tickets"), {
            userId: auth.currentUser.uid,
            userName: document.getElementById('atkn-user-name').value.trim(),
            userPhone: document.getElementById('atkn-user-phone').value.trim(),
            movieTitle: "АНТИКИНО: " + document.getElementById('selected-room').innerText,
            sessionTime: document.querySelector('input[name="atkn-time"]:checked').value,
            count: adults + children,
            selectedFood: Object.values(selectedAtknFood).map(f => ({ name: f.name, count: f.count })),
            totalPrice: roomPrice + (children * 200) + foodSum,
            checkImg: img.data.url,
            status: "pending",
            createdAt: serverTimestamp()
        });

        showToast("Ийгиликтүү жөнөтүлдү!", "success");
        window.clearAtknForm(); 
        document.getElementById('atkn-modal-overlay').style.display = 'none';
        
    } catch (err) { 
        console.error(err);
        showToast("Ката кетти!", "error"); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Ырастоо"; 
    }
};

window.backToStep3 = () => {
    document.getElementById('step-4').style.display = 'none';
    document.getElementById('step-3').style.display = 'block';
};

window.updateAtknFileName = () => {
    const input = document.getElementById('atkn-receipt-upload');
    const text = document.getElementById('atkn-file-text');
    if (input.files.length > 0) text.innerText = input.files[0].name;
};

// Антикино модалын жабуу функциясы
window.closeAtknModal = () => {
    const modal = document.getElementById('atkn-modal-overlay');
    if (modal) {
        modal.style.display = 'none';
        
        // Модал жабылганда форманы тазалап коюу сунушталат
        if (window.clearAtknForm) {
            window.clearAtknForm();
        }
    } else {
        console.error("Ката: 'atkn-modal-overlay' IDси менен элемент табылган жок!");
    }
};




  
    





// --- 8. КОЛДОНУУЧУНУН БИЛЕТТЕРИ ЖАНА QR ---
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
                    width: 100%;
                    max-width: 550px; /* Бир аз кеңейтилди маалымат батыш үчүн */
                    margin: 25px auto;
                    filter: ${isScanned ? 'grayscale(1) opacity(0.6)' : 'drop-shadow(0 15px 30px rgba(0,0,0,0.2))'};
                `;

                ticketCard.innerHTML = `
    ${!isScanned ? `
    <div onclick="deleteTicket('${id}')" style="
        position:absolute; top:-12px; right:-12px; width:28px; height:28px; 
        background:#ff4757; color:white; border-radius:50%; display:flex;
        align-items:center; justify-content:center; z-index:100; 
        border:2px solid #fff; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.4);
    ">
        <span class="material-icons-round" style="font-size:20px;">close</span>
    </div>` : ''}

    <svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:auto; display:block;">
        <defs>
            <mask id="m-${id}">
                <rect x="0" y="0" width="600" height="260" fill="white" />
                <circle cx="0" cy="0" r="20" fill="black"/>
                <circle cx="600" cy="0" r="20" fill="black"/>
                <circle cx="0" cy="260" r="20" fill="black"/>
                <circle cx="600" cy="260" r="20" fill="black"/>
                <g fill="black">
                    ${[50, 85, 120, 155, 190, 225].map(y => `
                        <circle cx="0" cy="${y}" r="6"/>
                        <circle cx="600" cy="${y}" r="6"/>
                    `).join('')}
                    ${[40, 70, 100, 130, 160, 190, 220].map(y => `<circle cx="415" cy="${y}" r="4"/>`).join('')}
                </g>
            </mask>
        </defs>

        <g mask="url(#m-${id})">
            <rect width="415" height="260" fill="#2c313a" /> 
            <rect x="415" width="185" height="260" fill="#e6d8b5" /> 
        </g>

        <foreignObject x="0" y="0" width="415" height="260">
            <div xmlns="http://www.w3.org/1999/xhtml" style="height:100%; padding:25px 30px; color:white; display:flex; flex-direction:column; justify-content:center; box-sizing:border-box; font-family:sans-serif;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <div style="width:12px; height:12px; border-radius:50%; background:${statusColor}"></div>
                    <span style="font-size:16px; font-weight:800; color:${statusColor}; letter-spacing:1.5px; text-transform:uppercase;">
                        ${isScanned ? "КОЛДОНУЛДУ" : (isApproved ? "ДАЯР" : "КҮТҮҮДӨ")}
                    </span>
                </div>
                
                <h2 style="margin:0 0 20px 0; font-size:36px; font-weight:900; line-height:1; letter-spacing:0.5px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">
                    ${t.movieTitle.toUpperCase()}
                </h2>
                
                <div style="display:flex; justify-content: space-between; gap:15px;">
                    <div style="flex: 2;">
                        <p style="margin:0; font-size:15px; color:#94a3b8; text-transform:uppercase; font-weight:700;">ЭЭСИ</p>
                        <p style="margin:6px 0; font-size:20px; font-weight:700;">${t.userName}</p>
                    </div>
                    <div style="flex: 1.4;">
                        <p style="margin:0; font-size:15px; color:#94a3b8; text-transform:uppercase; font-weight:700;">УБАКТЫСЫ</p>
                        <p style="margin:6px 0; font-size:20px; font-weight:800; color:#e6d8b5;">${t.sessionTime}</p>
                    </div>
                    <div style="flex: 1;">
                        <p style="margin:0; font-size:15px; color:#94a3b8; text-transform:uppercase; font-weight:700;">САНЫ</p>
                        <p style="margin:6px 0; font-size:20px; font-weight:700;">${t.count} к.</p>
                    </div>
                </div>
            </div>
        </foreignObject>

        <foreignObject x="415" y="0" width="185" height="260">
            <div xmlns="http://www.w3.org/1999/xhtml" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:15px; box-sizing:border-box;">
                <div id="qr-${id}" style="line-height:0; padding:8px; background:white; border-radius:10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    ${!isApproved ? `<div style="width:110px; height:110px; display:flex; align-items:center; justify-content:center; color:#555; font-size:14px; text-align:center; font-weight:bold;">КҮТҮҮ...</div>` : ''}
                </div>
                <p style="margin:15px 0 0 0; font-size:16px; color:#4a3f35; font-family:monospace; font-weight:900; letter-spacing:1px; background:rgba(255,255,255,0.4); padding:2px 8px; border-radius:4px;">
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
    const result = await Swal.fire({
        title: 'Өчүрүлсүнбү?', 
        text: "Билет кайтарылбайт",
        width: '280px', // Терезени ичкертет
        padding: '1rem', // Ички боштуктарды азайтат
        showCancelButton: true,
        confirmButtonText: 'Ооба',
        cancelButtonText: 'Жок',
        confirmButtonColor: '#ef4444', // Назик кызыл
        cancelButtonColor: '#9ca3af', // Боз түс
        buttonsStyling: true,
        customClass: {
            popup: 'compact-popup',
            title: 'compact-title',
            htmlContainer: 'compact-text',
            confirmButton: 'compact-button',
            cancelButton: 'compact-button'
        }
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "user_tickets", id));
            showToast("Өчүрүлдү", "info");
        } catch (e) {
            showToast("Ката кетти", "error");
        }
    }
};




initMovies();
