const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const postgres = require("../databases/postgres");

function addContactUs(title, description, email) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.ContactUs.create({
			title,
			description,
			email,
		});

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

function deleteContactUs(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.ContactUs.destroy({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.CONTACT_US_NOT_FOUND.MESSAGE, Errors.CONTACT_US_NOT_FOUND.CODE, { id }),
			);

		return resolve("Successful");
	});
}

async function getOneContactUs(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.ContactUs.findOne({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.CONTACT_US_NOT_FOUND.MESSAGE, Errors.CONTACT_US_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

function getAllContactUs(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, order, sort, title, description, email, searchQuery } = data;

		const query = {};

		const offset = (page - 1) * limit;

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ email: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (title) query.title = { [postgres.Op.iLike]: `%${title}%` };
		if (email) query.email = { [postgres.Op.iLike]: `%${email}%` };
		if (description) query.description = { [postgres.Op.iLike]: `%${description}%` };

		const items = await postgres.ContactUs.findAndCountAll({
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
	addContactUs,
	deleteContactUs,
	getOneContactUs,
	getAllContactUs,
};
