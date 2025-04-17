// handlers/demo.js
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
        const channel = ctx.message.text.trim();
        if (!/^@[\w\d_]{5,}$/.test(channel)) {
            ctx.reply("❌ Неверный формат. Введи именно @юзернейм канала. Названия с пробелами не подходят. Пример: @my_channel");
            return;
        }
        ctx.wizard.state.data = {
            channel,
        };
        ctx.reply("🔗 Укажи @юзернеймы доп. каналов через запятую (или «-», если нет):");
        return ctx.wizard.next();
    },

    // Шаг 3: название
    async (ctx) => {
        const raw = ctx.message.text.trim();
        ctx.wizard.state.data.additionalChannels = raw === "-" ? [] : raw.split(",").map(s => s.trim());
        ctx.reply("🏷 Введи название розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 4: описание
    async (ctx) => {
        const title = ctx.message.text.trim();
        if (title.length < 3) {
            ctx.reply("❌ Название должно быть от 3 символов");
            return;
        }
        ctx.wizard.state.data.title = title;
        ctx.reply("📝 Введи описание розыгрыша:");
        return ctx.wizard.next();
    },

    // Шаг 5: время окончания
    async (ctx) => {
        const desc = ctx.message.text.trim();
        if (desc.length < 5) {
            ctx.reply("❌ Описание должно быть от 5 символов");
            return;
        }
        ctx.wizard.state.data.description = desc;
        ctx.reply("⏳ Укажи время до окончания розыгрыша (например: 1д 2ч 30м):");
        return ctx.wizard.next();
    },

    // Шаг 6: валидация времени
    async (ctx) => {
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
        ctx.reply("🏆 Сколько будет победителей?");
        return ctx.wizard.next();
    },

    // Шаг 7: подтверждение и публикация в ЛС
    async (ctx) => {
        const num = parseInt(ctx.message.text.trim());
        if (isNaN(num) || num <= 0 || num > 100) {
            ctx.reply("❌ Укажи корректное число победителей (от 1 до 100)");
            return;
        }
        ctx.wizard.state.data.winnerCount = num;

        const { channel, additionalChannels, title, description, endTime, winnerCount } = ctx.wizard.state.data;
        const raffleId = uuidv4();

        const caption =
            `🎉 *${title}*\n\n` +
            `${description}\n\n` +
            `⏳ До: *${new Date(endTime).toLocaleString()}*\n` +
            `🏆 Победителей: *${winnerCount}*\n\n` +
            `⚠️ Это демо-предпросмотр. Участие недоступно.`;

        await ctx.telegram.sendAnimation(ctx.from.id, "CgACAgQAAxkBAAIOVGf9WpfyI2zeVk7hzOSeMagZb6qOAAIkAwAChWoEU6ObsrEluW9lNgQ", {
            caption,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[
                    { text: "🎉 Участвовать", callback_data: `demo_join_${raffleId}` },
                    { text: "📋 Статус", callback_data: `demo_status_${raffleId}` }
                ]]
            }
        });

        await ctx.reply("✅ Готово! Это демо. Посмотри, как будет выглядеть розыгрыш.");
        return ctx.scene.leave();
    }
);

module.exports = {
    demoScene
};