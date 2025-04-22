const { addBalance, getUser } = require("../utils/users");

module.exports = (bot) => {
    bot.hears("💸 Пополнить баланс", (ctx) => {
        ctx.reply("⏳ Пополняем баланс...");

        setTimeout(() => {
            addBalance(ctx.from.id, 500);
            const user = getUser(ctx.from.id);
            ctx.reply(`✅ Баланс пополнен. Сейчас у тебя: ${user.balance}₽`);
        }, 300); // или 100 — тестируй, сколько нужно для плавности
    });
}