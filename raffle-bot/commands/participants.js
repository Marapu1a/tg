const { participants } = require("../storage/participants");

module.exports = (bot) => {
    bot.command("participants", (ctx) => {
        if (participants.length === 0) {
            return ctx.reply("Участников пока нет.");
        }

        const list = participants
            .map((id, index) => `${index + 1}. [id${id}](tg://user?id=${id})`)
            .join("\n");

        ctx.reply(`👥 Участники розыгрыша:\n\n${list}`, {
            parse_mode: "Markdown",
        });
    });
};
