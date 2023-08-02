
const { postgres } = require("../databases");

let includesPath = [
	"/api/account/kyc",
	"/api/asset/withdraw",
	"/api/asset/deposit",
	"/api/order",
	"/api/order/:orderId",
	"/api/account/confirm/:confirmType",
	"/api/account",
];
/**
 * save activity logs for all user
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */
exports.logs = (req, res, next) => {
	var json = res.json;

	res.json = function (response) {
		let { id } = req?.userEntity ?? {};

		let path = req.baseUrl + (req.route?.path !== "/" ? req.route?.path : "");

		if (id && includesPath.includes(path)) {
			let body = { query: req.query, body: req.body, params: req.params };

			let useragent = req.useragent;

			let ip = req.ip;

			postgres.UserActivity.create({
				userId: id,
				path,
				ip,
				body,
				response,
				useragent,
			});
		}

		json.call(this, response);
	};
	next();
};
