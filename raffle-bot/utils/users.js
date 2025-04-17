const fs = require("fs");
const path = "storage/users.json";

function loadUsers() {
    try {
        return JSON.parse(fs.readFileSync(path, "utf-8"));
    } catch {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(path, JSON.stringify(users, null, 2));
}

function getUser(id) {
    const users = loadUsers();
    let user = users.find(u => u.id === id);
    if (!user) {
        user = { id, balance: 0 };
        users.push(user);
        saveUsers(users);
    }
    return user;
}

function addBalance(id, amount) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (user) {
        user.balance += amount;
        saveUsers(users);
    }
}

function deductBalance(id, amount) {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    if (user && user.balance >= amount) {
        user.balance -= amount;
        saveUsers(users);
    }
}

function hasEnoughBalance(id, amount) {
    const user = getUser(id);
    return user.balance >= amount;
}

module.exports = {
    getUser,
    addBalance,
    deductBalance,
    hasEnoughBalance,
};
