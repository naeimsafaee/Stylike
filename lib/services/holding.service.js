const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

/**
 * get holding list
 */
async function getHoldings(data) {
	const { page, limit, order, sort, createdAt, id, assetId, updatedAt, minimum, amount } = data;

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
	if (assetId) query.assetId = assetId;
	if (minimum) query.minimum = minimum;
	if (amount) query.amount = amount;

	const result = await postgres.Holding.findAndCountAll({
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
 * Find Holding By Id
 * @param {*} id
 * @returns
 */
function getHoldingById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Holding.findOne({
			where: { id },
			nest: true,
			include: [
				{
					model: postgres.Asset,
					as: "asset",
				},
			],
		});

		if (!result)
			return reject(new NotFoundError(Errors.HOLDING_NOT_FOUND.MESSAGE, Errors.HOLDING_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}

/**
 * add new holding
 * @param {*} days
 * @param {*} amount
 * @returns
 */
function addHolding(data) {
	return new Promise(async (resolve, reject) => {
		const { assetId, minimum, amount } = data;

		const asset = await postgres.Asset.findByPk(assetId, { raw: true });
		if (!asset)
			return reject(new NotFoundError(Errors.ASSET_NOT_FOUND.MESSAGE, Errors.ASSET_NOT_FOUND.CODE, { assetId }));

		const existHolding = await postgres.Holding.findOne({ where: { assetId, minimum } });
		if (existHolding)
			return reject(new HumanError(Errors.DUPLICATE_HOLDING.MESSAGE, Errors.DUPLICATE_HOLDING.CODE, { minimum }));

		const result = await new postgres.Holding({
			assetId,
			minimum,
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
function editHolding(data) {
	return new Promise(async (resolve, reject) => {
		const { id, assetId, minimum, amount } = data;

		const currentHolding = await postgres.Holding.findByPk(id);
		if (!currentHolding)
			return reject(new NotFoundError(Errors.HOLDING_NOT_FOUND.MESSAGE, Errors.HOLDING_NOT_FOUND.CODE, { id }));

		const newAssetId = assetId ? assetId : currentHolding.assetId;
		if (assetId) {
			const asset = await postgres.Asset.findByPk(assetId, { raw: true });
			if (!asset)
				return reject(
					new NotFoundError(Errors.ASSET_NOT_FOUND.MESSAGE, Errors.ASSET_NOT_FOUND.CODE, { assetId }),
				);
		}

		if (minimum !== undefined) {
			const existHolding = await postgres.Holding.findOne({
				where: { minimum, assetId: newAssetId, id: { [postgres.Op.ne]: id } },
				raw: true,
			});
			if (existHolding)
				return reject(
					new HumanError(Errors.DUPLICATE_HOLDING.MESSAGE, Errors.DUPLICATE_HOLDING.CODE, {
						minimum,
						assetId: newAssetId,
					}),
				);
		}

		const update = {};

		if (assetId) update.assetId = assetId;
		if (minimum) update.minimum = minimum;
		if (amount) update.amount = amount;

		const result = await postgres.Holding.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

module.exports = {
	getHoldings,
	getHoldingById,
	addHolding,
	editHolding,
};
