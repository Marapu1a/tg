require("dotenv").config();
const { Telegraf, Scenes, session } = require("telegraf");
const { createRaffleScene } = require("./handlers/admin");
const { loadRaffles } = require("./raffles");
const { getById, update, getAll } = require("./raffles");
const { checkSubscriptions } = require("./utils/helpers");
const { finishRaffle } = require("./utils/helpers");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Подгружаем розыгрыши из файла
loadRaffles();

// Сцены
const stage = new Scenes.Stage([createRaffleScene]);

bot.use(session());
bot.use(stage.middleware());

// Кнопка для админа: Создать розыгрыш
bot.command("start", (ctx) => {
    if (ctx.from.id.toString() === process.env.ADMIN_ID) {
        ctx.reply("👋 Привет, Админ!", {
            reply_markup: {
                keyboard: [["🎯 Создать розыгрыш"]],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        });
    } else {
        ctx.reply("🤖 Привет! А ты чего здесь?");
    }
});

bot.hears("🎯 Создать розыгрыш", (ctx) => {
    if (ctx.from.id.toString() === process.env.ADMIN_ID) {
        ctx.scene.enter("createRaffleScene");
    } else {
        ctx.reply("⛔️ Доступ запрещён.");
    }
});

bot.on("callback_query", async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Участие
    if (data.startsWith("join_")) {
        const raffleId = data.split("_")[1];
        const raffle = getById(raffleId);

        if (!raffle) {
            return ctx.answerCbQuery("❌ Розыгрыш не найден", { show_alert: true });
        }

        const userId = ctx.from.id;

        if (raffle.participants.includes(userId)) {
            return ctx.answerCbQuery("✅ Вы уже участвуете!");
        }

        const ok = await checkSubscriptions(ctx.telegram, userId, [
            raffle.channelName,
            ...raffle.additionalChannels,
        ]);

        if (!ok) {
            return ctx.answerCbQuery("❌ Подпишитесь на все каналы", { show_alert: true });
        }

        // Добавляем участника
        raffle.participants.push(userId);
        update(raffleId, { participants: raffle.participants });

        return ctx.answerCbQuery("✅ Вы участвуете!");
    }

    // Статус
    if (data.startsWith("status_")) {
        const raffleId = data.split("_")[1];
        const raffle = getById(raffleId);

        if (!raffle) {
            return ctx.answerCbQuery("❌ Розыгрыш не найден", { show_alert: true });
        }

        const isIn = raffle.participants.includes(ctx.from.id);
        const status = isIn ? "✅ Вы участвуете!" : "❌ Вы ещё не участвуете";

        const now = Date.now();
        const remaining = raffle.endTime - now;
        const minutes = Math.floor((remaining / 1000 / 60) % 60);
        const hours = Math.floor((remaining / 1000 / 60 / 60) % 24);
        const days = Math.floor(remaining / 1000 / 60 / 60 / 24);

        const text =
            `${status}\n` +
            `👥 Участников: ${raffle.participants.length}\n` +
            `⏳ До окончания: ${days}д ${hours}ч ${minutes}м`;

        return ctx.answerCbQuery(text, { show_alert: true });
    }
});

setInterval(() => {
    const now = Date.now();
    const raffles = getAll();

    raffles
        .filter(r => !r.isFinished && r.endTime <= now)
        .forEach(r => finishRaffle(bot, r, update));
}, 10 * 1000); // каждые 10 секунд

bot.launch();
console.log("🚀 Бот запущен.");

// Обработка падений
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
