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

// Инициализируем Firebase (объект firebase доступен после подключения SDK)
firebase.initializeApp(firebaseConfig);

// Получаем ссылку на базу данных
const db = firebase.database();

// Ждём полной загрузки DOM, чтобы элементы точно существовали
document.addEventListener('DOMContentLoaded', () => {
    const messagesDiv = document.getElementById('messages');
    const nameInput = document.getElementById('nameInput');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Проверка на случай, если какой-то элемент не найден
    if (!messagesDiv || !nameInput || !messageInput || !sendBtn) {
        console.error('Ошибка: не найдены элементы чата!');
        return;
    }

    // Функция отправки сообщения
    sendBtn.onclick = () => {
        const name = nameInput.value.trim() || "Аноним";
        const text = messageInput.value.trim();

        if (text) {
            db.ref("chat_messages").push({
                username: name,
                message: text,
                time: Date.now()
            });
            messageInput.value = "";
            messageInput.focus(); // удобно
        }
    };

    // Отправка по клавише Enter
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });

    // Слушаем новые сообщения в реальном времени
    db.ref("chat_messages").on("child_added", (snapshot) => {
        const data = snapshot.val();
        const msgElement = document.createElement('div');
        msgElement.classList.add('msg-item');
        msgElement.innerHTML = `<b>${escapeHtml(data.username)}:</b> ${escapeHtml(data.message)}`;
        messagesDiv.appendChild(msgElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
});

// Простая защита от XSS (экранирование HTML)
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}