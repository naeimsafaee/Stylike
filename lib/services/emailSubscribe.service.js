const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");

function addEmailSubscribe(email) {
	return new Promise(async (resolve, reject) => {
		const existSubscribe = await postgres.EmailSubscribe.findOne({ where: { email } });
		if (existSubscribe) {
			return reject(new HumanError(Errors.DUPLICATE_SUBSCRIBE.MESSAGE, 400));
		}

		const result = await postgres.EmailSubscribe.create({ email });

		if (!result) return reject(new HumanError(Errors.SUBSCRIBE_FAILED.MESSAGE, Errors.SUBSCRIBE_FAILED.CODE));

		resolve("Successful");
	});
}

function deleteEmailSubscribe(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.EmailSubscribe.destroy({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.SUBSCRIBE_NOT_FOUND.MESSAGE, Errors.SUBSCRIBE_NOT_FOUND.CODE, { id }),
			);

		return resolve("Successful");
	});
}

async function getOneEmailSubscribe(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.EmailSubscribe.findByPk(id, { raw: true });

		if (!result)
			return reject(
				new NotFoundError(Errors.SUBSCRIBE_NOT_FOUND.MESSAGE, Errors.SUBSCRIBE_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

function getAllEmailSubscribe(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, order, sort, email, searchQuery } = data;

		const query = {};

		const offset = (page - 1) * limit;

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ email: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (email) query.email = { [postgres.Op.iLike]: `%${email}%` };

		const items = await postgres.EmailSubscribe.findAndCountAll({
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
	addEmailSubscribe,
	deleteEmailSubscribe,
	getOneEmailSubscribe,
	getAllEmailSubscribe,
};
