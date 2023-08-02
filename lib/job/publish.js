const amqplib = require("amqplib");
const rabbitmqCfg = require("config").get("services.rabbitmq.url");


async function send(queue, data) {
	const conn = await amqplib.connect(rabbitmqCfg);
	const ch = await conn.createChannel();
	await ch.assertQueue(queue);
	return ch.sendToQueue(queue, Buffer.from(data));
}


module.exports = { send };
