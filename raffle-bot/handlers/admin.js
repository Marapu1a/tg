const { Scenes, Markup } = require("telegraf");
const { add, getAll } = require("../raffles");
const { v4: uuidv4 } = require("uuid");
const { createRaffle } = require("../utils/raffleSchema");

// 1. Список заранее сохранённых file_id анимаций
const gifs = [
    'CgACAgQAAxkBAAIOmWf-IAozHUuGLzwXvizpBydfawntAAK1BAACKd5lUx6x-1tNgNGvNgQ',
];

// 2. Рандомный выбор
const randomGifId = gifs[Math.floor(Math.random() * gifs.length)];

const createRaffleScene = new Scenes.WizardScene(
    "createRaffleScene",

    // Шаг 1: спрашиваем канал
    (ctx) => {
        ctx.reply("📢 Укажи @юзернейм канала, где будет розыгрыш:");
        ctx.wizard.state.data = {};
        return ctx.wizard.next();
    },

    // Шаг 2: валидация канала + вопрос про доп. каналы
    (ctx) => {
        const channel = ctx.message.text.trim();
        if (!/^@[\w\d_]{5,}$/.test(channel)) {
            ctx.reply("❌ Неверный формат. Пример: @my_channel");
            return;
        }
        ctx.wizard.state.data.channel = channel;
        ctx.reply("🔗 Укажи @юзернеймы доп. каналов через запятую (или «-», если нет):");
        return ctx.wizard.next();
    },

    // Шаг 3: валидация доп. каналов + вопрос про название
    (ctx) => {
        const raw = ctx.message.text.trim();
        if (raw !== "-" && !/^(@[\w\d_]+)(\s*,\s*@[\w\d_]+)*$/.test(raw)) {
            ctx.reply("❌ Неверный формат. Пример: @one, @two, @three или - если нет доп. каналов");
            return;
        }
        ctx.wizard.state.data.additionalChannels = raw === "-" ? [] : raw.split(",").map(s => s.trim());
        ctx.reply("📝 Введи название розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 4: валидация названия + вопрос про описание
    (ctx) => {
        const title = ctx.message.text.trim();
        if (title.length < 3) {
            ctx.reply("❌ Название должно быть от 3 символов");
            return;
        }
        ctx.wizard.state.data.title = title;
        ctx.reply("✏️ Введи описание розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 5: валидация описания + вопрос про время
    (ctx) => {
        const desc = ctx.message.text.trim();
        if (desc.length < 5) {
            ctx.reply("❌ Описание должно быть от 5 символов");
            return;
        }
        ctx.wizard.state.data.description = desc;
        ctx.reply("⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
        return ctx.wizard.next();
    },

    // Шаг 6: валидация времени + вопрос про победителей
    (ctx) => {
        const input = ctx.message.text.toLowerCase().trim();
        const timeRegex = /(?:(\d+)\s*д)?\s*(?:(\d+)\s*ч)?\s*(?:(\d+)\s*м)?/;
        const match = input.match(timeRegex);
        if (!match) {
            ctx.reply("❌ Неверный формат. Пример: 1д 2ч 30м");
            return;
        }

        const days = parseInt(match[1] || 0);
        const hours = parseInt(match[2] || 0);
        const minutes = parseInt(match[3] || 0);
        const totalMs = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;

        if (totalMs <= 0) {
            ctx.reply("❌ Время должно быть больше нуля. Пример: 1д 2ч 30м");
            return;
        }

        ctx.wizard.state.data.endTime = Date.now() + totalMs;
        ctx.reply("🏆 Сколько победителей?");
        return ctx.wizard.next();
    },

    // Шаг 7: валидация победителей + подтверждение
    (ctx) => {
        const num = parseInt(ctx.message.text.trim());
        if (isNaN(num) || num <= 0 || num > 100) {
            ctx.reply("❌ Укажи корректное число победителей (от 1 до 100)");
            return;
        }
        ctx.wizard.state.data.winnerCount = num;

        const data = ctx.wizard.state.data;
        ctx.reply(
            `🔒 Проверь:\n\n` +
            `Канал: ${data.channel}\n` +
            `Доп. каналы: ${data.additionalChannels.join(", ") || "Нет"}\n` +
            `Название: ${data.title}\n` +
            `Описание: ${data.description}\n` +
            `Окончание: ${new Date(data.endTime).toLocaleString()}\n` +
            `Победителей: ${data.winnerCount}`,
            Markup.inlineKeyboard([
                Markup.button.callback("✅ Всё верно", "confirm_raffle"),
                Markup.button.callback("🔄 Изменить", "cancel_raffle")
            ])
        );
        return ctx.wizard.next();
    },

    // Шаг 8: подтверждение
    async (ctx) => {
        if (ctx.callbackQuery?.data === "confirm_raffle") {
            const d = ctx.wizard.state.data;
            const { channel, additionalChannels, title, description, endTime, winnerCount } = d;

            const active = getAll().find(r => !r.isFinished && r.channelName === channel);
            if (active) {
                await ctx.reply("❌ В этом канале уже идёт розыгрыш. Заверши его, прежде чем запускать новый.");
                return ctx.scene.leave();
            }

            const raffleId = uuidv4();
            let memberCountStart = 0;

            try {
                memberCountStart = await ctx.telegram.getChatMembersCount(channel);
                console.log("👥 Подписчиков в начале:", memberCountStart);
            } catch (err) {
                console.warn("⚠️ Не удалось получить подписчиков:", err.message);
            }

            try {
                const caption =
                    `🎉 *${title}*\n\n` +
                    `${description}\n\n` +
                    `⏳ До: *${new Date(endTime).toLocaleString()}*\n` +
                    `🏆 Победителей: *${winnerCount}*`;

                const message = await ctx.telegram.sendAnimation(channel, randomGifId, {
                    caption,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🎉 Участвовать", callback_data: `join_${raffleId}` },
                                { text: "📋 Статус", callback_data: `status_${raffleId}` }
                            ]
                        ]
                    }
                });

                console.log(ctx.from.id);

                add(createRaffle({
                    id: raffleId,
                    channelId: message.chat.id,
                    channelName: channel,
                    additionalChannels,
                    title,
                    description,
                    messageId: message.message_id,
                    startAt: Date.now(),
                    endTime,
                    participants: [],
                    winners: [],
                    winnerCount,
                    isFinished: false,
                    memberCountStart,
                    ownerId: ctx.from.id,
                }));

                await ctx.reply("✅ Розыгрыш создан и опубликован!");
            } catch (err) {
                console.error("❌ Ошибка при публикации:", err);
                await ctx.reply("❌ Не удалось отправить пост. Убедись, что бот — админ в канале.");
            }
        } else {
            await ctx.reply("❌ Отмена. Начни заново, если хочешь.");
        }
        return ctx.scene.leave();
    }
);

module.exports = {
    createRaffleScene
};
