const fs = require("fs");

module.exports = (bot) => {
    bot.hears("📊 Статистика", async (ctx) => {
        const userId = ctx.from.id;

        let raffles;
        try {
            const raw = fs.readFileSync("raffle-bot/storage/raffles.json", "utf-8");
            raffles = JSON.parse(raw);
        } catch (err) {
            console.error("❌ Ошибка при чтении статистики:", err);
            return ctx.reply("❌ Не удалось загрузить статистику. Попробуй позже.");
        }

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

        // — отправка статистики
        try {
            await ctx.telegram.sendMessage(
                ctx.chat.id,
                message,
                { parse_mode: "Markdown", disable_web_page_preview: true }
            );
        } catch (err) {
            console.error("❌ sendMessage (statistics) failed:", err);
            return ctx.reply("⚠️ Не удалось загрузить статистику. Попробуй позже.");
        }

    });
}