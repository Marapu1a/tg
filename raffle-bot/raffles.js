const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "storage", "raffles.json");
let raffles = [];

// Загрузка из файла
function loadRaffles() {
    if (!fs.existsSync(FILE_PATH)) return;

    try {
        const raw = fs.readFileSync(FILE_PATH, "utf8");
        raffles = JSON.parse(raw);
    } catch (err) {
        console.error("❌ Не удалось прочитать или распарсить raffles.json:", err);
        raffles = [];
        saveRaffles();
    }
}

// Сохранение в файл
function saveRaffles() {
    fs.writeFileSync(FILE_PATH, JSON.stringify(raffles, null, 2));
}

// Вернуть все розыгрыши
function getAll() {
    return raffles;
}

// Найти по ID
function getById(id) {
    return raffles.find(r => r.id === id);
}

// Добавить новый розыгрыш
function add(raffle) {
    raffles.push(raffle);
    saveRaffles();
}

// Обновить существующий розыгрыш
function update(id, newData) {
    const index = raffles.findIndex(r => r.id === id);
    if (index !== -1) {
        raffles[index] = { ...raffles[index], ...newData };
        saveRaffles();
    }
}

// Удалить розыгрыш
function remove(id) {
    raffles = raffles.filter(r => r.id !== id);
    saveRaffles();
}

module.exports = {
    loadRaffles,
    saveRaffles,
    getAll,
    getById,
    add,
    update,
    remove,
};
