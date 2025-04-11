const fs = require("fs");
const path = require("path");

const statsPath = path.join(__dirname, "channelStats.json");

function loadStats() {
    if (!fs.existsSync(statsPath)) {
        fs.writeFileSync(statsPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(statsPath));
}

function saveStats(data) {
    fs.writeFileSync(statsPath, JSON.stringify(data, null, 2));
}

function addChannelStat(channel, stat) {
    const data = loadStats();
    if (!data[channel]) data[channel] = [];
    data[channel].push(stat);
    saveStats(data);
}

function updateChannelStat(channel, raffleId, updates) {
    const data = loadStats();
    const list = data[channel];
    if (!list) return;
    const index = list.findIndex(r => r.raffleId === raffleId);
    if (index !== -1) {
        data[channel][index] = { ...data[channel][index], ...updates };
        saveStats(data);
    }
}

module.exports = {
    addChannelStat,
    updateChannelStat,
};
