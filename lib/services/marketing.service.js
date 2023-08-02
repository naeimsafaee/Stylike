const { postgres } = require("./../databases");
const Op = require("sequelize").Op;
const sendgridConfig = require("config").get("clients.sendgrid");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(sendgridConfig.auth.api_user);

/**
 * Create Email Marketing
 * @returns

 */

function createEmailMarketing(data) {
	return new Promise(async (resolve, reject) => {
		let { templateId, type, dial_code } = data;

		let whereData = {
			email: { [Op.ne]: null },
		};
		if (dial_code) {
			whereData.mobile = {
				[Op.like]: `%${dial_code}%`,
			};
		}
		const users = await postgres.User.findAll({
			where: whereData,
		});

		const usersEmail = users.map((item) => {
			return item.email;
		});

		const msg = {
			to: usersEmail,
			from: type,
			templateId,
		};

		if (usersEmail?.length > 0) {
			await sgMail
				.sendMultiple(msg)
				.then((response) => {
				})
				.catch((error) => {
					console.error("email", error);
				});
		}

		return resolve("Successful");
	});
}
module.exports = {
	createEmailMarketing,
};
