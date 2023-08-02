const { HumanError, NotFoundError } = require("./errorhandler");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const Errors = require("./errorhandler/MessageText");
const postgres = require("../databases/postgres");

function addPlan(data) {
	return new Promise(async (resolve, reject) => {
		const existType = await postgres.Plan.findOne({
			where: {
				[postgres.Op.and]: [
					{ type: { [postgres.Op.ne]: "CUSTOM" } },
					{ days: data.days },
					{ currency: data.currency },
					{ price: data.price },
				],
			},
		});
		if (existType)
			return reject(
				new HumanError(Errors.PLAN_DUPLICATE.MESSAGE, Errors.PLAN_DUPLICATE.CODE, {
					type: data.type,
					days: data.days,
					currency: data.currency,
					price: data.price,
				}),
			);

		const existName = await postgres.Plan.findOne({ where: { name: data.name } });
		if (existName)
			return reject(
				new HumanError(Errors.PLAN_DUPLICATE.MESSAGE, Errors.PLAN_DUPLICATE.CODE, { name: data.name }),
			);

		if (data.type !== "CUSTOM") {
			data.customFeatures = {};
		}

		if (data.type === "CUSTOM" && !data.customFeatures?.userId) {
			return reject(
				new HumanError(
					Errors.PLAN_NO_USER_CUSTOM_SUBSCRIPTION.MESSAGE,
					Errors.PLAN_NO_USER_CUSTOM_SUBSCRIPTION.CODE,
				),
			);
		}

		const item = await new postgres.Plan(data).save();

		if (!item) return reject(new HumanError(Errors.PLAN_CREATE_FAILED.MESSAGE, Errors.PLAN_CREATE_FAILED.CODE));

		return resolve("Successful");
	});
}

function editPlan(data) {
	return new Promise(async (resolve, reject) => {
		const item = await postgres.Plan.findByPk(data.id);
		if (!item) {
			return reject(
				new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { id: data.id }),
			);
		}

		const existItem = await postgres.Plan.findOne({
			where: {
				id: { [postgres.Op.ne]: data.id },
				[postgres.Op.and]: [
					{ type: { [postgres.Op.ne]: "CUSTOM" } },
					{ type: data.type },
					{ days: data.days },
					{ currency: data.currency },
					{ price: data.price },
				],
			},
		});
		if (existItem)
			return reject(
				new HumanError(Errors.PLAN_DUPLICATE.MESSAGE, Errors.PLAN_DUPLICATE.CODE, {
					type: data.type,
					days: data.days,
					currency: data.currency,
					price: data.price,
				}),
			);

		const existName = await postgres.Plan.findOne({
			where: { id: { [postgres.Op.ne]: data.id }, name: data.name },
		});
		if (existName)
			return reject(
				new HumanError(Errors.PLAN_DUPLICATE.MESSAGE, Errors.PLAN_DUPLICATE.CODE, { name: data.name }),
			);

		if (data.type === "CUSTOM" && !data.customFeatures.userId) {
			return reject(
				new HumanError(
					Errors.PLAN_NO_USER_CUSTOM_SUBSCRIPTION.MESSAGE,
					Errors.PLAN_NO_USER_CUSTOM_SUBSCRIPTION.CODE,
				),
			);
		}

		if (data.type !== "CUSTOM") {
			delete data.customFeatures;
		}

		const updatedItem = await item.update(data);

		if (!updatedItem)
			return reject(new HumanError(Errors.PLAN_UPDATE_FAILED.MESSAGE, Errors.PLAN_UPDATE_FAILED.CODE));

		return resolve("Successful");
	});
}

function deletePlan(id) {
	return new Promise(async (resolve, reject) => {
		const item = await postgres.Plan.destroy({ where: { id } });

		if (!item) return reject(new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

function getOnePlan(id) {
	return new Promise(async (resolve, reject) => {
		const item = await postgres.Plan.findByPk(id);

		if (!item) return reject(new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { id }));

		return resolve(item);
	});
}

function getAllPlan(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, period } = data;

		const query = {};

		const offset = (page - 1) * limit;

		if (period === "yearly") query.days = { [postgres.Op.gte]: 365 };
		if (period === "monthly") query.days = { [postgres.Op.gte]: 29, [postgres.Op.lte]: 31 };

		const items = await postgres.Plan.findAndCountAll({
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
}

function getOnePlanByManager(id) {
	return new Promise(async (resolve, reject) => {
		const item = await postgres.Plan.findByPk(id);

		if (!item) return reject(new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { id }));

		return resolve(item);
	});
}

function getAllPlanByManager(data) {
	return new Promise(async (resolve, reject) => {
		const {
			page,
			limit,
			sort,
			order,
			createdAt,
			id,
			searchQuery,
			name,
			type,
			days,
			transactions,
			currency,
			price,
		} = data;

		const query = {};
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
				{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{
					type: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("type"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{
					currency: postgres.sequelize.where(
						postgres.sequelize.cast(postgres.sequelize.col("currency"), "varchar"),
						{
							[postgres.Op.iLike]: `%${searchQuery}%`,
						},
					),
				},
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${id}%`,
			});
		if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
		// if (description) query.description = { [postgres.Op.iLike]: `%${description}%` };
		if (days) query.days = { [postgres.Op.gte]: days };
		if (type) query.type = { [postgres.Op.in]: type };
		if (currency) query.currency = { [postgres.Op.in]: currency };
		if (transactions) query.transactions = { [postgres.Op.gte]: transactions };
		if (price) query.price = { [postgres.Op.gte]: price };

		const items = await postgres.Plan.findAndCountAll({
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
}

module.exports = {
	addPlan,
	editPlan,
	deletePlan,
	getOnePlan,
	getAllPlan,
	getOnePlanByManager,
	getAllPlanByManager,
};
