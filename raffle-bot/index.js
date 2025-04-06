require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

// 📦 Подключаем все команды
require("./commands/start")(bot);
require("./commands/raffle")(bot);
require("./commands/join")(bot);
require("./commands/pick")(bot);
require("./commands/participants")(bot);

// 🚀 Запуск бота
bot.launch();

// ☠️ Обработка ошибок
bot.catch((err, ctx) => {
    console.error(`❌ Ошибка для update типа ${ctx.updateType}:`, err);
});
