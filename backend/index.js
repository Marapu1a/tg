// backend/index.js
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/api/freekassa/notify", (req, res) => {
    const { MERCHANT_ID, AMOUNT, intid, SIGN } = req.body;

    const merchantId = process.env.FREEKASSA_MERCHANT_ID;
    const secret2 = process.env.FREEKASSA_SECRET_2;

    const signString = [merchantId, AMOUNT, secret2].join(":");

    const calculatedSign = crypto
        .createHash("md5")
        .update(signString)
        .digest("hex");

    if (SIGN.toLowerCase() !== calculatedSign) {
        return res.status(403).send("Invalid signature");
    }

    console.log(`💰 Получен платёж: ${AMOUNT} руб., ID: ${intid}`);
    // тут можно увеличить баланс в users.json или как тебе нужно

    res.send("YES");
});

app.get("/", (req, res) => {
    res.send("✅ FreeKassa backend работает");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 FreeKassa backend запущен на http://localhost:${PORT}`);
});  
