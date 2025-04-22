const fs = require("fs");
const path = "raffle-bot/storage/analytics.json";

// Загружаем статистику
function loadAnalytics() {
    if (!fs.existsSync(path)) return [];
    const raw = fs.readFileSync(path, "utf-8");
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error("❌ Ошибка парсинга analytics.json:", e);
        return [];
    }
}

// Сохраняем статистику
function saveAnalytics(data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// Добавить нового пользователя
function addUser(userId) {
    const data = loadAnalytics();
    if (data.find((u) => u.userId === userId)) return;
    data.push({
        userId,
        joinedAt: Date.now(),
        ranDemo: false
    });
    saveAnalytics(data);
}

// Отметить, что пользователь запускал демо
function markDemo(userId) {
    const data = loadAnalytics();
    const user = data.find((u) => u.userId === userId);
    if (user && !user.ranDemo) {
        user.ranDemo = true;
        saveAnalytics(data);
    }
}

// Получить всех
function getAll() {
    return loadAnalytics();
}

module.exports = {
    addUser,
    markDemo,
    getAll
};
