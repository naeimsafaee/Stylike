const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

/**
 * get membership list
 */
async function getMemberships(data) {
	const { page, limit, order, sort, createdAt, id, updatedAt, days, amount } = data;

	const offset = (page - 1) * limit;

	const query = {};

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (updatedAt) {
		const { start, end } = dateQueryBuilder(updatedAt);
		query.updatedAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (id) query.id = id;
	if (days) query.days = days;
	if (amount) query.amount = amount;

	const result = await postgres.Membership.findAndCountAll({
		where: query,
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
 * Find Membership By Id
 * @param {*} id
 * @returns
 */
function getMembershipById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Membership.findOne({
			where: { id },
			nest: true,
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.MEMBERSHIP_NOT_FOUND.MESSAGE, Errors.MEMBERSHIP_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * add new membership
 * @param {*} days
 * @param {*} amount
 * @returns
 */
function addMembership(data) {
	return new Promise(async (resolve, reject) => {
		const { days, amount } = data;

		const existMembership = await postgres.Membership.findOne({ where: { days } });
		if (existMembership)
			return reject(
				new HumanError(Errors.DUPLICATE_MEMBERSHIP.MESSAGE, Errors.DUPLICATE_MEMBERSHIP.CODE, { days }),
			);

		const result = await new postgres.Membership({
			days,
			amount,
		}).save();

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * update membership
 * @param {*} id
 * @param {*} days
 * @param {*} amount
 * @returns
 */
function editMembership(data) {
	return new Promise(async (resolve, reject) => {
		const { id, days, amount } = data;

		const currentMembership = await postgres.Membership.findByPk(id);
		if (!currentMembership)
			return reject(
				new NotFoundError(Errors.MEMBERSHIP_NOT_FOUND.MESSAGE, Errors.MEMBERSHIP_NOT_FOUND.CODE, { id }),
			);

		if (days !== undefined) {
			const existMembership = await postgres.Membership.findOne({
				where: { days, id: { [postgres.Op.ne]: id } },
				raw: true,
			});
			if (existMembership)
				return reject(
					new HumanError(Errors.DUPLICATE_MEMBERSHIP.MESSAGE, Errors.DUPLICATE_MEMBERSHIP.CODE, { days }),
				);
		}

		const update = {};

		if (days) update.days = days;
		if (amount) update.amount = amount;

		const result = await postgres.Membership.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

module.exports = {
	getMemberships,
	getMembershipById,
	addMembership,
	editMembership,
};
