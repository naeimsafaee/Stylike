

const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { bonusService } = require("../../services");
const Joi = require("joi");

/**
 * get bonus list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getBonuses = async (req, res) => {
	try {
		const data = await bonusService.getBonuses(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get one bonus
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getBonus = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await bonusService.getBonus(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user bonus list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserBonus = async (req, res) => {
	try {
		const { user, id, type, tier, cardNumber, tokenAmount, page, limit, order, sort, createdAt, q } = req.query;
		const data = await bonusService.getUserBonus(
			user,
			id,
			type,
			tier,
			cardNumber,
			tokenAmount,
			page,
			limit,
			order,
			sort,
			createdAt,
			q,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add bonus
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addBonus = async (req, res) => {
	try {
		const {
			title,
			description,
			firstMember,
			cardTypeId,
			cardTierId,
			cardNumber,
			tokenAmount,
			startAt,
			endAt,
			status,
			type,
		} = req.body;
		const data = await bonusService.addBonus(
			title,
			description,
			firstMember,
			cardTypeId,
			cardTierId,
			cardNumber,
			tokenAmount,
			startAt,
			endAt,
			status,
			type,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit bonus
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editBonus = async (req, res) => {
	try {
		const {
			id,
			title,
			description,
			firstMember,
			cardTypeId,
			cardTierId,
			cardNumber,
			tokenAmount,
			startAt,
			endAt,
			status,
			type,
		} = req.body;
		const data = await bonusService.editBonus(
			id,
			title,
			description,
			firstMember,
			cardTypeId,
			cardTierId,
			cardNumber,
			tokenAmount,
			startAt,
			endAt,
			status,
			type,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete bonus
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.delBonus = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await bonusService.delBonus(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
