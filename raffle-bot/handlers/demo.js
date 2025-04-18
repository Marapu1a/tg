const { Scenes, Markup } = require("telegraf");
const { v4: uuidv4 } = require("uuid");

const demoScene = new Scenes.WizardScene(
    "demoRaffleScene",

    // Шаг 1: канал
    async (ctx) => {
        ctx.reply("📣 Введи юзернейм канала для демо в формате @my_channel (только для визуала, пост уйдёт тебе в ЛС):");
        return ctx.wizard.next();
    },

    // Шаг 2: доп. каналы
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const channel = ctx.message.text.trim();
        if (!/^@[\w\d_]{5,}$/.test(channel)) {
            ctx.reply("❌ Неверный формат. Пример: @my_channel");
            return;
        }

        ctx.wizard.state.data = { channel };
        ctx.reply("🔗 Укажи @юзернеймы доп. каналов через запятую (или «-», если нет):");
        return ctx.wizard.next();
    },

    // Шаг 3: название
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const raw = ctx.message.text.trim();
        ctx.wizard.state.data.additionalChannels = raw === "-" ? [] : raw.split(",").map(s => s.trim());
        ctx.reply("🏷 Введи название розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 4: описание
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const title = ctx.message.text.trim();
        if (title.length < 3) {
            ctx.reply("❌ Название должно быть от 3 символов");
            return;
        }

        ctx.wizard.state.data.title = title;
        ctx.reply("📝 Введи описание розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 5: описание + запрос media
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const desc = ctx.message.text.trim();
        if (desc.length < 5) {
            ctx.reply("❌ Описание должно быть от 5 символов");
            return;
        }

        ctx.wizard.state.data.description = desc;
        ctx.reply("📎 Вставь `file_id` гифки, которую хочешь использовать в демо.\nЕсли хочешь без гифки — просто введи «-».");
        return ctx.wizard.next();
    },

    // Шаг 6: валидация media + запрос времени
    async (ctx) => {
        if (!ctx.message?.text) {
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
            ctx.reply("❌ Похоже, это не `file_id`. Попробуй ещё раз или введи `-`.");
            return;
        }

        ctx.wizard.state.data.media = input;
        ctx.reply("✅ Принято.\n⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
        return ctx.wizard.next();
    },

    // Шаг 7: время
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const input = ctx.message.text.toLowerCase().trim();

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
        ctx.reply("🏆 Сколько будет победителей?");
        return ctx.wizard.next();
    },

    // Шаг 8: публикация демо
    async (ctx) => {
        if (!ctx.message?.text) {
            ctx.reply("❌ Доступен только ввод текстом.");
            return;
        }

        const num = parseInt(ctx.message.text.trim());
        if (isNaN(num) || num <= 0 || num > 100) {
            ctx.reply("❌ Укажи корректное число победителей (от 1 до 100)");
            return;
        }

        ctx.wizard.state.data.winnerCount = num;
        const { channel, additionalChannels, title, description, endTime, winnerCount, media } = ctx.wizard.state.data;
        const raffleId = uuidv4();

        const caption =
            `🎉 *${title}*\n\n` +
            `${description}\n\n` +
            `⏳ До: *${new Date(endTime).toLocaleString()}*\n` +
            `🏆 Победителей: *${winnerCount}*\n\n` +
            `⚠️ Это демо-предпросмотр. Участие недоступно.`;

        const keyboard = {
            inline_keyboard: [[
                { text: "🎉 Участвовать", callback_data: `demo_join_${raffleId}` },
                { text: "📋 Статус", callback_data: `demo_status_${raffleId}` }
            ]]
        };

        try {
            if (media) {
                await ctx.telegram.sendAnimation(ctx.from.id, media, {
                    caption,
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            } else {
                await ctx.telegram.sendMessage(ctx.from.id, caption, {
                    parse_mode: "Markdown",
                    reply_markup: keyboard
                });
            }

            await ctx.reply("✅ Готово! Это демо. Так будет выглядеть пост в канал с розыгрышем.");
        } catch (err) {
            console.error("❌ Ошибка отправки демо:", err);
            await ctx.reply("❌ Не удалось отправить демо. Проверь доступ и попробуй снова.");
        }

        return ctx.scene.leave();
    }
);

module.exports = {
    demoScene
};