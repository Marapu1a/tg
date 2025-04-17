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

        // 1. Публичное сообщение в канал
        const publicMessage =
            `Розыгрыш завершён 💫  
Спасибо всем, кто участвовал!

Победители уже определены, и мы скоро свяжемся с ними лично.  
Если не повезло — не беда, впереди ещё много розыгрышей.`;

        await bot.telegram.sendMessage(raffle.channelId, publicMessage);

        try {
            await bot.telegram.editMessageReplyMarkup(
                raffle.channelId,
                raffle.messageId,
                undefined,
                {
                    inline_keyboard: [
                        [{ text: "📋 Розыгрыш завершён", callback_data: `status_${raffle.id}` }]
                    ]
                }
            );
        } catch (e) {
            console.warn("⚠️ Не удалось обновить кнопки после завершения:", e.message);
        }

        // 2. Обновление raffle
        updateFn(raffle.id, {
            winners,
            isFinished: true,
        });

        // 3. Личное сообщение админу
        const date = new Date(raffle.endTime).toLocaleDateString("ru-RU");
        const postLink = `https://t.me/${raffle.channelName.replace("@", "")}/${raffle.messageId}`;
        const mentions = winners.length > 0
            ? winners.map(id => `• [Победитель](tg://user?id=${id})`).join("\n")
            : "— Победителей нет";

        const adminMessage =
            `🎉 Розыгрыш: *${raffle.title}*  
📅 Дата окончания: ${date}  
📨 Пост: [Открыть](${postLink})

🏆 Победители:\n  
${mentions}`;

        await bot.telegram.sendMessage(raffle.ownerId, adminMessage, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        });

        // 4. Собираем финальное число подписчиков
        try {
            const memberCountEnd = await bot.telegram.getChatMembersCount(raffle.channelName);
            console.log("📊 memberCountEnd:", memberCountEnd);
            // (не сохраняем, если не используешь)
        } catch (err) {
            console.warn("⚠️ Не удалось получить memberCountEnd:", err.message);
        }

    } catch (err) {
        console.error("❌ Ошибка при завершении розыгрыша:", err.message);
    }
}

module.exports = {
    checkSubscriptions,
    pickWinners,
    finishRaffle
};