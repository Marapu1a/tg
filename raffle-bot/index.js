require("dotenv").config();
const fs = require("fs");

const { Telegraf, Scenes, session } = require("telegraf");

const { createRaffleScene } = require("./handlers/admin");
const { demoScene } = require("./handlers/demo");

const { loadRaffles } = require("./raffles");
const { getById, update, getAll } = require("./raffles");

const { checkSubscriptions } = require("./utils/helpers");
const { finishRaffle } = require("./utils/helpers");
const { getUser, addBalance, deductBalance, hasEnoughBalance } = require("./utils/users");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Подгружаем розыгрыши из файла
loadRaffles();

// Сцены
const stage = new Scenes.Stage([createRaffleScene, demoScene]);

bot.use(session());
bot.use(stage.middleware());

// Кнопка для админа: Создать розыгрыш
bot.command("start", (ctx) => {
    // Сначала — инфо-кнопка
    ctx.reply("👋 Добро пожаловать!\n\nЧто дальше?", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📘 Как работает бот", callback_data: "how_it_works" },
                { text: "🎮 Попробовать демо", callback_data: "start_demo" }],

            ]
        }
    });

    // Потом — обычная клавиатура
    ctx.reply("Выбери действие:", {
        reply_markup: {
            keyboard: [["🎯 Создать розыгрыш"], ["📊 Статистика"], ["💸 Пополнить баланс"], ["💰 Баланс"]],
            resize_keyboard: true,
            one_time_keyboard: false,
        }
    });
});

bot.action("start_demo", (ctx) => {
    ctx.answerCbQuery();
    ctx.scene.enter("demoRaffleScene");
});


bot.action("how_it_works", async (ctx) => {
    await ctx.answerCbQuery(); // закрыть крутилку
    await ctx.reply(
        `📘 *Как работает бот:*
  
  • Стоимость розыгрыша — *500₽*
  • Бот должен быть *админом в канале*
  • Ты должен быть *админом в этом канале*
  • Участники регистрируются по кнопке
  • Победители выбираются автоматически
  • Отчёт приходит в личку
  
  Попробуй демо-режим — бесплатно!`,
        { parse_mode: "Markdown" }
    );
});

bot.hears("🎯 Создать розыгрыш", (ctx) => {
    const RAFFLE_COST = 500;
    if (!hasEnoughBalance(ctx.from.id, RAFFLE_COST)) {
        ctx.reply(
            `⛔️ У тебя недостаточно средств для создания розыгрыша.\n` +
            `💸 Стоимость — ${RAFFLE_COST}₽.\n` +
            `Пополнить можно через кнопку “💸 Пополнить баланс”.`
        );
        return;
    }

    ctx.scene.enter("createRaffleScene");
});

bot.hears("📊 Статистика", async (ctx) => {
    const userId = ctx.from.id;

    const raffles = JSON.parse(fs.readFileSync("storage/raffles.json", "utf-8"));

    const userRaffles = raffles
        .filter(r => r.ownerId === userId && r.isFinished)
        .slice(-5)
        .reverse();

    if (userRaffles.length === 0) {
        return ctx.reply("У тебя пока нет завершённых розыгрышей.");
    }

    const message = userRaffles.map(r => {
        const date = new Date(r.endTime).toLocaleDateString("ru-RU");
        const postLink = `https://t.me/${r.channelName.replace("@", "")}/${r.messageId}`;
        const winners = r.winners.length > 0
            ? r.winners.map(id => `• [Победитель](tg://user?id=${id})`).join("\n")
            : "— Победителей нет";

        return (
            `🎉 *${r.title}*\n` +
            `📅 ${date}\n` +
            `🔗 [Смотреть пост](${postLink})\n\n` +
            `👥 Участников: ${r.participants.length}\n` +
            `🏆 Победители:\n${winners}\n\n` +
            `──────────────`
        );
    }).join("\n\n");

    await ctx.telegram.sendMessage(ctx.chat.id, message, {
        parse_mode: "Markdown",
        disable_web_page_preview: true,
    });
});

bot.hears("💸 Пополнить баланс", async (ctx) => {
    addBalance(ctx.from.id, 500);
    const user = getUser(ctx.from.id);
    ctx.reply(`✅ Баланс пополнен. Сейчас у тебя: ${user.balance}₽`);
});

bot.hears("💰 Баланс", (ctx) => {
    const user = getUser(ctx.from.id);
    ctx.reply(`💰 Текущий баланс: ${user.balance}₽`);
});

bot.on("animation", async (ctx) => {
    const fileId = ctx.message.animation.file_id;
    await ctx.reply(`🎬 file_id гифки:\n${fileId}`);
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

        if (raffle.isFinished) {
            return ctx.answerCbQuery("❌ Розыгрыш уже завершён", { show_alert: true });
        }

        const userId = ctx.from.id;

        if (raffle.participants.includes(userId)) {
            return ctx.answerCbQuery("🤌 Вы уже участвуете!");
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

        if (raffle.isFinished) {
            return ctx.answerCbQuery("✅ Розыгрыш завершён", { show_alert: true });
        }

        const isIn = raffle.participants.includes(ctx.from.id);
        const status = isIn ? "👍 Вы участвуете!" : "❌ Вы ещё не участвуете";

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