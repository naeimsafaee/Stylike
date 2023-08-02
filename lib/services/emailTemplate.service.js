const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const sendgridConfig = require("config").get("clients.sendgrid");
const sgMail = require("@sendgrid/mail");
const amqplib = require("amqplib");
const amqp = require("amqplib/callback_api");
const rabbitmqCfg = require("config").get("services.rabbitmq.url");

/**
 * add new email template
 */
function addEmailTemplate(data) {
	return new Promise(async (resolve, reject) => {
		const { templateId, name } = data;

		const result = await new postgres.EmailTemplate({
			templateId,
			name,
		}).save();

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * get Email Template list
 */
async function getEmailTemplates(data) {
	const { page, limit, order, sort, id, templateId, name } = data;

	const offset = (page - 1) * limit;

	const query = {};

	if (id) query.id = id;
	if (templateId) query.templateId = { [postgres.Op.iLike]: `%${templateId}%` };
	if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };

	const result = await postgres.EmailTemplate.findAndCountAll({
		where: query,
		attributes: { exclude: ["deletedAt", "updatedAt"] },
		limit,
		offset,
		order: [[sort, order]],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * Find Email Template By Id
 * @param {*} id
 * @returns
 */
function getEmailTemplateById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.EmailTemplate.findOne({
			where: { id },
			attributes: { exclude: ["deletedAt", "updatedAt"] },
			nest: true,
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.EMAIL_TEMPLATE_NOT_FOUND.MESSAGE, Errors.EMAIL_TEMPLATE_NOT_FOUND.CODE, {
					id,
				}),
			);

		return resolve(result);
	});
}

/**
 * send email
 */
function sendEmail(data) {
	return new Promise(async (resolve, reject) => {
		const { id, countries, title, text } = data;

		let email = await postgres.EmailTemplate.findOne({
			where: { id },
			attributes: ["templateId"],
		});

		if (!email)
			return reject(
				new NotFoundError(Errors.EMAIL_TEMPLATE_NOT_FOUND.MESSAGE, Errors.EMAIL_TEMPLATE_NOT_FOUND.CODE, {
					id,
				}),
			);

		const query = {};

		if (countries) {
			query.countryId = { [postgres.Op.in]: countries };
		}

		const users = await postgres.User.findAndCountAll({
			where: query,
			attributes: ["email"],
		});

		const to = [];
		for (let u of users.rows) {
			to.push(u.email);
		}

		const queueData = {
			text,
			title,
		};

		(async () => {
			const queue = "email_queue";
			const conn = await amqplib.connect(rabbitmqCfg);

			const ch1 = await conn.createChannel();
			await ch1.assertQueue(queue);

			// Listener
			ch1.consume(queue, (msg) => {
				if (msg !== null) {
					// console.log("Recieved:", msg.content.toString());
					sgMail.send(JSON.parse(msg.content.toString()));
					ch1.ack(msg);
				} else {
					console.log("Consumer cancelled by server");
				}
			});

			// Sender
			const ch2 = await conn.createChannel();
			for (let e of to) {
				const msg = {
					to: e,
					from: "marketing@info.stylike.io",
					templateId: email.templateId,
					dynamic_template_data: queueData,
				};

				ch2.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
			}
		})();

		resolve("Emails added to the queue successfully");
	});
}

module.exports = {
	addEmailTemplate,
	getEmailTemplates,
	getEmailTemplateById,
	sendEmail,
};
