module.exports = async function sendStartMenu(ctx) {
    // Инлайн-кнопки
    await ctx.reply(
        "👋 Привет! Это бот для розыгрышей в Telegram-каналах.\n\n" +
        "Создавай розыгрыши за 2 минуты, собирай участников и выбирай победителей — автоматически.\n\n" +
        "Поехали?",
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📘 Как работает бот", callback_data: "how_it_works" },
                        { text: "🎮 Попробовать демо", callback_data: "start_demo" }
                    ]
                ]
            }
        }
    );

    // Клавиатура
    await ctx.reply("Выбери действие:", {
        reply_markup: {
            keyboard: [
                ["🎯 Создать розыгрыш", "📊 Статистика"],
                ["💸 Пополнить баланс", "💰 Баланс"],
                ["❌ Отмена / Сброс"]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
};
