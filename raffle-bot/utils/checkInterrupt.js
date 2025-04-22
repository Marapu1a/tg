const sendStartMenu = require("./sendStartMenu");

module.exports = async function checkInterrupt(ctx) {
    const text = ctx.message?.text?.trim();

    if (text === "/start" || text === "❌ Отмена / Сброс") {
        if (ctx.scene?.current) await ctx.scene.leave();
        ctx.session = null;
        await ctx.reply("😏 Всё сброшено. Перезапускаю…");
        await sendStartMenu(ctx);
        return true;
    }

    return false;
};
