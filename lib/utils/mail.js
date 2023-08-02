// const sendgridConfig = require("config").get("clients.sendgrid");
// const sgMail = require("@sendgrid/mail");

// sgMail.setApiKey(sendgridConfig.auth.api_user);

// /**
//  *
//  * @param {*} to string
//  * @param {*} code integer
//  * @param {*} type string
//  * @param {*} data object
//  * @returns
//  */
// module.exports = async (to, code, type, data = {}) => {
// 	let templateId = "d-d75ac6d31c344452bea7cff2c30ddcd0";

// 	if (type === "WITHDRAW") templateId = "d-a1e8b97a3bf74cba8d36293e667dc7d0";

// 	if (type === "NOTICES") templateId = "d-78af29c5e1f94c1fb04c26fab7e6e11a";

// 	if (type === "NOTICES_CARD_PURCHASE") templateId = "d-d239cdbcf41a4ba48a09753d7a235400";

// 	if (code) data = { customCode: code };

// 	const msg = {
// 		to: to,
// 		from: sendgridConfig.from,
// 		templateId,
// 		dynamic_template_data: data,
// 	};
// 	return sgMail
// 		.send(msg)
// 		.then((response) => {})
// 		.catch((error) => {
// 			// console.error("email", error);
// 		});
// };

const sendgridConfig = require("config").get("clients.sendgrid");
const sgMail = require("@sendgrid/mail");
const { stringify } = require("uuid");
sgMail.setApiKey(sendgridConfig.auth.api_user);
const awsSes = require('./awsSes')

/**
 *
 * @param {*} to string
 * @param {*} code integer
 * @param {*} type string
 * @param {*} data object
 * @returns
 */

module.exports = async (to, code, type, data = {}, title, text) => {
	let templateId = sendgridConfig.templateId;

	// if (type === "WITHDRAW") templateId = sendgridConfig.templateId_WITHDRAW;

	// if (type === "NOTICES") templateId = sendgridConfig.templateId_NOTICES;

	if (code) data = { customCode: code };

	if (code && !type) {
		return awsSes.sendVerificationCode(to, code)
	}

	if (type === "NOTICES") {
		return awsSes.sendNoticeEmail(to, data.title, data.text)
	}

	if (type === "WITHDRAW") {
		if (code)
			return awsSes.sendWithdrawCode(to, code)
	}

	if (type === "STAKE") {
		if (code)
			return awsSes.stakeNotification(to, title, text)
	}

	if (type === "NOTICES_CARD_PURCHASE") {
		return awsSes.sendNoticeEmail(to, 'Hello,', `Thank you for ordering NFT and welcome to our fashion tournaments.`)
	}

	//sendGrid

	const msg = {
		to: to,
		from: sendgridConfig.from,
		templateId,
		dynamic_template_data: data,
	};

	return sgMail
		.send(msg)
		.then((response) => {
			// console.log("email response is : ");
			// console.log("email", response[0].statusCode);
		})
		.catch((error) => {
			console.log("email err is : ");
			console.error("email", error);
		});
};
