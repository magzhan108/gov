/* ==========================================
   Мемлекеттік жаңалықтар порталы — App
   ========================================== */

// ==========================================
// Storage
// ==========================================
const KEYS = { users: 'gov_users', posts: 'gov_posts', session: 'gov_session' };

function load(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } }
function save(k, d) { localStorage.setItem(k, JSON.stringify(d)); }
function getUsers() { return load(KEYS.users) || []; }
function saveUsers(u) { save(KEYS.users, u); }
function getPosts() { return load(KEYS.posts) || []; }
function savePosts(p) { save(KEYS.posts, p); }
function getSession() { return load(KEYS.session); }
function saveSession(s) { save(KEYS.session, s); }
function clearSession() { localStorage.removeItem(KEYS.session); }
function currentUser() { const s = getSession(); if (!s) return null; return getUsers().find(u => u.id === s.userId) || null; }
function isAdmin() { const u = currentUser(); return u && u.role === 'admin'; }

// ==========================================
// Utils
// ==========================================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

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
function navigate(view, data = {}) { currentView = view; viewData = data; render(); window.scrollTo(0, 0); }

// ==========================================
// Seed
// ==========================================
function seedIfEmpty() {
    let users = getUsers();
    if (!users.find(u => u.email === 'admin@admin.com')) {
        users.push({ id: uid(), name: 'Әкімшілік', email: 'admin@admin.com', password: 'admin123', role: 'admin', createdAt: new Date().toISOString() });
        saveUsers(users);
    }

    if (getPosts().length === 0) {
        const admin = getUsers().find(u => u.role === 'admin');
        const posts = [
            {
                id: uid(), userId: admin.id, author: admin.name, category: 'news',
                title: 'Цифрлық қызметтер порталы жаңартылды',
                content: 'Азаматтарға арналған цифрлық қызметтер порталы толығымен жаңартылды. Жаңа нұсқада 50-ден астам мемлекеттік қызмет онлайн форматта қол жетімді болады.\n\nЖаңартылған портал арқылы азаматтар құжаттарды электронды түрде тапсыра алады, өтініштердің мәртебесін бақылай алады және хабарламалар ала алады.\n\nПортал 2026 жылдың 1 қарашасынан бастап толық көлемде жұмыс істейді.',
                comments: [
                    { id: uid(), userId: 'g1', author: 'Асқар Нұрланов', text: 'Өте жақсы жаңалық! Сұрақ: ескі аккаунттар сақтала ма?', createdAt: new Date(Date.now() - 7200000).toISOString() },
                    { id: uid(), userId: 'g2', author: 'Гүлнәр Сериқова', text: 'Мобильді қосымша да жаңартыла ма?', createdAt: new Date(Date.now() - 3600000).toISOString() }
                ],
                createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
            },
            {
                id: uid(), userId: admin.id, author: admin.name, category: 'decree',
                title: 'Жаңа нормативтік-құқықтық акт қабылданды',
                content: 'Мемлекеттік қызметтерді көрсету тәртібіне өзгерістер енгізу туралы жаңа нормативтік-құқықтық акт қабылданды.\n\nНегізгі өзгерістер:\n- Құжаттарды қарау мерзімі 30 күнге дейін қысқартылды\n- Электронды өтініштер басымдықпен қарастырылады\n- Жаңа шағымдану тетігі енгізілді\n\nАкт 2026 жылдың 15 қарашасынан күшіне енеді.',
                comments: [],
                createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
            },
            {
                id: uid(), userId: admin.id, author: admin.name, category: 'event',
                title: 'Халықпен кездесу — 5 қараша',
                content: 'Құрметті азаматтар!\n\nМемлекеттік орган басшысының халықпен кездесуі 2026 жылдың 5 қарашасында, сағат 10:00-де өтеді.\n\nОрын: Мемлекеттік қызмет көрсету орталығы, үлкен зал.\n\nКүн тәртібі:\n- Атқарылған жұмыстар туралы есеп\n- Азаматтардың сұрақтарына жауап\n- Келешек жоспарлар\n\nБарлығын қатысуға шақырамыз!',
                comments: [
                    { id: uid(), userId: 'g3', author: 'Марат Қасымов', text: 'Онлайн трансляция болады ма?', createdAt: new Date(Date.now() - 43200000).toISOString() }
                ],
                createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
            },
            {
                id: uid(), userId: admin.id, author: admin.name, category: 'announce',
                title: 'Бос лауазымдық орындарға конкурс жарияланды',
                content: 'Мемлекеттік органда бос лауазымдық орындарға конкурс жарияланады:\n\n1. Бас маман — 2 орын\n2. Жетекші маман — 3 орын\n3. Кеңесші — 1 орын\n\nТалаптар: жоғары білім, мемлекеттік тілді білу, компьютерлік сауаттылық.\n\nҚұжат қабылдау мерзімі: 2026 жылдың 1-15 қарашасы.\n\nТолық ақпарат: hr@gov.kz',
                comments: [],
                createdAt: new Date(Date.now() - 3600000 * 72).toISOString()
            },
            {
                id: uid(), userId: admin.id, author: admin.name, category: 'press',
                title: 'Баспасөз мәлімдемесі: Аймақ дамуының қорытындысы',
                content: 'Биылғы жылдың 9 айында аймақ дамуында оңтайлы нәтижелер тіркелді:\n\n- Жалпы өңірлік өнім 8,5%-ға өсті\n- 1200 жаңа жұмыс орны құрылды\n- 15 инвестициялық жоба іске қосылды\n- Орташа жалақы 15%-ға артты\n\nМемлекеттік орган аймақ экономикасын дамыту бағытында жұмысын жалғастыруда.',
                comments: [
                    { id: uid(), userId: 'g4', author: 'Алия Бекмұратова', text: 'Толық статистикалық деректерді қайдан көруге болады?', createdAt: new Date(Date.now() - 86400000).toISOString() }
                ],
                createdAt: new Date(Date.now() - 3600000 * 120).toISOString()
            }
        ];
        savePosts(posts);
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
    return `
        <div class="auth-page">
            <div class="auth-card">
                <h1 class="auth-title">Тіркелу</h1>
                <p class="auth-sub">Жаңа аккаунт жасап, пікір қалдырыңыз</p>
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
        const cc = p.comments ? p.comments.length : 0;
        return `
            <article class="news-card" onclick="navigate('post', {id:'${p.id}'})">
                <div class="news-date-block">
                    <div class="news-date-day">${dateDay(p.createdAt)}</div>
                    <div class="news-date-month">${dateMonthShort(p.createdAt)}</div>
                </div>
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
            return `
                <div class="comment-item">
                    <div class="comment-avatar" style="background:${cc}">${ci}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${esc(c.author)}</span>
                            ${delBtn}
                        </div>
                        <div class="comment-text">${esc(c.text)}</div>
                        <div class="comment-time">${timeAgo(c.createdAt)}</div>
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
                    Азаматтар пікірлері <span class="comments-count">${comments.length}</span>
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
    let tc = 0; posts.forEach(p => tc += (p.comments ? p.comments.length : 0));
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
                        <td>${p.comments ? p.comments.length : 0}</td>
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
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const err = document.getElementById('loginError');
    const user = getUsers().find(u => u.email === email && u.password === pass);
    if (!user) { err.textContent = 'Email немесе құпия сөз қате'; return; }
    saveSession({ userId: user.id });
    toast('Сәтті кірдіңіз!', 'success');
    navigate('home');
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
    const u = { id: uid(), name, email, password: pass, role: 'user', createdAt: new Date().toISOString() };
    users.push(u);
    saveUsers(users);
    saveSession({ userId: u.id });
    toast('Тіркелу сәтті аяқталды!', 'success');
    navigate('home');
}

function logout() {
    clearSession();
    toast('Жүйеден шықтыңыз', 'info');
    navigate('home');
}

function openNewPost() {
    const m = document.getElementById('newPostModal');
    if (m) m.classList.add('active');
}

function closeNewPost() {
    const m = document.getElementById('newPostModal');
    if (m) m.classList.remove('active');
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
    posts.push({ id: uid(), userId: user.id, author: user.name, title, category: cat, content, comments: [], createdAt: new Date().toISOString() });
    savePosts(posts);
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
    post.comments.push({ id: uid(), userId: user.id, author: user.name, text, createdAt: new Date().toISOString() });
    savePosts(posts);
    toast('Пікір қосылды!', 'success');
    navigate('post', { id: viewData.id });
}

function deletePost(id) {
    if (!confirm('Бұл жаңалықты жойғыңыз келе ме?')) return;
    savePosts(getPosts().filter(p => p.id !== id));
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
    toast('Пікір жойылды', 'info');
    navigate('post', { id: postId });
}

function deleteUser(userId) {
    if (!confirm('Қолданушыны жойғыңыз келе ме?')) return;
    saveUsers(getUsers().filter(u => u.id !== userId));
    savePosts(getPosts().filter(p => p.userId !== userId));
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
seedIfEmpty();
render();
