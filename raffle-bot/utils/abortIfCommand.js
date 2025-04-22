module.exports = function abortIfCommand(ctx) {
    const text = ctx.message?.text?.trim();
    if (text && text.startsWith("/")) {
        ctx.reply("😏 Переделывай сколько влезет — у меня вечность в запасе. Нажми еще разок /start и полетели")
        ctx.scene.leave();
        return true;
    }
    return false;
};