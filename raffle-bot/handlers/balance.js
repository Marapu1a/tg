const { getUser } = require("../utils/users");

module.exports = (bot) => {
    bot.hears("💰 Баланс", (ctx) => {
        const user = getUser(ctx.from.id);
        ctx.reply(`💰 Текущий баланс: ${user.balance}₽`);
    });
}