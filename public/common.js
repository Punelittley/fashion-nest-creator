// ========== SIAODQQ — Общий модуль: Хедер, Док и Авторизация ==========

const path = location.pathname.toLowerCase();
const currentPage = path.endsWith('/') ? 'index.html' : path.split('/').pop();

// ========== 1. УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ (AUTH STATE) ==========

function getToken() { 
    const token = localStorage.getItem('siaodqq_token');
    return (token && token !== "undefined" && token !== "null") ? token : null; 
}

function getUser() { 
    const u = localStorage.getItem('siaodqq_user'); 
    try {
        return u ? JSON.parse(u) : null; 
    } catch(e) {
        console.error("Ошибка парсинга данных пользователя:", e);
        return null;
    }
}

function setAuth(token, user) { 
    localStorage.setItem('siaodqq_token', token); 
    localStorage.setItem('siaodqq_user', JSON.stringify(user)); 
}

function clearAuth() { 
    localStorage.removeItem('siaodqq_token'); 
    localStorage.removeItem('siaodqq_user'); 
}

function isLoggedIn() { 
    return getToken() !== null; 
}

function logout() { 
    clearAuth(); 
    location.href = 'auth.html'; 
}

function requireAuth() {
    if (!isLoggedIn()) { 
        location.href = 'auth.html'; 
        return false; 
    }
    return true;
}

// ========== THEME ==========
function getTheme() {
    return localStorage.getItem('siaodqq_theme') || 'dark';
}
function setTheme(theme) {
    localStorage.setItem('siaodqq_theme', theme);
    applyTheme(theme);
}
function applyTheme(theme) {
    if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

// ========== 2. ГЕНЕРАЦИЯ ХЕДЕРА (HEADER) ==========

function populateHeader() {
    const navLinks = document.getElementById('nav-links');
    const navActions = document.getElementById('nav-actions');
    
    if (!navLinks || !navActions) return;

    const links = [
        { href: 'index.html', label: 'Лента' },
        { href: 'users.html', label: 'Люди' },
        { href: 'friends.html', label: 'Друзья' },
        { href: 'message.html', label: 'Чаты' },
        { href: 'music.html', label: 'Музыка' },
    ];

    navLinks.innerHTML = '';
    links.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = `nav-pill${currentPage === link.href ? ' active' : ''}`;
        a.textContent = link.label;
        navLinks.appendChild(a);
    });

    const user = getUser();
    const avatarSeed = user ? (user.username || user.name) : 'Siaodqq';
    const avatarUrl = user && user.avatar ? user.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

    if (isLoggedIn()) {
        navActions.innerHTML = `
            <button class="action-icon" onclick="location.href='message.html'" title="Сообщения">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
            </button>
            <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 p-[1.5px] cursor-pointer hover:scale-110 transition-transform" 
                 onclick="location.href='profile.html'">
                <div class="w-full h-full rounded-full bg-black overflow-hidden">
                    <img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">
                </div>
            </div>
            <button onclick="logout()" class="action-icon" title="Выйти" style="color:rgba(255,255,255,0.3);">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
            </button>
        `;
    } else {
        navActions.innerHTML = `
            <button onclick="location.href='auth.html'" class="nav-pill" 
                    style="background:#fff; color:#000; border:none; cursor:pointer; font-weight:900;">
                Войти
            </button>
        `;
    }
}

// ========== 3. ГЕНЕРАЦИЯ БОКОВОГО ДОКА (DOCK) ==========

function renderDock() {
    if (currentPage === 'auth.html') return;

    const dock = document.createElement('div');
    dock.className = 'nav-dock';

    const items = [
        { href: 'index.html', label: 'Лента', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>' },
        { href: 'message.html', label: 'Чаты', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>' },
        { href: 'users.html', label: 'Люди', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>' },
        { href: 'friends.html', label: 'Друзья', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>' },
        { href: 'music.html', label: 'Музыка', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>' },
        { href: 'profile.html', label: 'Профиль', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>' },
        { href: 'edit_info.html', label: 'Настройки', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>' },
    ];

    items.forEach(item => {
        const isActive = currentPage === item.href;
        const div = document.createElement('div');
        div.className = `dock-item${isActive ? ' active' : ''}`;
        div.setAttribute('data-label', item.label);
        div.onclick = () => { location.href = item.href; };
        div.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">${item.icon}</svg>`;
        dock.appendChild(div);
    });

    document.body.prepend(dock);
}

// ========== 4. ПРОВЕРКА ТОКЕНА (API ME) ==========

async function checkAuth() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch('/api/me', { 
            headers: { 'Authorization': 'Bearer ' + token } 
        });
        
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('siaodqq_user', JSON.stringify(data.user));
            populateHeader();
        } else {
            clearAuth();
            if (currentPage !== 'auth.html' && currentPage !== 'index.html') {
                location.href = 'auth.html';
            }
        }
    } catch(e) {
        console.warn("Сервер API недоступен, работаем в оффлайн-режиме");
    }
}

// ========== 5. ИНИЦИАЛИЗАЦИЯ ==========

function initCommon() {
    applyTheme(getTheme());
    populateHeader();
    renderDock();
    checkAuth();
}

document.addEventListener('DOMContentLoaded', initCommon);