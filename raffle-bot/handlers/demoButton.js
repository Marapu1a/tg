const { markDemo } = require("../utils/analytics");


module.exports = (bot) => {
    bot.action("start_demo", async (ctx) => {
        if (!ctx.callbackQuery) return;
        await ctx.answerCbQuery().catch((e) => {
            console.warn("⏳ Пропущен ответ на callback:", e.description);
        });

        markDemo(ctx.from.id);

        await ctx.scene.enter("demoRaffleScene");
    });
}