const { NotAuthenticatedError, HumanError, NotFoundError } = require("./errorhandler");

const Errors = require("./errorhandler/MessageText");

const { postgres, redis } = require("./../databases");

const dataTypes = require("./../data/constans");

const em = require("exact-math");

const { sequelize, Op } = require("../databases/postgres");

const moment = require("moment");

async function addCategory(service, parent, type, title, description, files) {
	return new Promise(async (resolve, reject) => {
		let imagesData = { images: null };
		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();
				imagesData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		if (parent) {
			const _parent = await postgres.Category.findOne({ where: { id: parent }, raw: true });

			if (!_parent) throw new HumanError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE);
		}

		const _category = await postgres.Category.build({
			...imagesData,

			...(service && { service: service }),
			...(title && { title: title }),
			...(description && { description: description }),
			...(parent && { parent: parent }),

			...(type && { type: type }),
		}).save();

		resolve("Successful");
	});
}

async function addCategoryTranslation(title, description, categoryId, languageId, files) {
	return new Promise(async (resolve, reject) => {
		let imagesData = { images: null };
		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();
				imagesData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const _categoryTranslation = await postgres.CategoryTranslation.build({
			title,

			...imagesData,

			...(description && { description: description }),
			...(categoryId && { categoryId: categoryId }),
			...(languageId && { languageId: languageId }),
		}).save();

		resolve("Successful");
	});
}

function getCategories(page, limit, id, title, service, parent, type, createdAt, searchQuery, sort, order) {
	return new Promise(async (resolve, reject) => {
		let offset = (page - 1) * limit;
		let where = {
			...(id && { id }),
			...(title && { title }),
			...(service && { service: service }),
			...(parent && { parent: parent }),
			...(type && { type: type }),
			...(createdAt && { createdAt: createdAt }),
		};
		if (parent === 0) where.parent = null;
		if (searchQuery) {
			where = {
				[postgres.Op.or]: [{ title: { [postgres.Op.like]: "%" + searchQuery + "%" } }],
			};
		}
		const _categories = await postgres.Category.findAndCountAll({
			where,
			limit,

			offset,
			order: [[sort, order]],
			include: [
				{
					model: postgres.Category,
					as: "children",
				},
			],
		});

		for (let i = 0; i < _categories.rows.length; i++) {
			_categories.rows[i] = await getParentsRecursive(_categories.rows[i], "en");

			_categories.rows[i] = await getChildRecursive(_categories.rows[i], "en");
		}

		resolve({
			total: _categories.count ?? 0,

			pageSize: limit,

			page,

			data: _categories.rows,
		});
	});
}

function getCategoriesTranslation(page, limit, order, title, description, categoryId, languageId, createdAt) {
	return new Promise(async (resolve, reject) => {
		let offset = (page - 1) * limit;
		let where = {
			...(title && { title: title }),
			...(description && { description: description }),
			...(categoryId && { categoryId: categoryId }),
			...(languageId && { languageId: languageId }),
		};

		if (createdAt)
			where.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);
		const _categoriesTranslation = await postgres.CategoryTranslation.findAndCountAll({
			where,
			limit,
			offset,
			order: [["createdAt", order]],
			nest: true,
			raw: true,
			include: [
				{
					model: postgres.Category,

					as: "category",
				},
				{
					model: postgres.Language,

					as: "language",
				},
			],
		});

		resolve({
			total: _categoriesTranslation.count ?? 0,

			pageSize: limit,

			page,

			data: _categoriesTranslation.rows,
		});
	});
}

function getCategoriesPublic(page, limit, service, parent, type, lang) {
	return new Promise(async (resolve, reject) => {
		let offset = (page - 1) * limit;
		let where = {
			...(service && { service: service }),
			...(parent && { parent: parent }),
			...(type && { type: type }),
		};
		if (parent === 0) where.parent = null;
		const _categories = await postgres.Category.findAndCountAll({
			where,
			limit,

			offset,
			order: [["id", "DESC"]],
			include: [
				{
					model: postgres.CategoryTranslation,
					as: "categoryTranslation",
					nested: true,
					required: false,
					include: {
						model: postgres.Language,
						as: "language",
						nested: true,
						where: { code: lang },
						required: false,
					},
				},
				{
					model: postgres.Category,
					as: "children",
					nested: true,
					required: false,
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { code: lang },
							required: false,
						},
					},
				},
			],
		});

		for (let i = 0; i < _categories.rows.length; i++) {
			_categories.rows[i] = await getParentsRecursive(_categories.rows[i]);

			_categories.rows[i] = await getChildRecursive(_categories.rows[i]);
		}

		resolve({
			total: _categories.count ?? 0,

			pageSize: limit,

			page,

			data: _categories.rows,
		});
	});
}

async function getCategory(id) {
	return new Promise(async (resolve, reject) => {
		let _category = await postgres.Category.findOne({
			where: {
				id,
			},

			include: [
				{
					model: postgres.Category,

					as: "children",
				},
			],
		});
		if (!_category)
			throw new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE, { id });
		_category = await getParentsRecursive(_category);

		_category = await getChildRecursive(_category);

		resolve(_category);
	});
}

async function getCategoryTranslation(id) {
	return new Promise(async (resolve, reject) => {
		let _category = await postgres.CategoryTranslation.findOne({
			where: {
				id,
			},

			include: [
				{
					model: postgres.Category,

					as: "category",
				},
				{
					model: postgres.Language,

					as: "language",
				},
			],
		});

		resolve(_category);
	});
}

async function getCategoryPublic(id, lang) {
	return new Promise(async (resolve, reject) => {
		let _category = await postgres.Category.findOne({
			where: {
				id,
			},

			include: [
				{
					model: postgres.Category,

					as: "children",
					required: false,
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						required: false,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { code: lang },
							required: false,
						},
					},
				},
			],
		});

		_category = await getParentsRecursive(_category, lang);

		_category = await getChildRecursive(_category, lang);

		resolve(_category);
	});
}

async function editCategory(id, service, parent, type, title, description, files) {
	return new Promise(async (resolve, reject) => {
		let imagesData = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				imagesData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const result = await postgres.Category.update(
			{
				...imagesData,

				...(service && { service: service }),
				...(title && { title: title }),
				...(description && { description: description }),
				...(parent && { parent: parent }),

				...(type && { type: type }),
			},

			{
				where: { id },
			},
		);

		if (!result.shift())
			throw new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE, { id });

		resolve("Successful");
	});
}

async function editCategoryTranslation(id, title, description, categoryId, languageId, files) {
	return new Promise(async (resolve, reject) => {
		let imagesData = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				imagesData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const result = await postgres.CategoryTranslation.update(
			{
				...imagesData,

				...(description && { description: description }),
				...(categoryId && { categoryId: categoryId }),
				...(languageId && { languageId: languageId }),

				...(title && { title: title }),
			},

			{
				where: { id },
			},
		);

		if (!result.shift())
			throw new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE, { id });

		resolve("Successful");
	});
}

function deleteCategory(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.Category.destroy({ where: { id } });

		if (!result) throw new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE, { id });

		resolve("Successful");
	});
}

function deleteCategoryTranslation(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.CategoryTranslation.destroy({ where: { id } });

		if (!result) throw new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE, { id });

		resolve("Successful");
	});
}

function categorySelector(page, limit, order, searchQuery, service, type) {
	return new Promise(async (resolve, reject) => {
		let query = {};

		if (searchQuery) {
			query = {
				[postgres.Op.or]: {
					title: { [postgres.Op.iLike]: "%" + searchQuery + "%" },

					description: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},

				service,
				type,
			};
		} else {
			query = {};
		}

		let result,
			offset = (page - 1) * limit;

		result = await postgres.Category.findAndCountAll({
			where: query,

			limit,

			offset,

			order: [["createdAt", order]],

			include: [
				{
					model: postgres.Category,

					as: "children",
				},
			],
		});

		for (let i = 0; i < result.rows.length; i++) {
			result.rows[i] = await getParentsRecursive(result.rows[i]);

			result.rows[i] = await getChildRecursive(result.rows[i]);
		}

		resolve({
			total: result.count ?? 0,

			pageSize: limit,

			page,

			data: result.rows,
		});
	});
}

function categorySelectorPublic(page, limit, order, searchQuery, service, type, lang) {
	return new Promise(async (resolve, reject) => {
		let query = {};

		if (searchQuery) {
			query = {
				[postgres.Op.or]: {
					title: { [postgres.Op.iLike]: "%" + searchQuery + "%" },

					description: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},

				service,
				type,
			};
		} else {
			query = {};
		}

		let result,
			offset = (page - 1) * limit;

		result = await postgres.Category.findAndCountAll({
			where: query,

			limit,

			offset,

			order: [["createdAt", order]],

			include: [
				{
					model: postgres.Category,

					as: "children",
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						required: false,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { code: lang },
							required: false,
						},
					},
				},
			],
		});

		for (let i = 0; i < result.rows.length; i++) {
			result.rows[i] = await getParentsRecursive(result.rows[i], lang);

			result.rows[i] = await getChildRecursive(result.rows[i], lang);
		}

		resolve({
			total: result.count ?? 0,

			pageSize: limit,

			page,

			data: result.rows,
		});
	});
}

const getParentsRecursive = async (category, lang = "en") => {
	category.parent = await postgres.Category.findOne({
		where: {
			id: category.parent,
		},
		include: {
			model: postgres.CategoryTranslation,
			as: "categoryTranslation",
			nested: true,
			include: {
				model: postgres.Language,
				as: "language",
				nested: true,
				where: { code: lang },
			},
		},
		raw: true,
	});

	return category;
};

const getChildRecursive = async (category, lang = "en") => {
	if (category.children)
		for (let i = 0; i < category.children.length; i++) {
			category.children[i] = await postgres.Category.findOne({
				where: {
					id: category.children[i].id,
				},

				include: [
					{
						model: postgres.Category,

						as: "children",
						include: {
							model: postgres.CategoryTranslation,
							as: "categoryTranslation",
							nested: true,
							include: {
								model: postgres.Language,
								as: "language",
								nested: true,
								where: { code: lang },
							},
						},
					},
				],
			});

			if (category.children[i].children) {
				await getChildRecursive(category.children[i].children, lang);
			}
		}

	return category;
};

module.exports = {
	addCategory,
	addCategoryTranslation,
	getCategories,
	getCategoriesTranslation,
	getCategoriesPublic,

	getCategory,
	getCategoryPublic,
	getCategoryTranslation,

	editCategory,
	editCategoryTranslation,
	deleteCategory,
	deleteCategoryTranslation,

	categorySelector,
	categorySelectorPublic,
};
