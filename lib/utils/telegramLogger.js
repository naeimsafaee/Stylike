// https://api.telegram.org/bot5830877903:AAGfBdQiM9sO_leTaE5aV0tyHT5q9ur0B4Y/setWebhook?url=

const axios = require("axios");
const { postgres } = require("../databases");

const baseUrl = "https://api.telegram.org/bot";
const botToken = "5830877903:AAGfBdQiM9sO_leTaE5aV0tyHT5q9ur0B4Y";

exports.send = async (message) => {

    const chats = await postgres.TelegramChat.findAll({});

    for (let i = 0; i < chats.length; i++) {
        await axios.get(baseUrl + botToken + `/sendMessage?chat_id=${chats[i].chatId}&text=${message}`);
    }
};

exports.telegramBot = async (req, res) => {

    const message = req.body;

    console.log(message)

    return res.send({
        data: "ok"
    });
};




