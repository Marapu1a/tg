const sendStartMenu = require("../utils/sendStartMenu");
const { addUser } = require("../utils/analytics");

module.exports = (bot) => {
    bot.command("start", async (ctx) => {
        if (ctx.scene?.current) await ctx.scene.leave();
        ctx.session = null;

        addUser(ctx.from.id);
        await sendStartMenu(ctx);
    });
};
