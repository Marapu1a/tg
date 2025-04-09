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

        await bot.telegram.sendMessage(
            raffle.channelId,
            messageText,
            { parse_mode: "Markdown" }
        );
    } catch (err) {
        console.error("❌ Ошибка при завершении розыгрыша:", err.message);
    } finally {
        updateFn(raffle.id, {
            winners,
            isFinished: true,
        });

        if (process.env.ADMIN_ID) {
            const adminId = Number(process.env.ADMIN_ID);

            let adminMessage = `📢 *Розыгрыш завершён*\n`;
            adminMessage += `🎁 ${raffle.title}\n`;
            adminMessage += `👥 Участников: ${raffle.participants.length}\n`;
            adminMessage += `🏆 Победителей: ${winners.length}\n\n`;

            if (winners.length > 0) {
                adminMessage += winners.map(id => `— [Победитель](tg://user?id=${id})`).join("\n");
            } else {
                adminMessage += `😢 Победителей нет`;
            }

            await bot.telegram.sendMessage(adminId, adminMessage, {
                parse_mode: "Markdown"
            });
        }
    }
}

module.exports = {
    checkSubscriptions,
    pickWinners,
    finishRaffle
};
