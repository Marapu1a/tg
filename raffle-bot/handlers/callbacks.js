const { getById, update } = require("../raffles");
const { checkSubscriptions } = require("../utils/helpers");

module.exports = (bot) => {
    bot.on("callback_query", async (ctx) => {
        const data = ctx.callbackQuery?.data;
        if (!data) return;

        if (data.startsWith("join_")) {
            const raffleId = data.split("_")[1];
            const raffle = getById(raffleId);
            if (!raffle) return ctx.answerCbQuery("❌ Розыгрыш не найден", { show_alert: true });
            if (raffle.isFinished) return ctx.answerCbQuery("❌ Розыгрыш уже завершён", { show_alert: true });

            const userId = ctx.from.id;
            if (raffle.participants.includes(userId)) {
                return ctx.answerCbQuery("🤌 Вы уже участвуете!");
            }

            const ok = await checkSubscriptions(ctx.telegram, userId, [
                raffle.channelName,
                ...raffle.additionalChannels,
            ]);

            if (!ok) return ctx.answerCbQuery("❌ Подпишитесь на все каналы", { show_alert: true });

            raffle.participants.push(userId);
            update(raffleId, { participants: raffle.participants });

            return ctx.answerCbQuery("✅ Вы участвуете!");
        }

        if (data.startsWith("status_")) {
            const raffleId = data.split("_")[1];
            const raffle = getById(raffleId);
            if (!raffle) return ctx.answerCbQuery("❌ Розыгрыш не найден", { show_alert: true });

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
}