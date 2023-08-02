

const { postgres } = require("../databases");
const { NotFoundError, HumanError, InvalidRequestError, ConflictError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
/**
 * Get fee Data and filter it by id, ...
 * @param {*} id
 * @param {*} userType
 * @param {*} userLevel
 * @param {*} depositFee
 * @param {*} withdrawFee
 * @param {*} order
 * @param {*} page
 * @param {*} limit
 * @param {*} referralOneCardType
 * @param {*} referralOneCardTier
 * @param {*} referralTwoCardType
 * @param {*} referralTwoCardTier
 * @returns
 */
function get(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			userType,
			userLevel,
			userCount,
			targetPrice,
			reward,
			depositFee,
			withdrawFee,
			referralReward,
			page,
			limit,
			order,
			sort,
		} = data;

		let offset = 0 + (page - 1) * limit,
			query = {};

		if (id) query.id = id;
		if (userType && userType.length) query.userType = userType;
		if (userLevel) query.userLevel = userLevel;
		if (userCount) query.userCount = userCount;
		if (targetPrice) query.targetPrice = targetPrice;
		if (reward) query.reward = reward;
		if (depositFee) query.depositFee = depositFee;
		if (withdrawFee) query.withdrawFee = withdrawFee;
		if (referralReward) query.referralReward = referralReward;

		let result = await postgres.Fee.findAndCountAll({
			where: query,
			offset,
			limit,
			order: [[sort, order]],
			raw: true,
			nest: true,
			include: [
				{
					model: postgres.Asset,
				},
			],
		});

		resolve({
			total: result.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * find fee by primary key
 * @param {*} id
 * @returns
 */
function getById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Fee.findOne({
			where: { id },
			raw: true,
			nest: true,
		});

		if (!result) return reject(new NotFoundError(Errors.FEE_NOT_FOUND.MESSAGE, Errors.FEE_NOT_FOUND.CODE, { id }));

		resolve(result);
	});
}

/**
 * Add new fee
 * @param {*} userType
 * @param {*} userLevel
 * @param {*} depositFee
 * @param {*} withdrawFee
 * @param {*} referralOneCardType
 * @param {*} referralOneCardTier
 * @param {*} referralTwoCardType
 * @param {*} referralTwoCardTier
 * @returns
 */
function add(data) {
	return new Promise(async (resolve, reject) => {
		let { userType, userLevel, depositFee, withdrawFee, referralReward } = data;

		let result = await postgres.Fee.create({
			userType,
			userLevel,
			depositFee,
			withdrawFee,
			referralReward,
		});

		if (!result) return reject(new HumanError(Errors.FEE_FAILED.MESSAGE, Errors.FEE_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * Edit fee
 * @param {*} id
 * @param {*} userType
 * @param {*} userLevel
 * @param {*} depositFee
 * @param {*} withdrawFee
 * @returns
 */
function edit(data) {
	return new Promise(async (resolve, reject) => {
		let update = {};

		let { id, userType, userLevel, depositFee, withdrawFee, referralReward } = data;

		if (userType) update.userType = userType;
		if (userLevel) update.userLevel = userLevel;
		if (depositFee) update.depositFee = depositFee;
		if (withdrawFee) update.withdrawFee = withdrawFee;
		if (referralReward) update.referralReward = referralReward;

		let result = await postgres.Fee.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.FEE_NOT_FOUND.MESSAGE, Errors.FEE_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * Delete user fee
 * @param {*} id
 * @returns
 */
function del(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Fee.destroy({ where: { id } });

		if (!result) return reject(new NotFoundError(Errors.FEE_NOT_FOUND.MESSAGE, Errors.FEE_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

module.exports = {
	get,
	add,
	edit,
	del,
	getById,
};
