const { postgres } = require("../databases");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const { HumanError, InternalError, NotFoundError, NotAuthenticatedError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");

exports.createSignal = (data) => {
	return new Promise(async (resolve, reject) => {
		const { title, description, isPrivate } = data;

		const existSignal = await postgres.Signal.findOne({ where: { title }, raw: true });
		if (existSignal) {
			return reject(new HumanError(Errors.DUPLICATE_SIGNAL.MESSAGE, Errors.DUPLICATE_SIGNAL.CODE, { title }));
		}

		const newSignal = await new postgres.Signal({ title, description, isPrivate }).save();
		if (!newSignal) {
			return reject(new InternalError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));
		}

		return resolve("Success");
	});
};

exports.editSignal = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id, title, description, isPrivate } = data;

		const currentSignal = await postgres.Signal.findByPk(id);
		if (!currentSignal) {
			return reject(new NotFoundError(Errors.SIGNAL_NOT_FOUND.MESSAGE, Errors.SIGNAL_NOT_FOUND.CODE, { id }));
		}

		const existSignal = await postgres.Signal.findOne({
			where: { title, id: { [postgres.Op.ne]: id } },
			raw: true,
		});

		if (existSignal) {
			return reject(new HumanError(Errors.DUPLICATE_SIGNAL.MESSAGE, Errors.DUPLICATE_SIGNAL.CODE, { title }));
		}

		const updateData = {};

		if (title) updateData.title = title;
		if (description) updateData.description = description;
		if (typeof isPrivate === "boolean") updateData.isPrivate = isPrivate;

		const updatedSignal = await currentSignal.update(updateData);

		if (!updatedSignal) {
			return reject(new InternalError(Errors.SIGNAL_UPDATE_FAILED.MESSAGE, Errors.SIGNAL_UPDATE_FAILED.CODE));
		}

		return resolve("Success");
	});
};

exports.deleteSignal = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentSignal = await postgres.Signal.findByPk(id);
		if (!currentSignal) {
			return reject(new NotFoundError(Errors.SIGNAL_NOT_FOUND.MESSAGE, Errors.SIGNAL_NOT_FOUND.CODE, { id }));
		}

		const deletedSignal = await currentSignal.destroy();

		return resolve(deletedSignal);
	});
};

exports.getSignal = (data, user) => {
	return new Promise(async (resolve, reject) => {
		console.log(data);
		const { id } = data;

		const currentSignal = await postgres.Signal.findOne({ where: { id } });
		if (!currentSignal) {
			return reject(new NotFoundError(Errors.SIGNAL_NOT_FOUND.MESSAGE, Errors.SIGNAL_NOT_FOUND.CODE, { id }));
		}

		if (currentSignal.isPrivate) {
			if (!user) {
				return reject(new NotAuthenticatedError(Errors.UNAUTHORIZED.CODE, Errors.UNAUTHORIZED.MESSAGE));
			}
			const subscription = await postgres.UserSubscription.findOne({
				where: { userId: user.id, end: { [postgres.Op.gt]: Date.now() } },
				raw: true,
			});

			if (!subscription) {
				return reject(
					new NotAuthenticatedError(Errors.SUBSCRIPTION_NEEDED.CODE, Errors.SUBSCRIPTION_NEEDED.MESSAGE),
				);
			}
		}

		return resolve(currentSignal);
	});
};

exports.getSignals = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, title, description } = data;

		const query = {
			isPrivate: { [postgres.Op.in]: [false] },
		};

		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${searchQuery}%`,
			});
		if (title) query.title = { [postgres.Op.iLike]: `%${title}%` };
		if (description) query.description = { [postgres.Op.iLike]: `%${description}%` };

		if (user) {
			const subscription = await postgres.UserSubscription.findOne({
				where: { userId: user.id, end: { [postgres.Op.gt]: Date.now() } },
				raw: true,
			});

			if (subscription) query.isPrivate = { [postgres.Op.in]: [false, true] };
		}

		const items = await postgres.Signal.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
		});

		resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
		return resolve(items);
	});
};

exports.getSignalByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentSignal = await postgres.Signal.findByPk(id);
		if (!currentSignal) {
			return reject(new NotFoundError(Errors.SIGNAL_NOT_FOUND.MESSAGE, Errors.SIGNAL_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentSignal);
	});
};

exports.getSignalsByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, title, description, isPrivate } = data;

		const query = {};
		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query.$or = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${id}%`,
			});
		if (title) query.title = { [postgres.Op.iLike]: `%${title}%` };
		if (description) query.description = { [postgres.Op.iLike]: `%${description}%` };
		if (isPrivate) query.isPrivate = { [postgres.Op.in]: isPrivate };

		const items = await postgres.Signal.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
		});

		resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
		return resolve(items);
	});
};
