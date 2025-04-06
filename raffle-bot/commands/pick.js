const { participants } = require("../storage/participants");

module.exports = (bot) => {
    bot.command("pick", /** @param {import('telegraf').Context} ctx */(ctx) => {
        if (!participants || participants.length === 0) {
            return ctx.reply("Никто не участвует 😕");
        }

        const winnerId = participants[Math.floor(Math.random() * participants.length)];

        ctx.reply(`🎉 Победитель: [${ctx.from.username}](tg://user?id=${winnerId})`, {
            parse_mode: "Markdown",
        });

        participants.length = 0;
    });
};
