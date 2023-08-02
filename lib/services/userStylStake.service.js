const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

/**
 * get User Styl Stake list
 */
async function getUserStylStakes(data) {
	const { page, limit, order, sort, id, userId, lensId, profit, days, userAmount, userName } = data;

	const offset = (page - 1) * limit;

	const query = {};
	const query2 = {};
	const query3 = {};

	if (id) query.id = id;
	if (userId) query.userId = userId;
	if (lensId) query.lensId = lensId;
	if (profit) query.profit = profit;
	if (days) query.days = days;
	if (userAmount) query.userAmount = userAmount;
	if (userName) query3.name = { [postgres.Op.iLike]: userName };

	const result = await postgres.UserStylStake.findAndCountAll({
		// where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.StylStake,
				attributes: { exclude: ["updatedAt", "deletedAt"] },
				// where: query2,
				required: true,
			},
			{
				model: postgres.User,
				attributes: ["id", "name", "email"],
				where: query3,
				required: true,
			},
		],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * Find User Styl Stake By Id
 * @param {*} id
 * @returns
 */
function getUserStylStakeById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.UserStylStake.findOne({
			where: { id },
			nest: true,
			include: [
				{
					model: postgres.StylStake,
					attributes: { exclude: ["updatedAt", "deletedAt"] },
					required: true,
				},
				{
					model: postgres.User,
					attributes: ["id", "name", "email"],
					required: true,
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.USER_STYL_STAKE_NOT_FOUND.MESSAGE, Errors.USER_STYL_STAKE_NOT_FOUND.CODE, {
					id,
				}),
			);

		return resolve(result);
	});
}

module.exports = {
	getUserStylStakes,
	getUserStylStakeById,
};
