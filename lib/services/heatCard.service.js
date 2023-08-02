const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

/**
 * get Heat Card list
 */
async function getHeatCards(data) {
	const { page, limit, order, sort, createdAt, id, updatedAt, cardId, userId, userName, amount } = data;

	const offset = (page - 1) * limit;

	const query = {};
	const query2 = {};

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (updatedAt) {
		const { start, end } = dateQueryBuilder(updatedAt);
		query.updatedAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (id) query.id = id;
	if (cardId) query.cardId = cardId;
	if (userId) query.userId = userId;
	if (userName) query2.name = { [postgres.Op.iLike]: `%${userName}%` };
	if (amount) query.amount = amount;

	const result = await postgres.HeatCard.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.User,
				where: query2,
				attributes: { exclude: ["password", "salt"] },
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
 * Find Heat Card By Id
 * @param {*} id
 * @returns
 */
function getHeatCardById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.HeatCard.findOne({
			where: { id },
			nest: true,
			include: [
				{
					model: postgres.User,
					attributes: { exclude: ["password", "salt"] },
					as: "user",
				},
				{
					model: postgres.Card,
					as: "card",
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.HEAT_CARD_NOT_FOUND.MESSAGE, Errors.HEAT_CARD_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * update card
 * @param {*} id
 * @param {*} amount
 * @returns
 */
function editHeatCard(data) {
	return new Promise(async (resolve, reject) => {
		const { id, amount } = data;

		const currentCard = await postgres.HeatCard.findByPk(id);
		if (!currentCard)
			return reject(
				new NotFoundError(Errors.HEAT_CARD_NOT_FOUND.MESSAGE, Errors.HEAT_CARD_NOT_FOUND.CODE, { id }),
			);

		const update = {};

		if (amount) update.amount = amount;

		const result = await postgres.HeatCard.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

module.exports = {
	getHeatCards,
	getHeatCardById,
	editHeatCard,
};
