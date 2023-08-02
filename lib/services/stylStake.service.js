const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

/**
 * get Styl Stake list
 */
async function getStylStakes(data) {
	const { page, limit, order, sort, id, title, lensSettingId, percent, days, stylAmount, lensSettingName } = data;

	const offset = (page - 1) * limit;

	const query = {};
	const query2 = {};

	if (id) query.id = id;
	if (title) query.title = { [postgres.Op.iLike]: `%${title}%` };
	if (lensSettingId) query.lensSettingId = lensSettingId;
	if (percent) query.percent = percent;
	if (days) query.days = days;
	if (stylAmount) query.stylAmount = stylAmount;
	if (lensSettingName) query2.name = lensSettingName;

	const result = await postgres.StylStake.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.LensSetting,
				attributes: { exclude: ["updatedAt", "deletedAt"] },
				where: query2,
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
 * Find Styl Stake By Id
 * @param {*} id
 * @returns
 */
function getStylStakeById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.StylStake.findOne({
			where: { id },
			nest: true,
			include: [
				{
					model: postgres.LensSetting,
					attributes: { exclude: ["updatedAt", "deletedAt"] },
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.STYL_STAKE_NOT_FOUND.MESSAGE, Errors.STYL_STAKE_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * add new Styl Stake
 * @param {*} days
 * @param {*} amount
 * @returns
 */
function addStylStake(data) {
	return new Promise(async (resolve, reject) => {
		const { title, lensSettingId, stylAmount, percent, days } = data;

		const LensSetting = await postgres.LensSetting.findByPk(lensSettingId, { raw: true });
		if (!LensSetting)
			return reject(
				new NotFoundError(Errors.LENS_SETTING_NOT_FOUND.MESSAGE, Errors.LENS_SETTING_NOT_FOUND.CODE, {
					lensSettingId,
				}),
			);

		const result = await new postgres.StylStake({
			title,
			lensSettingId,
			stylAmount,
			percent,
			days,
		}).save();

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * update Style Stake
 * @param {*} id
 * @param {*} days
 * @param {*} amount
 * @returns
 */
function editStylStake(data) {
	return new Promise(async (resolve, reject) => {
		const { id, title, lensSettingId, stylAmount, percent, days } = data;

		const currentStylStake = await postgres.StylStake.findByPk(id);
		if (!currentStylStake)
			return reject(
				new NotFoundError(Errors.STYL_STAKE_NOT_FOUND.MESSAGE, Errors.STYL_STAKE_NOT_FOUND.CODE, { id }),
			);

		const newLensSettingId = lensSettingId ? lensSettingId : currentStylStake.lensSettingId;
		if (lensSettingId) {
			const lensSetting = await postgres.LensSetting.findByPk(newLensSettingId, { raw: true });
			if (!lensSetting)
				return reject(
					new NotFoundError(Errors.LENS_SETTING_NOT_FOUND.MESSAGE, Errors.LENS_SETTING_NOT_FOUND.CODE, {
						lensSettingId,
					}),
				);
		}

		const update = {};

		if (title) update.title = title;
		if (lensSettingId) update.lensSettingId = lensSettingId;
		if (stylAmount) update.stylAmount = stylAmount;
		if (percent) update.percent = percent;
		if (days) update.days = days;

		const result = await postgres.StylStake.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * delete StylStake
 * @param {*} id
 * @returns
 */
function deleteStylStake(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.StylStake.destroy({ where: { id } });

		if (!result)
			return reject(
				new HumanError(Errors.STYL_STAKE_NOT_FOUND.MESSAGE, Errors.STYL_STAKE_NOT_FOUND.CODE, { id: id }),
			);

		resolve("Successful");
	});
}

module.exports = {
	getStylStakes,
	getStylStakeById,
	addStylStake,
	editStylStake,
	deleteStylStake,
};
