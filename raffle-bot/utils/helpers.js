const { addChannelStat } = require("./channelStats");
const { notifyAdminAfterRaffle } = require("./notify");

async function checkSubscriptions(telegram, userId, channels) {
    try {
        for (const channel of channels) {
            const status = await telegram.getChatMember(channel, userId);
            if (["left", "kicked"].includes(status.status)) {
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error("Ошибка проверки подписки:", err);
        return false;
    }
}

function pickWinners(participants, count) {
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function finishRaffle(bot, raffle, updateFn) {
    let winners = [];
    try {
        const count = Math.min(Number(raffle.winnerCount), raffle.participants.length);
        winners = pickWinners(raffle.participants, count);

        let messageText = `🎉 Розыгрыш завершён!\n\n*${raffle.title}*\n\n`;

        if (winners.length === 0) {
            messageText += "😢 Нет победителей. Никто не участвовал.";
        } else {
            const mentions = winners.map(id => `🏆 [Победитель](tg://user?id=${id})`);
            messageText += `🏆 Победители:\n${mentions.join("\n")}`;
        }

        await bot.telegram.sendMessage(raffle.channelId, messageText, {
            parse_mode: "Markdown"
        });

        updateFn(raffle.id, {
            winners,
            isFinished: true,
        });

        // Получаем финальное число подписчиков
        let memberCountEnd = 0;
        try {
            memberCountEnd = await bot.telegram.getChatMembersCount(raffle.channelName);
            console.log(memberCountEnd);
        } catch (err) {
            console.warn("⚠️ Не удалось получить memberCountEnd:", err.message);
        }

        // Пишем в JSON статистику
        addChannelStat(raffle.channelName, {
            raffleId: raffle.id,
            title: raffle.title,
            start: raffle.memberCountStart || 0,
            end: memberCountEnd,
            after: null,
            participants: raffle.participants.length,
            winners,
            startAt: raffle.startAt || Date.now(),
            endAt: raffle.endTime || Date.now(),
        });

        await notifyAdminAfterRaffle(bot, raffle, winners, memberCountEnd);

    } catch (err) {
        console.error("❌ Ошибка при завершении розыгрыша:", err.message);
    }
}

module.exports = {
    checkSubscriptions,
    pickWinners,
    finishRaffle
};
