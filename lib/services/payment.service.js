
const { postgres } = require("../databases");
const { password } = require("./../utils");
const { HumanError, NotFoundError } = require("../services/errorhandler");
const Errors = require("./errorhandler/MessageText");

/**
 * Get user payment Data and filter it by id, ...
 * @param {*} id
 * @param {*} userId
 * @param {*} amount
 * @param {*} currency
 * @param {*} gateway
 * @param {*} token
 * @param {*} resNum
 * @param {*} customerRefNum
 * @param {*} refNum
 * @param {*} traceNo
 * @param {*} cardMaskPan
 * @param {*} status
 * @param {*} fromDate
 * @param {*} toDate
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @returns
 */
function get(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			userId,
			assetId,
			amount,
			currency,
			gateway,
			token,
			resNum,
			customerRefNum,
			refNum,
			traceNo,
			cardMaskPan,
			status,
			fromDate,
			toDate,
			page,
			limit,
			order,
		} = data;

		let offset = 0 + (page - 1) * limit,
			query = {};

		if (id) query.id = id;

		if (userId) query.userId = userId;
		if (assetId) query.assetId = assetId;
		if (amount)
			query.amount = postgres.sequelize.where(
				postgres.sequelize.cast(postgres.sequelize.col("amount"), "varchar"),
				{ [postgres.Op.iLike]: `%${amount}%` },
			);

		if (currency) query.currency = { [postgres.Op.like]: `%${currency}%` };

		if (gateway) query.gateway = { [postgres.Op.like]: `%${gateway}%` };

		if (token) query.token = { [postgres.Op.like]: `%${token}%` };

		if (resNum) query.resNum = { [postgres.Op.like]: `%${resNum}%` };

		if (customerRefNum) query.customerRefNum = { [postgres.Op.like]: `%${customerRefNum}%` };

		if (refNum) query.refNum = { [postgres.Op.like]: `%${refNum}%` };

		if (traceNo) query.traceNo = { [postgres.Op.like]: `%${traceNo}%` };

		if (cardMaskPan) query.cardMaskPan = { [postgres.Op.like]: `%${cardMaskPan}%` };

		if (status && status.length) query.status = status;

		if (fromDate || toDate) query.createdAt = {};

		if (fromDate) query.createdAt[postgres.Op.gte] = fromDate;

		if (toDate) query.createdAt[postgres.Op.lte] = toDate;

		let result = await postgres.UserPayment.findAndCountAll({
			where: query,
			offset,
			limit,
			order: [["createdAt", order]],
			nest: true,
			include: [
				{
					model: postgres.User,
					as: "user",
					attributes: { exclude: ["password", "salt"] },
				},
				{
					model: postgres.Asset,
					as: "asset",
				},
			],
			raw: true,
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
 * Find PaymentById
 * @param {*} id
 * @returns
 */
function findPaymentById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.UserPayment.findOne({
			where: {
				id,
			},
			order: [["createdAt"]],
			include: [
				{
					model: postgres.User,
					as: "user",
					attributes: { exclude: ["password", "salt"] },
				},
				{
					model: postgres.Asset,
					as: "asset",
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * update payment
 * @param {*} id
 * @param {*} playerId
 * @param {*} type
 * @param {*} tier
 * @param {*} status
 * @param {*} initialNumber
 * @param {*} bonus
 * @param {*} files
 * @returns
 */
function editPayments(
	id,
	userId,
	amount,
	currency,
	gateway,
	token,
	resNum,
	customerRefNum,
	refNum,
	traceNo,
	cardMaskPan,
	status,
) {
	return new Promise(async (resolve, reject) => {
		const payment = await postgres.UserPayment.findOne({ where: { id }, raw: true });

		let update = {};

		if (userId) update.userId = userId;

		if (amount) update.amount = amount;

		if (currency) update.currency = currency;

		if (gateway) update.currency = gateway;

		if (token) update.token = token;

		if (resNum) update.resNum = resNum;

		if (customerRefNum) update.customerRefNum = customerRefNum;

		if (refNum) update.refNum = refNum;

		if (traceNo) update.traceNo = traceNo;

		if (cardMaskPan) update.cardMaskPan = cardMaskPan;

		if (status) update.status = status;

		let result = await postgres.UserPayment.update(update, {
			where: { id },
		});

		if (!result.shift())
			return reject(new NotFoundError(Errors.PAYMENT_NOT_FOUND.MESSAGE, Errors.PAYMENT_NOT_FOUND.CODE));

		// if (payment.status == 0 && payment.type == "WITHDRAW") {
		// 	const masterUserId = config.get("masterUserId");

		// 	const wallet = await postgres.UserWallet.findOne({
		// 		where: {
		// 			userId: payment.userId,
		// 			assetId: payment.assetId,
		// 		},
		// 		raw: true,
		// 	});

		// 	if (status == 1) {
		// 		await postgres.UserWallet.increment({ pending: -payment.assetAmount }, { where: { id: wallet.id } });
		// 		await postgres.UserWallet.increment(
		// 			{ amount: +payment.assetAmount },
		// 			{ where: { userId: masterUserId, assetId: wallet.assetId } },
		// 		);
		// 	} else if (status == -1) {
		// 		await postgres.UserWallet.increment(
		// 			{ pending: -payment.assetAmount, amount: +payment.assetAmount },
		// 			{ where: { id: wallet.id } },
		// 		);
		// 	}
		// }

		return resolve("Successful");
	});
}

///////////////////////////////// Payment Terms CRUD /////////////////////////////////////////////////
/**
 * Add PaymentTerms
 * @param {*} data
 * @param files
 * @returns
 */
function addPaymentTerms(data, files) {
	return new Promise(async (resolve, reject) => {
		let icon = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				icon[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const dataForCreate = {
			partner: data.partner,
			assetId: data.assetId,
			fiat: data.fiat,
			price: data.price,
			rate: data.rate,
			min: data.min,
			max: data.max,
			isActive: data.isActive,
			methods: JSON.parse(data.methods),
		};

		let result = await postgres.PaymentTerm.create({
			...dataForCreate,
			...icon,
		});

		if (!result)
			return reject(
				new HumanError(Errors.PAYMENT_TERM_CREATION_FAILED.MESSAGE, Errors.PAYMENT_TERM_CREATION_FAILED.CODE),
			);

		return resolve(result);
	});
}

/**
 * Edit PaymentTerms
 * @param {*} data
 * @returns
 */
function editPaymentTerms(data, files) {
	return new Promise(async (resolve, reject) => {
		let icon = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				icon[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const dataForUpdate = {
			partner: data.partner,
			assetId: data.assetId,
			fiat: data.fiat,
			price: data.price,
			rate: data.rate,
			min: data.min,
			max: data.max,
			isActive: data.isActive,
			methods: JSON.parse(data.methods),
		};

		let result = await postgres.PaymentTerm.update(
			{
				...dataForUpdate,
				...icon,
			},
			{
				where: { id: data.id },
			},
		);

		if (!result.shift())
			return reject(
				new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE, {
					id: data.id,
				}),
			);

		return resolve("Successful");
	});
}

/**
 * Get PaymentTerms
 * @param {*} data
 * @returns
 */
function getPaymentTerms(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			page,
			limit,
			order,
			partner,
			type,
			assetId,
			fiat,
			price,
			rate,
			min,
			max,
			methods,
			isActive,
			sort,
			searchQuery,
			createdAt,
		} = data;

		let result = {},
			query = {},
			offset = (page - 1) * limit;

		if (searchQuery)
			query = {
				[postgres.Op.or]: {
					partner: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};

		if (id) query.id = id;

		if (partner) query.partner = { [postgres.Op.iLike]: "%" + partner + "%" };

		if (type) query.type = { [postgres.Op.iLike]: "%" + type + "%" };

		if (assetId) query.assetId = { [postgres.Op.iLike]: "%" + assetId + "%" };

		if (fiat) query.fiat = { [postgres.Op.iLike]: "%" + fiat + "%" };

		if (price) query.price = { [postgres.Op.iLike]: "%" + price + "%" };

		if (rate) query.rate = { [postgres.Op.iLike]: "%" + rate + "%" };

		if (min) query.min = { [postgres.Op.iLike]: "%" + min + "%" };

		if (max) query.max = { [postgres.Op.iLike]: "%" + max + "%" };

		// if (methods) query.rate = { [postgres.Op.iLike]: "%" + rate + "%" }; TODO: fix the search in it

		if (typeof isActive === "boolean") query.isActive = isActive;

		if (createdAt)
			query.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);

		result = await postgres.PaymentTerm.findAndCountAll({
			where: query,
			limit,
			offset,
			nest: true,
			order: [[sort, order]],
			include: [
				{
					model: postgres.Asset,
					as: "asset",
					nested: true,
				},
			],
			raw: true,
		});

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * Find PaymentTermById
 * @param {*} id
 * @returns
 */
function findPaymentTermById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.PaymentTerm.findByPk(id);

		if (!result)
			return reject(
				new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * delete PaymentTerm
 * @param {*} id
 * @returns
 */
function deletePaymentTerm(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.PaymentTerm.destroy({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE, { id }),
			);

		return resolve("Successful");
	});
}

module.exports = {
	get,
	findPaymentById,
	editPayments,
	addPaymentTerms,
	editPaymentTerms,
	getPaymentTerms,
	findPaymentTermById,
	deletePaymentTerm,
};
