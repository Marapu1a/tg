const { Scenes, Markup } = require("telegraf");
const { add } = require("../raffles");
const { v4: uuidv4 } = require("uuid");

// Сцена пошагового создания розыгрыша
const createRaffleScene = new Scenes.WizardScene(
    "createRaffleScene",

    // Шаг 1: канал
    (ctx) => {
        ctx.reply("📢 Укажи @юзернейм канала, где будет розыгрыш:");
        ctx.wizard.state.data = {};
        return ctx.wizard.next();
    },

    // Шаг 2: доп. каналы
    (ctx) => {
        ctx.wizard.state.data.channel = ctx.message.text;
        ctx.reply("🔗 Укажи @юзернеймы доп. каналов через запятую (или «-», если нет):");
        return ctx.wizard.next();
    },

    // Шаг 3: название
    (ctx) => {
        const text = ctx.message.text;
        ctx.wizard.state.data.additionalChannels = text === "-" ? [] : text.split(",").map(s => s.trim());
        ctx.reply("📝 Введи название розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 4: описание
    (ctx) => {
        ctx.wizard.state.data.title = ctx.message.text;
        ctx.reply("✏️ Введи описание розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 5: время до окончания (в минутах)
    (ctx) => {
        ctx.wizard.state.data.description = ctx.message.text;
        ctx.reply("⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
        return ctx.wizard.next();
    },

    // Шаг 6: количество победителей
    (ctx) => {
        const input = ctx.message.text.toLowerCase();
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

    // Шаг 7: подтверждение
    (ctx) => {
        ctx.wizard.state.data.winnerCount = parseInt(ctx.message.text);

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

            // 💥 Проверка на уже активный розыгрыш в этом канале
            const active = getAll().find(r => !r.isFinished && r.channelName === channel);
            if (active) {
                await ctx.reply("❌ В этом канале уже идёт розыгрыш. Заверши его, прежде чем запускать новый.");
                return ctx.scene.leave();
            }

            const raffleId = uuidv4(); // 👈 Сначала создаём ID

            try {
                const message = await ctx.telegram.sendMessage(
                    channel,
                    `🎁 *${title}*\n\n${description}\n\n🕒 До: *${new Date(endTime).toLocaleString()}*\n👥 Победителей: *${winnerCount}*`,
                    {
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: [[
                                { text: "🎉 Участвовать", callback_data: `join_${raffleId}` },
                                { text: "📋 Статус", callback_data: `status_${raffleId}` }
                            ]]
                        }
                    }
                );

                add({
                    id: raffleId,
                    channelId: message.chat.id,
                    channelName: channel,
                    additionalChannels,
                    title,
                    description,
                    messageId: message.message_id,
                    endTime,
                    participants: [],
                    winners: [],
                    winnerCount,
                    isFinished: false,
                });

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
