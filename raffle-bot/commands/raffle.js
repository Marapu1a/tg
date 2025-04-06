module.exports = (bot) => {
    bot.command("raffle", (ctx) => {
        ctx.reply("Ок! Введи @канал, где ты будешь проводить розыгрыш.");
    });
};
