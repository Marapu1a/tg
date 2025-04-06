const { participants } = require("../storage/participants");

module.exports = (bot) => {
    bot.command("join", async (ctx) => {
        const userId = ctx.from.id;
        const username = ctx.from.username || "без ника";

        try {
            const member = await ctx.telegram.getChatMember("@broke2bit", userId);

            if (["member", "administrator", "creator"].includes(member.status)) {
                if (!participants.includes(userId)) {
                    participants.push(userId);
                    ctx.reply(`✅ Ты участвуешь в розыгрыше, @${username}!`);
                } else {
                    ctx.reply("Ты уже участвуешь.");
                }
            } else {
                ctx.reply("❌ Сначала подпишись на канал!");
            }
        } catch (err) {
            ctx.reply("⚠️ Бот не может проверить подписку. Он точно админ канала?");
        }
    });
};
