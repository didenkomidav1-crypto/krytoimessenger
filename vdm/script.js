const firebaseConfig = {
    apiKey: "AIzaSyD6Z3T9t0RH57j29cYh2m87BjKDTnKypKk",
    authDomain: "vdmmessenger.firebaseapp.com",
    databaseURL: "https://vdmmessenger-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vdmmessenger",
    storageBucket: "vdmmessenger.firebasestorage.app",
    messagingSenderId: "302907145616",
    appId: "1:302907145616:web:b72a66cbfc79a1c336c715",
    measurementId: "G-3Q9TM23LW1"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Элементы DOM (будут заполнены после загрузки)
let messagesDiv, messageInput, sendBtn, userEmailSpan, authErrorDiv;
let loginForm, registerForm, loginEmail, loginPassword, loginBtn;
let regEmail, regPassword, regDisplayName, registerBtn;
let authSection, chatSection;

// Функция экранирования HTML (защита от XSS)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Переключение между вкладками "Вход" и "Регистрация"
function initTabs() {
    const loginTab = document.getElementById('loginTabBtn');
    const registerTab = document.getElementById('registerTabBtn');
    loginTab.onclick = () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        authErrorDiv.innerText = '';
    };
    registerTab.onclick = () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        authErrorDiv.innerText = '';
    };
}

// Показать ошибку авторизации
function showAuthError(message) {
    authErrorDiv.innerText = message;
}

// Очистить поля ввода авторизации
function clearAuthInputs() {
    if (loginEmail) loginEmail.value = '';
    if (loginPassword) loginPassword.value = '';
    if (regEmail) regEmail.value = '';
    if (regPassword) regPassword.value = '';
    if (regDisplayName) regDisplayName.value = '';
}

// Логика после успешного входа
function onLoginSuccess(user) {
    authSection.classList.add('hidden');
    chatSection.classList.remove('hidden');
    userEmailSpan.innerText = user.email;
    clearAuthInputs();
    // Запускаем слушатель сообщений
    startChatListener();
}

// Выход из аккаунта
function logout() {
    auth.signOut().then(() => {
        // Останавливаем слушатель базы данных (важно)
        if (currentMessagesRef) {
            db.ref("chat_messages").off("child_added", currentMessagesRef);
            currentMessagesRef = null;
        }
        authSection.classList.remove('hidden');
        chatSection.classList.add('hidden');
        // Очищаем окно сообщений
        if (messagesDiv) messagesDiv.innerHTML = '';
        showAuthError('');
    }).catch((error) => {
        showAuthError('Ошибка выхода: ' + error.message);
    });
}

// Переменная для хранения текущего обработчика сообщений (чтобы отписаться)
let currentMessagesRef = null;

// Запуск прослушивания новых сообщений (только после входа)
function startChatListener() {
    if (currentMessagesRef) {
        // Если уже слушаем, отписываемся (на случай повторного входа)
        db.ref("chat_messages").off("child_added", currentMessagesRef);
    }
    currentMessagesRef = (snapshot) => {
        const data = snapshot.val();
        const msgElement = document.createElement('div');
        msgElement.classList.add('msg-item');
        const displayName = data.displayName || data.username || "Аноним";
        msgElement.innerHTML = `<b>${escapeHtml(displayName)}:</b> ${escapeHtml(data.message)}`;
        messagesDiv.appendChild(msgElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };
    db.ref("chat_messages").on("child_added", currentMessagesRef);
}

// Отправка сообщения (требует текущего пользователя)
function sendMessage() {
    const user = auth.currentUser;
    if (!user) {
        alert('Вы не авторизованы!');
        return;
    }
    const text = messageInput.value.trim();
    if (text === '') return;

    // Имя для отображения: сначала displayName, если нет – email
    const displayName = user.displayName || user.email.split('@')[0];
    db.ref("chat_messages").push({
        username: displayName,       // для совместимости со старыми сообщениями
        displayName: displayName,   // новое поле
        message: text,
        userId: user.uid,
        time: Date.now()
    }).then(() => {
        messageInput.value = '';
        messageInput.focus();
    }).catch(error => {
        console.error('Ошибка отправки:', error);
        alert('Не удалось отправить сообщение. Проверьте правила БД.');
    });
}

// Регистрация нового пользователя
function register() {
    const email = regEmail.value.trim();
    const password = regPassword.value;
    const displayName = regDisplayName.value.trim() || email.split('@')[0];

    if (!email || !password) {
        showAuthError('Введите email и пароль');
        return;
    }
    if (password.length < 6) {
        showAuthError('Пароль должен быть не менее 6 символов');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Устанавливаем displayName (имя в профиле)
            return userCredential.user.updateProfile({ displayName: displayName });
        })
        .then(() => {
            // Регистрация успешна, пользователь уже вошёл автоматически
            onLoginSuccess(auth.currentUser);
        })
        .catch((error) => {
            showAuthError('Ошибка регистрации: ' + error.message);
        });
}

// Вход существующего пользователя
function login() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    if (!email || !password) {
        showAuthError('Введите email и пароль');
        return;
    }
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            onLoginSuccess(userCredential.user);
        })
        .catch((error) => {
            showAuthError('Ошибка входа: ' + error.message);
        });
}

// Наблюдатель за состоянием аутентификации (Firebase сам умеет восстанавливать сессию)
auth.onAuthStateChanged((user) => {
    // Эта функция вызывается при загрузке страницы (если пользователь уже был залогинен)
    // и при каждом изменении статуса входа/выхода
    if (user) {
        // Пользователь уже вошёл (например, сессия сохранена)
        authSection.classList.add('hidden');
        chatSection.classList.remove('hidden');
        userEmailSpan.innerText = user.email;
        startChatListener();
    } else {
        // Не авторизован: показываем блок входа
        if (authSection) authSection.classList.remove('hidden');
        if (chatSection) chatSection.classList.add('hidden');
        if (messagesDiv) messagesDiv.innerHTML = '';
        if (currentMessagesRef) {
            db.ref("chat_messages").off("child_added", currentMessagesRef);
            currentMessagesRef = null;
        }
    }
});

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получаем ссылки на все элементы
    messagesDiv = document.getElementById('messages');
    messageInput = document.getElementById('messageInput');
    sendBtn = document.getElementById('sendBtn');
    userEmailSpan = document.getElementById('userEmail');
    authErrorDiv = document.getElementById('authError');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    loginEmail = document.getElementById('loginEmail');
    loginPassword = document.getElementById('loginPassword');
    loginBtn = document.getElementById('loginBtn');
    regEmail = document.getElementById('regEmail');
    regPassword = document.getElementById('regPassword');
    regDisplayName = document.getElementById('regDisplayName');
    registerBtn = document.getElementById('registerBtn');
    authSection = document.getElementById('authSection');
    chatSection = document.getElementById('chatSection');

    // Проверка наличия элементов
    if (!messagesDiv || !messageInput || !sendBtn || !userEmailSpan || !authErrorDiv ||
        !loginForm || !registerForm || !loginEmail || !loginPassword || !loginBtn ||
        !regEmail || !regPassword || !registerBtn || !authSection || !chatSection) {
        console.error('Не найдены некоторые элементы! Проверьте ID в HTML.');
        return;
    }

    // Назначение обработчиков
    sendBtn.onclick = sendMessage;
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    loginBtn.onclick = login;
    registerBtn.onclick = register;
    document.getElementById('logoutBtn').onclick = logout;

    initTabs();
});