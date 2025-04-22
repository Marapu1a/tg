require("dotenv").config();

const { Telegraf, Scenes, session } = require("telegraf");

const { createRaffleScene } = require("./scenes/admin");
const { demoScene } = require("./scenes/demo");

const { loadRaffles, update, getAll } = require("./raffles");
const { finishRaffle } = require("./utils/helpers");

const bot = new Telegraf(process.env.BOT_TOKEN);

// 1. Загрузка данных
loadRaffles();

// 2. Сцены
const stage = new Scenes.Stage([createRaffleScene, demoScene]);
bot.use(session());
bot.use(stage.middleware());

// 3. Команды и действия
require("./handlers/start")(bot);        // /start + кнопки
require("./handlers/info")(bot);         // 📘 Как работает бот
require("./handlers/demoButton")(bot);   // 🎮 Демо
require("./handlers/create")(bot);       // 🎯 Создать розыгрыш
require("./handlers/stats")(bot);        // 📊 Статистика
require("./handlers/balance")(bot);      // 💰 Баланс
require("./handlers/topup")(bot);        // 💸 Пополнить

// 4. Гифки
bot.on(["animation"], async (ctx) => {
    const fileId = ctx.message.animation?.file_id || ctx.message.sticker?.file_id;
    await ctx.reply(`🆔 file_id:\n${fileId}`);
});

// 5. Callback-кнопки
require("./handlers/callbacks")(bot);

// 6. Завершение розыгрышей
setInterval(() => {
    const now = Date.now();
    const raffles = getAll();

    raffles
        .filter(r => !r.isFinished && r.endTime <= now)
        .forEach(r => finishRaffle(bot, r, update));
}, 10 * 1000); // каждые 10 секунд

// 7. Запуск
bot.launch();
console.log("🚀 Бот запущен.");

// 8. Завершение
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));