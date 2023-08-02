const { HumanError, NotFoundError } = require("./errorhandler");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const Errors = require("./errorhandler/MessageText");
const postgres = require("../databases/postgres");

function getOrder(id) {
	return new Promise(async (resolve, reject) => {
		const item = await postgres.UserOrder.findByPk(id, {
			include: [postgres.User, postgres.Plan],
		});

		if (!item)
			return reject(new NotFoundError(Errors.ORDER_NOT_FOUND.MESSAGE, Errors.ORDER_NOT_FOUND.CODE, { id }));

		return resolve(item);
	});
}

function getOrders(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, plan, user, type, status, amount, orderSerial } =
			data;
		const query = {};
		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(
						postgres.sequelize.cast(postgres.sequelize.col("userOrder.id"), "varchar"),
						{
							[postgres.Op.iLike]: `%${searchQuery}%`,
						},
					),
				},
				{ "$plan.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ "$user.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{
					type: postgres.sequelize.where(
						postgres.sequelize.cast(postgres.sequelize.col("userOrder.type"), "varchar"),
						{
							[postgres.Op.iLike]: `%${searchQuery}%`,
						},
					),
				},
				{
					status: postgres.sequelize.where(
						postgres.sequelize.cast(postgres.sequelize.col("userOrder.status"), "varchar"),
						{
							[postgres.Op.iLike]: `%${searchQuery}%`,
						},
					),
				},
			];
		}

		if (id)
			query.id = postgres.sequelize.where(
				postgres.sequelize.cast(postgres.sequelize.col("userOrder.id"), "varchar"),
				{
					[postgres.Op.iLike]: `%${id}%`,
				},
			);
		if (plan) query["$plan.name$"] = { [postgres.Op.iLike]: `%${plan}%` };
		if (user) {
			query[postgres.Op.or] = [{ "$user.name$": { [postgres.Op.iLike]: `%${user}%` } }];
		}

		if (type) query.type = { [postgres.Op.in]: type };
		if (status) query.status = { [postgres.Op.in]: status };
		if (amount) query.amount = { [postgres.Op.in]: amount };
		if (orderSerial) query.orderSerial = { [postgres.Op.iLike]: `%${orderSerial}%` };

		const items = await postgres.UserOrder.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [postgres.User, postgres.Plan],
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
	getOrder,
	getOrders,
};
