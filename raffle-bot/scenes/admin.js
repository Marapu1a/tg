const { Scenes, Markup } = require("telegraf");
const { add, getAll } = require("../raffles");
const { v4: uuidv4 } = require("uuid");
const { createRaffle } = require("../utils/raffleSchema");
const { getUser, addBalance, deductBalance, hasEnoughBalance } = require("../utils/users");

const createRaffleScene = new Scenes.WizardScene(
    "createRaffleScene",

    // Шаг 1: спрашиваем канал
    (ctx) => {
        ctx.reply("📢 Укажи @юзернейм канала, где будет розыгрыш:");
        ctx.wizard.state.data = {};
        return ctx.wizard.next();
    },

    // Шаг 2: валидация канала + вопрос про доп. каналы
    async (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const channel = ctx.message.text.trim();

        if (!/^@[\w\d_]{5,}$/.test(channel)) {
            ctx.reply("❌ Неверный формат. Пример: @my_channel");
            return;
        }

        try {
            const chatMember = await ctx.telegram.getChatMember(channel, ctx.from.id);
            if (!["creator", "administrator"].includes(chatMember.status)) {
                await ctx.reply("⛔️ Ты не админ в этом канале. Укажи канал, где ты админ.");
                return;
            }
        } catch (err) {
            console.warn("❌ Ошибка проверки админа:", err.message);
            await ctx.reply("❌ Не удалось проверить доступ. Убедись, что бот и ты — админы в этом канале.");
            return;
        }

        ctx.wizard.state.data.channel = channel;
        ctx.reply("🔗 Укажи @юзернеймы доп. каналов через запятую (или «-», если нет):");
        return ctx.wizard.next();
    },

    // Шаг 3: валидация доп. каналов + вопрос про название
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

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
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }
        const title = ctx.message.text.trim();

        if (title.length < 3) {
            ctx.reply("❌ Название должно быть от 3 символов");
            return;
        }
        ctx.wizard.state.data.title = title;
        ctx.reply("✏️ Введи описание розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 5: валидация описания + вопрос про медиа
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const desc = ctx.message.text.trim();

        if (desc.length < 5) {
            ctx.reply("❌ Описание должно быть от 5 символов");
            return;
        }
        ctx.wizard.state.data.description = desc;
        ctx.reply("📎 Вставь код гифки (как получить — см. инструкцию \"📘 Как работает бот\").\nЕсли не хочешь гифку — введи «-».", {
            parse_mode: "Markdown"
        });
        return ctx.wizard.next();
    },

    // Шаг 6: обработка file_id + переход к вопросу про время
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const input = ctx.message.text.trim();

        if (input === "-") {
            ctx.wizard.state.data.media = null;
            ctx.reply("⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
            return ctx.wizard.next();
        }

        if (!/^[-_\w]{20,}$/.test(input)) {
            ctx.reply("❌ Похоже, это не `код гифки`. Попробуй ещё раз или введи `-`.");
            return;
        }

        ctx.wizard.state.data.media = input;
        ctx.reply("✅ Принято.\n⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
        return ctx.wizard.next();
    },

    // Шаг 7: валидация времени + вопрос про победителей
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const input = ctx.message.text.trim();

        if (!/^((\d+[дчм])\s?)+$/.test(input)) {
            ctx.reply("❌ Неверный формат. Пример: 1д 2ч 30м");
            return;
        }

        let days = 0, hours = 0, minutes = 0;
        const parts = input.split(/\s+/);
        for (const part of parts) {
            if (/^\d+д$/.test(part)) {
                days = parseInt(part);
            } else if (/^\d+ч$/.test(part)) {
                hours = parseInt(part);
            } else if (/^\d+м$/.test(part)) {
                minutes = parseInt(part);
            } else {
                ctx.reply("❌ Неверный формат. Пример: 1д 2ч 30м");
                return;
            }
        }

        const totalMs = ((days * 24 + hours) * 60 + minutes) * 60 * 1000;
        if (totalMs <= 0) {
            ctx.reply("❌ Время должно быть больше нуля.");
            return;
        }

        ctx.wizard.state.data.endTime = Date.now() + totalMs;
        ctx.reply("🏆 Сколько победителей?");
        return ctx.wizard.next();
    },

    // Шаг 8: валидация победителей + подтверждение
    (ctx) => {
        if (!ctx.message || !ctx.message.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

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
                Markup.button.callback("❌ Отменить", "cancel_raffle")
            ])
        );
        return ctx.wizard.next();
    },

    // Шаг 9: подтверждение или отмена
    async (ctx) => {
        const action = ctx.callbackQuery?.data;
        if (!action) return; // или ctx.reply("❌ Что-то пошло не так.");

        if (action === "cancel_raffle") {
            await ctx.reply("❌ Создание розыгрыша отменено.");
            return ctx.scene.leave();
        }

        if (action === "confirm_raffle") {
            const d = ctx.wizard.state.data;
            const { channel, additionalChannels, title, description, endTime, winnerCount } = d;

            const active = getAll().find(r => !r.isFinished && r.channelName === channel);
            if (active) {
                await ctx.reply("❌ В этом канале уже идёт розыгрыш. Заверши его, прежде чем запускать новый.");
                return ctx.scene.leave();
            }

            // 💸 Проверка баланса
            const RAFFLE_COST = 500;
            if (!hasEnoughBalance(ctx.from.id, RAFFLE_COST)) {
                await ctx.reply("⛔️ Недостаточно средств. Пополни баланс.");
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

                let message;
                const mediaId = d.media;

                const keyboard = {
                    inline_keyboard: [
                        [
                            { text: "🎉 Участвовать", callback_data: `join_${raffleId}` },
                            { text: "📋 Статус", callback_data: `status_${raffleId}` }
                        ]
                    ]
                };

                if (mediaId) {
                    try {
                        message = await ctx.telegram.sendAnimation(
                            channel,
                            mediaId,
                            { caption, parse_mode: "Markdown", reply_markup: keyboard }
                        );
                    } catch (err) {
                        console.error("❌ sendAnimation failed:", err);
                        await ctx.reply("❌ Не удалось опубликовать розыгрыш с гифкой. Проверь права бота.");
                        return ctx.scene.leave();
                    }
                } else {
                    try {
                        message = await ctx.telegram.sendMessage(
                            channel,
                            caption,
                            { parse_mode: "Markdown", reply_markup: keyboard }
                        );
                    } catch (err) {
                        console.error("❌ sendMessage failed:", err);
                        await ctx.reply("❌ Не удалось опубликовать розыгрыш текстом. Проверь права бота.");
                        return ctx.scene.leave();
                    }
                }


                // 💸 Списание после успешной публикации
                deductBalance(ctx.from.id, RAFFLE_COST);
                const user = getUser(ctx.from.id);

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

                await ctx.reply(`✅ Розыгрыш создан и опубликован!\n💸 Списано 500₽. Баланс: ${user.balance}₽`);
            } catch (err) {
                console.error("❌ Ошибка при публикации:", err);
                await ctx.reply("❌ Не удалось отправить пост. Убедись, что бот — админ в канале.");
            }
        }
        return ctx.scene.leave();
    }
);

module.exports = {
    createRaffleScene
};
