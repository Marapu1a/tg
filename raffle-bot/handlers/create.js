const { hasEnoughBalance } = require("../utils/users");

module.exports = (bot) => {
    bot.hears("🎯 Создать розыгрыш", (ctx) => {
        const RAFFLE_COST = 500;
        if (!hasEnoughBalance(ctx.from.id, RAFFLE_COST)) {
            ctx.reply(
                `⛔️ У тебя недостаточно средств для создания розыгрыша.\n` +
                `💸 Стоимость — ${RAFFLE_COST}₽.\n` +
                `Пополнить можно через кнопку “💸 Пополнить баланс”.`
            );
            return;
        }

        ctx.scene.enter("createRaffleScene");
    });
}