/* ==========================================
   Мемлекеттік жаңалықтар порталы — App
   ========================================== */

// ==========================================
// Firebase Setup
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBvUYswzoC6agkm6YLcIJONNkt1WqSKD-0",
  authDomain: "gova-8d7a4.firebaseapp.com",
  projectId: "gova-8d7a4",
  storageBucket: "gova-8d7a4.firebasestorage.app",
  messagingSenderId: "119904820189",
  appId: "1:119904820189:web:078c9466c91d56a55c3434",
  measurementId: "G-B5T2TVBK7W"
};

let db = null;
let auth = null;
try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) {
    console.error('Firebase initialization error:', e);
}

// ==========================================
// Storage & State
// ==========================================
const KEYS = { users: 'gov_users', posts: 'gov_posts', session: 'gov_session' };

function load(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } }
function save(k, d) { localStorage.setItem(k, JSON.stringify(d)); }

let appUsers = load(KEYS.users) || [];
let appPosts = load(KEYS.posts) || [];

function getUsers() { return appUsers; }
function saveUsers(u) {
    appUsers = u;
    save(KEYS.users, u);
}

function syncUserToLocal(userData) {
    let users = getUsers();
    const idx = users.findIndex(u => u.id === userData.id || u.email === userData.email);
    if (idx >= 0) {
        users[idx] = Object.assign({}, users[idx], userData);
    } else {
        users.push(userData);
    }
    saveUsers(users);
}

function getPosts() { return appPosts; }
function savePosts(p) {
    appPosts = p;
    save(KEYS.posts, p);
}

function getSession() { return load(KEYS.session); }
function saveSession(s) { save(KEYS.session, s); }
function clearSession() { localStorage.removeItem(KEYS.session); }
function currentUser() {
    const s = getSession();
    if (!s) return null;
    let u = getUsers().find(u => u.id === s.userId) || null;
    if (!u && auth && auth.currentUser && auth.currentUser.uid === s.userId) {
        u = {
            id: auth.currentUser.uid,
            name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
            email: auth.currentUser.email,
            role: (auth.currentUser.email === 'admin@admin.com') ? 'admin' : 'user'
        };
    }
    return u;
}
function isAdmin() {
    const u = currentUser();
    return u && (u.role === 'admin' || u.email === 'admin@admin.com');
}

// ==========================================
// Utils
// ==========================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function countComments(post) {
    if (!post || !post.comments) return 0;
    return post.comments.reduce((total, c) => total + 1 + (c.replies ? c.replies.length : 0), 0);
}

const months = ['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
const monthsShort = ['ҚАҢ','АҚП','НАУ','СӘУ','МАМ','МАУ','ШІЛ','ТАМ','ҚЫР','ҚАЗ','ҚАР','ЖЕЛ'];

function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function dateDay(iso) { return new Date(iso).getDate(); }
function dateMonthShort(iso) { return monthsShort[new Date(iso).getMonth()]; }

function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'жаңа ғана';
    const m = Math.floor(s / 60); if (m < 60) return `${m} мин бұрын`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} сағат бұрын`;
    const d = Math.floor(h / 24); if (d < 7) return `${d} күн бұрын`;
    return formatDate(iso);
}

const avatarColors = ['#0c2340','#1a4f8b','#2574c4','#b89230','#2b8a3e','#c62828','#6741d9','#0891b2','#d97706','#495057'];
function avatarColor(name) { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return avatarColors[Math.abs(h) % avatarColors.length]; }
function initials(name) { return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

const catLabels = {
    news: 'Жаңалық',
    announce: 'Хабарлама',
    decree: 'Бұйрық',
    event: 'Іс-шара',
    press: 'Баспасөз'
};

// ==========================================
// Routing
// ==========================================
let currentView = 'home';
let viewData = {};
let activeReplyCommentId = null;
let regStep = 'form';
let pendingReg = null;
function navigate(view, data = {}) { currentView = view; viewData = data; activeReplyCommentId = null; regStep = 'form'; render(); window.scrollTo(0, 0); }

// ==========================================
// Seed Data
// ==========================================
const initialSeedPosts = [
    {
        id: 'seed_1', userId: 'admin_root', author: 'Әкімшілік', category: 'news',
        title: 'Цифрлық қызметтер порталы жаңартылды',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
        content: 'Азаматтарға арналған цифрлық қызметтер порталы толығымен жаңартылды. Жаңа нұсқада 50-ден астам мемлекеттік қызмет онлайн форматта қол жетімді болады.\n\nЖаңартылған портал арқылы азаматтар құжаттарды электронды түрде тапсыра алады, өтініштердің мәртебесін бақылай алады және хабарламалар ала алады.\n\nПортал 2026 жылдың 1 қарашасынан бастап толық көлемде жұмыс істейді.',
        comments: [
            {
                id: 'c1', userId: 'g1', author: 'Асқар Нұрланов', text: 'Өте жақсы жаңалық! Сұрақ: ескі аккаунттар сақтала ма?', createdAt: new Date(Date.now() - 7200000).toISOString(),
                replies: [
                    { id: 'r1', userId: 'admin_root', author: 'Әкімшілік', text: 'Иә, барлық ескі аккаунттар толық сақталады, қайта тіркелудің қажеті жоқ.', createdAt: new Date(Date.now() - 5400000).toISOString() }
                ]
            },
            { id: 'c2', userId: 'g2', author: 'Гүлнәр Сериқова', text: 'Мобильді қосымша да жаңартыла ма?', createdAt: new Date(Date.now() - 3600000).toISOString(), replies: [] }
        ],
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
        id: 'seed_2', userId: 'admin_root', author: 'Әкімшілік', category: 'decree',
        title: 'Жаңа нормативтік-құқықтық акт қабылданды',
        imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
        content: 'Мемлекеттік қызметтерді көрсету тәртібіне өзгерістер енгізу туралы жаңа нормативтік-құқықтық акт қабылданды.\n\nНегізгі өзгерістер:\n- Құжаттарды қарау мерзімі 30 күнге дейін қысқартылды\n- Электронды өтініштер басымдықпен қарастырылады\n- Жаңа шағымдану тетігі енгізілді\n\nАкт 2026 жылдың 15 қарашасынан күшіне енеді.',
        comments: [],
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
        id: 'seed_3', userId: 'admin_root', author: 'Әкімшілік', category: 'event',
        title: 'Халықпен кездесу — 5 қараша',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',
        content: 'Құрметті азаматтар!\n\nМемлекеттік орган басшысының халықпен кездесуі 2026 жылдың 5 қарашасында, сағат 10:00-де өтеді.\n\nОрын: Мемлекеттік қызмет көрсету орталығы, үлкен зал.\n\nКүн тәртібі:\n- Атқарылған жұмыстар туралы есеп\n- Азаматтардың сұрақтарына жауап\n- Келешек жоспарлар\n\nБарлығын қатысуға шақырамыз!',
        comments: [
            { id: 'c3', userId: 'g3', author: 'Марат Қасымов', text: 'Онлайн трансляция болады ма?', createdAt: new Date(Date.now() - 43200000).toISOString() }
        ],
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
        id: 'seed_4', userId: 'admin_root', author: 'Әкімшілік', category: 'announce',
        title: 'Бос лауазымдық орындарға конкурс жарияланды',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
        content: 'Мемлекеттік органда бос лауазымдық орындарға конкурс жарияланады:\n\n1. Бас маман — 2 орын\n2. Жетекші маман — 3 орын\n3. Кеңесші — 1 орын\n\nТалаптар: жоғары білім, мемлекеттік тілді білу, компьютерлік сауаттылық.\n\nҚұжат қабылдау мерзімі: 2026 жылдың 1-15 қарашасы.\n\nТолық ақпарат: hr@gov.kz',
        comments: [],
        createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
    },
    {
        id: 'seed_5', userId: 'admin_root', author: 'Әкімшілік', category: 'press',
        title: 'Баспасөз мәлімдемесі: Аймақ дамуының қорытындысы',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
        content: 'Биылғы жылдың 9 айында аймақ дамуында оңтайлы нәтижелер тіркелді:\n\n- Жалпы өңірлік өнім 8,5%-ға өсті\n- 1200 жаңа жұмыс орны құрылды\n- 15 инвестициялық жоба іске қосылды\n- Орташа жалақы 15%-ға артты\n\nМемлекеттік орган аймақ экономикасын дамыту бағытында жұмысын жалғастыруда.',
        comments: [
            { id: 'c4', userId: 'g4', author: 'Алия Бекмұратова', text: 'Толық статистикалық деректерді қайдан көруге болады?', createdAt: new Date(Date.now() - 86400000).toISOString() }
        ],
        createdAt: new Date(Date.now() - 3600000 * 120).toISOString()
    }
];

function seedLocalIfEmpty() {
    let users = getUsers();
    if (!users.find(u => u.email === 'admin@admin.com')) {
        users.push({ id: 'admin_root', name: 'Әкімшілік', email: 'admin@admin.com', role: 'admin', createdAt: new Date().toISOString() });
        saveUsers(users);
    }
    if (getPosts().length === 0) {
        savePosts(initialSeedPosts);
    }
}

// ==========================================
// Firebase Real-time Synchronization
// ==========================================
function initFirebaseSync() {
    if (!db) return;

    // 1. Sync users
    db.collection('users').onSnapshot(snapshot => {
        if (!snapshot.empty) {
            const list = [];
            snapshot.forEach(doc => list.push(doc.data()));
            saveUsers(list);
            renderTopBar();
            renderNav();
            if (currentView === 'admin') render();
        } else {
            // First time setup: seed admin profile to Firestore without hardcoded password
            const adminUser = {
                id: 'admin_root',
                name: 'Әкімшілік',
                email: 'admin@admin.com',
                role: 'admin',
                createdAt: new Date().toISOString()
            };
            db.collection('users').doc('admin_root').set(adminUser).catch(console.error);
        }
    }, err => console.warn('Firestore users error:', err));

    // 2. Sync posts
    db.collection('posts').onSnapshot(snapshot => {
        if (!snapshot.empty) {
            const list = [];
            snapshot.forEach(doc => list.push(doc.data()));

            // Ensure sample news has admin reply if missing
            const p1 = list.find(p => p.id === 'seed_1');
            if (p1 && p1.comments) {
                const c1 = p1.comments.find(c => c.id === 'c1');
                if (c1 && (!c1.replies || c1.replies.length === 0)) {
                    c1.replies = [{
                        id: 'r1',
                        userId: 'admin_root',
                        author: 'Әкімшілік',
                        isAdmin: true,
                        text: 'Иә, барлық ескі аккаунттар толық сақталады, қайта тіркелудің қажеті жоқ.',
                        createdAt: new Date(Date.now() - 5400000).toISOString()
                    }];
                    db.collection('posts').doc('seed_1').update({ comments: p1.comments }).catch(() => {});
                }
            }

            savePosts(list);
            if (currentView === 'home') {
                renderNewsCards(currentFilter, currentSearch);
            } else if (currentView === 'admin' || currentView === 'post') {
                render();
            }
        } else {
            // First time setup: seed posts to Firestore
            initialSeedPosts.forEach(p => {
                db.collection('posts').doc(p.id).set(p).catch(console.error);
            });
        }
    }, err => console.warn('Firestore posts error:', err));

    // 3. Auth listener
    if (auth) {
        auth.onAuthStateChanged(firebaseUser => {
            if (firebaseUser) {
                saveSession({ userId: firebaseUser.uid });
                let u = getUsers().find(x => x.id === firebaseUser.uid);
                if (!u) {
                    const userData = {
                        id: firebaseUser.uid,
                        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                        email: firebaseUser.email,
                        role: firebaseUser.email === 'admin@admin.com' ? 'admin' : 'user',
                        createdAt: new Date().toISOString()
                    };
                    syncUserToLocal(userData);
                }
            }
            renderTopBar();
            renderNav();
        });
    }
}

// ==========================================
// Render
// ==========================================
function render() {
    renderTopBar();
    renderNav();
    const app = document.getElementById('app');
    switch (currentView) {
        case 'login': app.innerHTML = renderLogin(); break;
        case 'register': app.innerHTML = renderRegister(); break;
        case 'home': app.innerHTML = renderHome(); break;
        case 'post': app.innerHTML = renderPostDetail(); break;
        case 'admin': app.innerHTML = renderAdmin(); break;
        default: app.innerHTML = renderHome();
    }
    attachEvents();
}

function renderTopBar() {
    const el = document.getElementById('topBarRight');
    const user = currentUser();
    if (!user) {
        el.innerHTML = `
            <button class="top-link" onclick="navigate('login')">Кіру</button>
            <button class="top-link" onclick="navigate('register')">Тіркелу</button>
        `;
    } else {
        el.innerHTML = `
            <div class="top-user">
                <div class="top-avatar" style="background:${avatarColor(user.name)}">${initials(user.name)}</div>
                ${esc(user.name)}
            </div>
            <button class="top-link" onclick="logout()">Шығу</button>
        `;
    }
}

function renderNav() {
    const nav = document.getElementById('headerNav');
    const user = currentUser();
    let html = `<button class="nav-link ${currentView === 'home' ? 'active' : ''}" onclick="navigate('home')">Жаңалықтар</button>`;
    if (user && user.role === 'admin') {
        html += `<button class="nav-link ${currentView === 'admin' ? 'active' : ''}" onclick="navigate('admin')">Басқару панелі</button>`;
        html += `<button class="nav-btn" onclick="openNewPost()">+ Жаңалық қосу</button>`;
    }
    nav.innerHTML = html;
}

// ==========================================
// Auth
// ==========================================
function renderLogin() {
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1 class="auth-title">Жүйеге кіру</h1>
                <p class="auth-sub">Пікір қалдыру үшін аккаунтыңызға кіріңіз</p>

                <button type="button" class="btn btn-google" onclick="handleGoogleSignIn()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Google арқылы кіру
                </button>

                <div class="auth-divider"><span>немесе email арқылы</span></div>

                <form id="loginForm">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="loginEmail" placeholder="email@mail.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Құпия сөз</label>
                        <input type="password" class="form-input" id="loginPass" placeholder="••••••••" required>
                    </div>
                    <div id="loginError" class="form-error" style="margin-bottom:12px"></div>
                    <button type="submit" class="btn">Кіру</button>
                </form>
                <p class="auth-switch">Аккаунтыңыз жоқ па? <a onclick="navigate('register')">Тіркелу</a></p>
            </div>
        </div>`;
}

function renderRegister() {
    if (regStep === 'otp' && pendingReg) {
        return `
            <div class="auth-page">
                <div class="auth-card">
                    <h1 class="auth-title">Поштаны растау</h1>
                    <p class="otp-sub">Біз <strong>${esc(pendingReg.email)}</strong> поштасына 6 сандық растау кодын жібердік. Кодты енгізіңіз:</p>

                    <form id="otpForm">
                        <div class="form-group">
                            <input type="text" class="form-input otp-input" id="otpCode" placeholder="••••••" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" required autofocus autocomplete="one-time-code">
                        </div>
                        <div id="otpError" class="form-error" style="margin-bottom:12px"></div>
                        <button type="submit" class="btn">Растау және кіру</button>
                    </form>

                    <div class="otp-actions">
                        <button type="button" class="otp-resend-btn" onclick="resendOtpCode()">Код келмеді ме? Қайта жіберу</button>
                        <button type="button" class="otp-back-btn" onclick="cancelOtpStep()">← Артқа қайту</button>
                    </div>
                </div>
            </div>`;
    }

    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1 class="auth-title">Тіркелу</h1>
                <p class="auth-sub">Жаңа аккаунт жасап, пікір қалдырыңыз</p>

                <button type="button" class="btn btn-google" onclick="handleGoogleSignIn()">
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Google арқылы кіру
                </button>

                <div class="auth-divider"><span>немесе email арқылы</span></div>

                <form id="registerForm">
                    <div class="form-group">
                        <label class="form-label">Аты-жөні</label>
                        <input type="text" class="form-input" id="regName" placeholder="Мысалы: Айбек Серікұлы" required maxlength="50">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="regEmail" placeholder="email@mail.com" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Құпия сөз</label>
                        <input type="password" class="form-input" id="regPass" placeholder="Кемінде 6 таңба" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Құпия сөзді қайталау</label>
                        <input type="password" class="form-input" id="regPass2" placeholder="Қайталаңыз" required minlength="6">
                    </div>
                    <div id="regError" class="form-error" style="margin-bottom:12px"></div>
                    <button type="submit" class="btn">Тіркелу</button>
                </form>
                <p class="auth-switch">Аккаунтыңыз бар ма? <a onclick="navigate('login')">Кіру</a></p>
            </div>
        </div>`;
}

// ==========================================
// Home
// ==========================================
function renderHome() {
    return `
        <div class="container">
            <div class="home-hero">
                <h1>Ресми жаңалықтар порталы</h1>
                <p>Мемлекеттік орган жаңалықтары, хабарламалар, бұйрықтар және іс-шаралар</p>
            </div>
            <div class="toolbar">
                <div class="toolbar-left">
                    <input type="text" class="search-input" id="searchInput" placeholder="Жаңалық іздеу...">
                    <button class="chip active" data-cat="all">Барлығы</button>
                    <button class="chip" data-cat="news">Жаңалық</button>
                    <button class="chip" data-cat="announce">Хабарлама</button>
                    <button class="chip" data-cat="decree">Бұйрық</button>
                    <button class="chip" data-cat="event">Іс-шара</button>
                    <button class="chip" data-cat="press">Баспасөз</button>
                </div>
            </div>
            <div class="news-list" id="newsList"></div>
            <div id="emptyState" class="empty" style="display:none">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <h3>Жаңалық табылмады</h3>
                <p>Әзірге жаңалық жарияланбаған</p>
            </div>
        </div>

        <!-- New Post Modal -->
        <div class="modal-overlay" id="newPostModal">
            <div class="modal">
                <div class="modal-head">
                    <h2>Жаңалық қосу</h2>
                    <button class="modal-close" onclick="closeNewPost()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="newPostForm">
                        <div class="form-group">
                            <label class="form-label">Тақырып</label>
                            <input type="text" class="form-input" id="npTitle" placeholder="Жаңалық тақырыбы" required maxlength="150">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Санат</label>
                            <select class="form-input" id="npCat" required>
                                <option value="">Таңдаңыз</option>
                                <option value="news">Жаңалық</option>
                                <option value="announce">Хабарлама</option>
                                <option value="decree">Бұйрық</option>
                                <option value="event">Іс-шара</option>
                                <option value="press">Баспасөз</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Мазмұны</label>
                            <textarea class="form-input" id="npContent" placeholder="Жаңалықтың толық мәтіні..." required maxlength="5000" rows="8"></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Фотосурет қосу (міндетті емес)</label>
                            <div class="image-upload-wrap">
                                <label for="npImageFile" class="image-upload-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    Құрылғыдан фото таңдау
                                </label>
                                <input type="file" id="npImageFile" accept="image/*" style="display:none" onchange="handleImageSelect(event)">
                                <div id="imagePreviewContainer" class="image-preview-box" style="display:none">
                                    <img id="imagePreview" src="" alt="Алдын ала көру">
                                    <button type="button" class="image-remove-btn" onclick="removeSelectedImage()">✕ Өшіру</button>
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="btn" style="margin-top:8px">Жариялау</button>
                    </form>
                </div>
            </div>
        </div>`;
}

function renderNewsCards(filter = 'all', search = '') {
    let posts = getPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filter !== 'all') posts = posts.filter(p => p.category === filter);
    if (search.trim()) {
        const q = search.toLowerCase();
        posts = posts.filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
    }

    const list = document.getElementById('newsList');
    const empty = document.getElementById('emptyState');
    if (!list) return;

    if (posts.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = posts.map(p => {
        const cc = countComments(p);
        return `
            <article class="news-card ${p.imageUrl ? 'has-image' : ''}" onclick="navigate('post', {id:'${p.id}'})">
                ${p.imageUrl ? `
                    <div class="news-thumb">
                        <img src="${p.imageUrl}" alt="${esc(p.title)}" loading="lazy">
                    </div>
                ` : `
                    <div class="news-date-block">
                        <div class="news-date-day">${dateDay(p.createdAt)}</div>
                        <div class="news-date-month">${dateMonthShort(p.createdAt)}</div>
                    </div>
                `}
                <div class="news-body">
                    <span class="news-badge badge-${p.category}">${catLabels[p.category]}</span>
                    <h2 class="news-title">${esc(p.title)}</h2>
                    <p class="news-excerpt">${esc(p.content)}</p>
                    <div class="news-footer">
                        <span class="news-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            ${cc} пікір
                        </span>
                        <span class="news-stat">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${timeAgo(p.createdAt)}
                        </span>
                    </div>
                </div>
            </article>`;
    }).join('');
}

// ==========================================
// Post Detail
// ==========================================
function renderPostDetail() {
    const post = getPosts().find(p => p.id === viewData.id);
    if (!post) return `<div class="container"><div class="empty"><h3>Табылмады</h3></div></div>`;

    const user = currentUser();
    const comments = post.comments || [];
    const canDelete = user && user.role === 'admin';

    let commentForm = '';
    if (user) {
        commentForm = `
            <form class="comment-form" id="commentForm">
                <textarea class="form-input" id="cmtText" placeholder="Пікіріңізді жазыңыз..." required maxlength="1000" rows="3"></textarea>
                <div class="comment-form-actions">
                    <button type="submit" class="btn btn-sm">Жіберу</button>
                </div>
            </form>`;
    } else {
        commentForm = `<div class="login-prompt">Пікір қалдыру үшін <a onclick="navigate('login')">кіріңіз</a> немесе <a onclick="navigate('register')">тіркеліңіз</a></div>`;
    }

    const commentsHtml = comments.length > 0
        ? comments.map(c => {
            const cc = avatarColor(c.author);
            const ci = initials(c.author);
            const canDel = user && (user.role === 'admin' || user.id === c.userId);
            const delBtn = canDel ? `<button class="comment-delete" onclick="deleteComment('${post.id}','${c.id}'); event.stopPropagation();">жою</button>` : '';
            const replies = c.replies || [];
            const isReplying = activeReplyCommentId === c.id;

            const repliesHtml = replies.length > 0 ? `
                <div class="replies-list">
                    ${replies.map(r => {
                        const rc = avatarColor(r.author);
                        const ri = initials(r.author);
                        const canDelR = user && (user.role === 'admin' || user.id === r.userId);
                        const delRBtn = canDelR ? `<button class="comment-delete" onclick="deleteReply('${post.id}','${c.id}','${r.id}'); event.stopPropagation();">жою</button>` : '';
                        return `
                            <div class="reply-item">
                                <div class="reply-avatar" style="background:${rc}">${ri}</div>
                                <div class="reply-body">
                                    <div class="comment-header">
                                        <span class="comment-author">${esc(r.author)}</span>
                                        ${(r.isAdmin || r.role === 'admin' || r.author === 'Әкімшілік') ? '<span class="author-badge">Әкімшілік</span>' : ''}
                                        ${delRBtn}
                                    </div>
                                    <div class="comment-text">${esc(r.text)}</div>
                                    <div class="comment-time">${timeAgo(r.createdAt)}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '';

            const replyFormHtml = isReplying ? `
                <form class="reply-form" onsubmit="submitReply(event, '${post.id}', '${c.id}')">
                    <textarea class="form-input" id="replyInput_${c.id}" placeholder="${esc(c.author)} пікіріне жауап жазыңыз..." required maxlength="1000" rows="2"></textarea>
                    <div class="reply-form-actions">
                        <button type="button" class="btn btn-sm btn-subtle" onclick="cancelReply()">Болдырмау</button>
                        <button type="submit" class="btn btn-sm">Жауап беру</button>
                    </div>
                </form>
            ` : '';

            return `
                <div class="comment-item">
                    <div class="comment-avatar" style="background:${cc}">${ci}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${esc(c.author)}</span>
                            ${(c.isAdmin || c.role === 'admin' || c.author === 'Әкімшілік') ? '<span class="author-badge">Әкімшілік</span>' : ''}
                        </div>
                        <div class="comment-text">${esc(c.text)}</div>
                        <div class="comment-actions">
                            <span class="comment-time">${timeAgo(c.createdAt)}</span>
                            <button class="comment-reply-btn" onclick="openReplyForm('${c.id}')">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                                Жауап беру
                            </button>
                            ${delBtn}
                        </div>
                        ${replyFormHtml}
                        ${repliesHtml}
                    </div>
                </div>`;
        }).join('')
        : '<p class="no-comments">Әзірге пікір жоқ. Бірінші болып жазыңыз!</p>';

    return `
        <div class="detail-page">
            <button class="detail-back" onclick="navigate('home')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Барлық жаңалықтар
            </button>

            <div class="detail-card">
                ${post.imageUrl ? `
                    <div class="detail-image-wrap">
                        <img src="${post.imageUrl}" class="detail-image" alt="${esc(post.title)}">
                    </div>
                ` : ''}
                <div class="detail-badge">
                    <span class="news-badge badge-${post.category}">${catLabels[post.category]}</span>
                </div>
                <h1 class="detail-title">${esc(post.title)}</h1>
                <div class="detail-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${formatDate(post.createdAt)}
                    <span style="color:var(--gray-300)">·</span>
                    ${esc(post.author)}
                </div>
                <div class="detail-content">${esc(post.content)}</div>
                ${canDelete ? `<div class="detail-actions"><button class="btn btn-sm btn-danger" onclick="deletePost('${post.id}')">Жаңалықты жою</button></div>` : ''}
            </div>

            <div class="comments-card">
                <div class="comments-title">
                    Азаматтар пікірлері <span class="comments-count">${countComments(post)}</span>
                </div>
                ${commentForm}
                <div class="comments-list">${commentsHtml}</div>
            </div>
        </div>`;
}

// ==========================================
// Admin
// ==========================================
function renderAdmin() {
    if (!isAdmin()) { navigate('home'); return ''; }
    const users = getUsers();
    const posts = getPosts();
    let tc = 0; posts.forEach(p => tc += countComments(p));
    const tab = viewData.tab || 'posts';

    let tabContent = '';

    if (tab === 'posts') {
        tabContent = posts.length === 0
            ? '<div class="empty" style="padding:40px"><h3>Жаңалық жоқ</h3></div>'
            : `<div class="admin-card"><table class="admin-table">
                <thead><tr><th>Тақырып</th><th>Санат</th><th>Пікір</th><th>Күні</th><th></th></tr></thead>
                <tbody>${posts.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => `
                    <tr>
                        <td class="td-title">${esc(p.title)}</td>
                        <td><span class="news-badge badge-${p.category}">${catLabels[p.category]}</span></td>
                        <td>${countComments(p)}</td>
                        <td>${formatDate(p.createdAt)}</td>
                        <td class="td-actions">
                            <button class="admin-btn-sm" onclick="navigate('post', {id:'${p.id}'})">Көру</button>
                            <button class="admin-btn-sm danger" onclick="deletePost('${p.id}')">Жою</button>
                        </td>
                    </tr>`).join('')}
                </tbody></table></div>`;
    } else {
        tabContent = `<div class="admin-card"><table class="admin-table">
            <thead><tr><th>Аты</th><th>Email</th><th>Рөлі</th><th>Тіркелген</th><th></th></tr></thead>
            <tbody>${users.map(u => `
                <tr>
                    <td style="font-weight:600">${esc(u.name)}</td>
                    <td>${esc(u.email)}</td>
                    <td><span class="role-badge role-${u.role}">${u.role === 'admin' ? 'Админ' : 'Қолданушы'}</span></td>
                    <td>${formatDate(u.createdAt)}</td>
                    <td class="td-actions">${u.role !== 'admin' ? `<button class="admin-btn-sm danger" onclick="deleteUser('${u.id}')">Жою</button>` : ''}</td>
                </tr>`).join('')}
            </tbody></table></div>`;
    }

    return `
        <div class="admin-page">
            <div class="admin-header">
                <h1 class="admin-title">Басқару панелі</h1>
                <p class="admin-sub">Жаңалықтар мен қолданушыларды басқарыңыз</p>
            </div>
            <div class="admin-stats">
                <div class="admin-stat"><div class="admin-stat-num">${posts.length}</div><div class="admin-stat-label">Жаңалық</div></div>
                <div class="admin-stat"><div class="admin-stat-num">${tc}</div><div class="admin-stat-label">Пікір</div></div>
                <div class="admin-stat"><div class="admin-stat-num">${users.filter(u => u.role !== 'admin').length}</div><div class="admin-stat-label">Қолданушы</div></div>
            </div>
            <div class="admin-tabs">
                <button class="admin-tab ${tab === 'posts' ? 'active' : ''}" onclick="navigate('admin', {tab:'posts'})">Жаңалықтар</button>
                <button class="admin-tab ${tab === 'users' ? 'active' : ''}" onclick="navigate('admin', {tab:'users'})">Қолданушылар</button>
            </div>
            ${tabContent}
        </div>`;
}

// ==========================================
// Actions
// ==========================================
function handleGoogleSignIn() {
    if (!auth) {
        toast('Firebase қосылмаған', 'error');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        const u = result.user;
        const isAdminUser = u.email === 'admin@admin.com';
        const userData = {
            id: u.uid,
            name: u.displayName || u.email.split('@')[0],
            email: u.email,
            role: isAdminUser ? 'admin' : 'user',
            createdAt: new Date().toISOString()
        };

        if (db) {
            db.collection('users').doc(u.uid).get().then(doc => {
                if (!doc.exists) {
                    db.collection('users').doc(u.uid).set(userData).catch(console.error);
                } else {
                    const existing = doc.data();
                    userData.role = existing.role || userData.role;
                }
                saveSession({ userId: u.uid });
                syncUserToLocal(userData);
                toast('Google арқылы сәтті кірдіңіз!', 'success');
                navigate('home');
            }).catch(() => {
                saveSession({ userId: u.uid });
                syncUserToLocal(userData);
                toast('Google арқылы сәтті кірдіңіз!', 'success');
                navigate('home');
            });
        } else {
            saveSession({ userId: u.uid });
            syncUserToLocal(userData);
            toast('Google арқылы сәтті кірдіңіз!', 'success');
            navigate('home');
        }
    }).catch(err => {
        console.error('Google Sign In error:', err);
        if (err.code === 'auth/popup-closed-by-user') return;
        if (err.code === 'auth/unauthorized-domain') {
            toast('Firebase-те доменді Authorized domains-ке қосыңыз', 'error');
            return;
        }
        toast('Google қатесі: ' + (err.message || err.code), 'error');
    });
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');

    if (auth) {
        auth.signInWithEmailAndPassword(email, pass).then(result => {
            const u = result.user;
            saveSession({ userId: u.uid });
            toast('Сәтті кірдіңіз!', 'success');
            navigate('home');
        }).catch(() => {
            const localUser = getUsers().find(u => u.email === email && u.password === pass);
            if (localUser) {
                saveSession({ userId: localUser.id });
                toast('Сәтті кірдіңіз!', 'success');
                navigate('home');
            } else {
                err.textContent = 'Email немесе құпия сөз қате';
            }
        });
    } else {
        const user = getUsers().find(u => u.email === email && u.password === pass);
        if (!user) { err.textContent = 'Email немесе құпия сөз қате'; return; }
        saveSession({ userId: user.id });
        toast('Сәтті кірдіңіз!', 'success');
        navigate('home');
    }
}

const EMAILJS_CONFIG = {
    serviceId: "service_k6azeyi",
    templateId: "template_77l2xf3",
    publicKey: "5W7FFR2A4cBHoF6Vr"
};

function sendOtpEmail(email, name, code) {
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.publicKey) {
        emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            to_email: email,
            email: email,
            to_name: name,
            otp_code: code,
            passcode: code,
            code: code,
            message: `Сіздің порталдағы растау кодыңыз: ${code}`
        }).then(() => {
            toast(`Растау коды ${email} поштасына жіберілді! Поштаңызды тексеріңіз.`, 'info');
        }).catch(err => {
            console.error('EmailJS қатесі:', err);
            toast('Хат жіберуде қате болды: EmailJS кілттерін тексеріңіз', 'error');
        });
    } else {
        toast(`EmailJS кілттері орнатылмаған! Код поштаға жетуі үшін кілттерді қосыңыз.`, 'warning');
    }
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPass').value;
    const pass2 = document.getElementById('regPass2').value;
    const err = document.getElementById('regError');
    if (pass !== pass2) { err.textContent = 'Құпия сөздер сәйкес келмейді'; return; }
    if (pass.length < 6) { err.textContent = 'Кемінде 6 таңба қажет'; return; }

    const users = getUsers();
    if (users.find(u => u.email === email)) { err.textContent = 'Бұл email тіркелген'; return; }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingReg = {
        name,
        email,
        pass,
        code,
        createdAt: Date.now()
    };

    sendOtpEmail(email, name, code);
    regStep = 'otp';
    render();
}

function handleOtpSubmit(e) {
    e.preventDefault();
    if (!pendingReg) return;
    const input = document.getElementById('otpCode');
    const err = document.getElementById('otpError');
    if (!input) return;
    const entered = input.value.trim();

    if (entered !== pendingReg.code) {
        if (err) err.textContent = 'Енгізілген 6 сандық код қате. Қайталап көріңіз.';
        return;
    }

    const { name, email, pass } = pendingReg;

    if (auth) {
        auth.createUserWithEmailAndPassword(email, pass).then(result => {
            const u = result.user;
            u.updateProfile({ displayName: name }).catch(console.error);
            const userData = {
                id: u.uid,
                name: name,
                email: email,
                role: email === 'admin@admin.com' ? 'admin' : 'user',
                createdAt: new Date().toISOString()
            };
            if (db) {
                db.collection('users').doc(u.uid).set(userData).catch(console.error);
            }
            saveSession({ userId: u.uid });
            syncUserToLocal(userData);
            pendingReg = null;
            regStep = 'form';
            toast('Тіркелу сәтті аяқталды!', 'success');
            navigate('home');
        }).catch(fbErr => {
            if (fbErr.code === 'auth/email-already-in-use') {
                if (err) err.textContent = 'Бұл email тіркелген';
            } else {
                const u = { id: uid(), name, email, role: email === 'admin@admin.com' ? 'admin' : 'user', createdAt: new Date().toISOString() };
                syncUserToLocal(u);
                saveSession({ userId: u.id });
                pendingReg = null;
                regStep = 'form';
                toast('Тіркелу сәтті аяқталды!', 'success');
                navigate('home');
            }
        });
    } else {
        const u = { id: uid(), name, email, role: email === 'admin@admin.com' ? 'admin' : 'user', createdAt: new Date().toISOString() };
        syncUserToLocal(u);
        saveSession({ userId: u.id });
        pendingReg = null;
        regStep = 'form';
        toast('Тіркелу сәтті аяқталды!', 'success');
        navigate('home');
    }
}

function resendOtpCode() {
    if (!pendingReg) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pendingReg.code = code;
    sendOtpEmail(pendingReg.email, pendingReg.name, code);
}

function cancelOtpStep() {
    pendingReg = null;
    regStep = 'form';
    render();
}

function logout() {
    if (auth && auth.currentUser) {
        auth.signOut().catch(console.error);
    }
    clearSession();
    toast('Жүйеден шықтыңыз', 'info');
    navigate('home');
}

let currentSelectedImageBase64 = '';

function handleImageSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast('Тек сурет файлдарын таңдаңыз', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            const maxDim = 900;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            currentSelectedImageBase64 = canvas.toDataURL('image/jpeg', 0.75);

            const preview = document.getElementById('imagePreview');
            const box = document.getElementById('imagePreviewContainer');
            if (preview && box) {
                preview.src = currentSelectedImageBase64;
                box.style.display = 'block';
            }
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}

function removeSelectedImage() {
    currentSelectedImageBase64 = '';
    const fileInput = document.getElementById('npImageFile');
    if (fileInput) fileInput.value = '';
    const box = document.getElementById('imagePreviewContainer');
    if (box) box.style.display = 'none';
}

function openNewPost() {
    const m = document.getElementById('newPostModal');
    if (m) m.classList.add('active');
}

function closeNewPost() {
    const m = document.getElementById('newPostModal');
    if (m) m.classList.remove('active');
    removeSelectedImage();
}

function handleNewPost(e) {
    e.preventDefault();
    const user = currentUser();
    if (!user || user.role !== 'admin') return;
    const title = document.getElementById('npTitle').value.trim();
    const cat = document.getElementById('npCat').value;
    const content = document.getElementById('npContent').value.trim();
    if (!title || !cat || !content) return;
    const posts = getPosts();
    const newPost = {
        id: uid(),
        userId: user.id,
        author: user.name,
        title,
        category: cat,
        content,
        imageUrl: currentSelectedImageBase64 || '',
        comments: [],
        createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    savePosts(posts);
    if (db) {
        db.collection('posts').doc(newPost.id).set(newPost).catch(console.error);
    }
    removeSelectedImage();
    closeNewPost();
    toast('Жаңалық жарияланды!', 'success');
    navigate('home');
}

function handleComment(e) {
    e.preventDefault();
    const user = currentUser();
    if (!user) return;
    const text = document.getElementById('cmtText').value.trim();
    if (!text) return;
    const posts = getPosts();
    const post = posts.find(p => p.id === viewData.id);
    if (!post) return;
    if (!post.comments) post.comments = [];
    const isUserAdmin = user.role === 'admin' || user.email === 'admin@admin.com';
    const newComment = { id: uid(), userId: user.id, author: user.name, isAdmin: isUserAdmin, text, replies: [], createdAt: new Date().toISOString() };
    post.comments.push(newComment);
    savePosts(posts);
    if (db) {
        db.collection('posts').doc(post.id).update({ comments: post.comments }).catch(console.error);
    }
    toast('Пікір қосылды!', 'success');
    navigate('post', { id: viewData.id });
}

function deletePost(id) {
    if (!confirm('Бұл жаңалықты жойғыңыз келе ме?')) return;
    savePosts(getPosts().filter(p => p.id !== id));
    if (db) {
        db.collection('posts').doc(id).delete().catch(console.error);
    }
    toast('Жаңалық жойылды', 'info');
    if (currentView === 'post') navigate('home'); else render();
}

function deleteComment(postId, commentId) {
    if (!confirm('Пікірді жойғыңыз келе ме?')) return;
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    post.comments = (post.comments || []).filter(c => c.id !== commentId);
    savePosts(posts);
    if (db) {
        db.collection('posts').doc(postId).update({ comments: post.comments }).catch(console.error);
    }
    toast('Пікір жойылды', 'info');
    navigate('post', { id: postId });
}

function openReplyForm(commentId) {
    if (!currentUser()) {
        toast('Жауап беру үшін алдымен кіріңіз немесе тіркеліңіз', 'info');
        navigate('login');
        return;
    }
    activeReplyCommentId = activeReplyCommentId === commentId ? null : commentId;
    render();
    if (activeReplyCommentId) {
        setTimeout(() => {
            const input = document.getElementById(`replyInput_${commentId}`);
            if (input) input.focus();
        }, 50);
    }
}

function cancelReply() {
    activeReplyCommentId = null;
    render();
}

function submitReply(e, postId, commentId) {
    e.preventDefault();
    const user = currentUser();
    if (!user) return;
    const input = document.getElementById(`replyInput_${commentId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post || !post.comments) return;
    const comment = post.comments.find(c => c.id === commentId);
    if (!comment) return;

    if (!comment.replies) comment.replies = [];
    const isUserAdmin = user.role === 'admin' || user.email === 'admin@admin.com';
    const newReply = {
        id: uid(),
        userId: user.id,
        author: user.name,
        isAdmin: isUserAdmin,
        text,
        createdAt: new Date().toISOString()
    };
    comment.replies.push(newReply);
    savePosts(posts);

    if (db) {
        db.collection('posts').doc(post.id).update({
            comments: post.comments
        }).catch(console.error);
    }

    activeReplyCommentId = null;
    toast('Жауабыңыз қосылды!', 'success');
    render();
}

function deleteReply(postId, commentId, replyId) {
    if (!confirm('Бұл жауапты жойғыңыз келе ме?')) return;
    const posts = getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post || !post.comments) return;
    const comment = post.comments.find(c => c.id === commentId);
    if (!comment || !comment.replies) return;

    comment.replies = comment.replies.filter(r => r.id !== replyId);
    savePosts(posts);

    if (db) {
        db.collection('posts').doc(post.id).update({
            comments: post.comments
        }).catch(console.error);
    }

    toast('Жауап жойылды', 'info');
    render();
}

function deleteUser(userId) {
    if (!confirm('Қолданушыны жойғыңыз келе ме?')) return;
    saveUsers(getUsers().filter(u => u.id !== userId));
    savePosts(getPosts().filter(p => p.userId !== userId));
    if (db) {
        db.collection('users').doc(userId).delete().catch(console.error);
    }
    toast('Қолданушы жойылды', 'info');
    render();
}

// ==========================================
// Events
// ==========================================
let currentFilter = 'all';
let currentSearch = '';

function attachEvents() {
    const lf = document.getElementById('loginForm');
    if (lf) lf.addEventListener('submit', handleLogin);
    const rf = document.getElementById('registerForm');
    if (rf) rf.addEventListener('submit', handleRegister);
    const otpf = document.getElementById('otpForm');
    if (otpf) otpf.addEventListener('submit', handleOtpSubmit);
    const npf = document.getElementById('newPostForm');
    if (npf) npf.addEventListener('submit', handleNewPost);
    const cf = document.getElementById('commentForm');
    if (cf) cf.addEventListener('submit', handleComment);
    const npm = document.getElementById('newPostModal');
    if (npm) npm.addEventListener('click', e => { if (e.target === npm) closeNewPost(); });

    document.querySelectorAll('.chip[data-cat]').forEach(c => {
        c.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-cat]').forEach(x => x.classList.remove('active'));
            c.classList.add('active');
            currentFilter = c.dataset.cat;
            renderNewsCards(currentFilter, currentSearch);
        });
    });

    const si = document.getElementById('searchInput');
    if (si) {
        si.value = currentSearch;
        let t;
        si.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { currentSearch = si.value; renderNewsCards(currentFilter, currentSearch); }, 200); });
    }

    if (currentView === 'home') renderNewsCards(currentFilter, currentSearch);
}

function toast(msg, type = 'info') {
    const w = document.getElementById('toastWrap');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    w.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNewPost(); });

// Init
seedLocalIfEmpty();
render();
initFirebaseSync();
