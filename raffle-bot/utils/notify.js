async function notifyAdminAfterRaffle(bot, raffle, winners, memberCountEnd) {
    console.log("📨 notifyAdminAfterRaffle вызван для:", raffle.title);

    const adminId = process.env.ADMIN_ID;
    if (!adminId) return;

    const delta = memberCountEnd - (raffle.memberCountStart || 0);

    let msg = `📢 *Розыгрыш завершён*\n` +
        `🎁 ${raffle.title}\n` +
        `👥 Участвовало: ${raffle.participants.length}\n` +
        `📈 Было подписчиков: ${raffle.memberCountStart || "?"}\n` +
        `📈 Стало: ${memberCountEnd}\n` +
        `🆕 Прирост: ${delta > 0 ? "+" + delta : delta}\n\n`;

    msg += winners.length > 0
        ? winners.map(id => `🏆 [Победитель](tg://user?id=${id})`).join("\n")
        : `😢 Победителей нет`;

    msg += `\n\n🕒 Спасибо за использование нашего бота!\n` +
        `Если возникли какие-то трудности, свяжитесь с разработчиком @valentin_marapulets\n` +
        `\n`
            `_Здесь может быть ваша реклама_ 😉`;

    await bot.telegram.sendMessage(adminId, msg, { parse_mode: "Markdown" });
}

module.exports = {
    notifyAdminAfterRaffle
};
