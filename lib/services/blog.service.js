

const { postgres } = require("../databases");
const { NotFoundError, HumanError, InvalidRequestError, ConflictError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const Joi = require("joi");
const hooks = require("../hooks");
const { events } = require("../data/constans");
/**
 * Get blogs Data and filter it by id, ...
 * @returns
 * @param data
 */
function get(data) {
	return new Promise(async (resolve, reject) => {
		let {
			title,
			// description, text,
			id,
			category,
			status,
			order,
			page,
			limit,
			lang,
			createdAt,
		} = data;

		let offset = 0 + (page - 1) * limit,
			query = {};

		if (id) query.id = id;

		if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };

		// if (description) query.description = { [postgres.Op.iLike]: "%" + description + "%" };
		//
		// if (text) query.text = { [postgres.Op.iLike]: "%" + text + "%" };

		if (category && category.length) query.categoryId = { [postgres.Op.in]: category };

		if (status && status.length) query.status = status;

		if (createdAt)
			query.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);

		let result = await postgres.Blog.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["createdAt", order]],
			raw: true,
			nest: true,
			include: [
				{
					model: postgres.Category,
					as: "category",
					nested: true,
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						required: false,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { ...(lang && { code: lang }) },
							required: false,
						},
					},
					required: false,
				},
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
					nested: true,
					include: {
						model: postgres.Language,
						as: "language",
						nested: true,
						where: { ...(lang && { code: lang }) },
						required: false,
					},
					required: false,
				},
			],
		});

		resolve({
			total: result.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

function getManager(data, io) {
	return new Promise(async (resolve, reject) => {
		let {
			title,
			// description, text,
			id,
			category,
			status,
			order,
			page,
			limit,
			lang,
			createdAt,
			sort,
			searchQuery,
		} = data;

		let offset = 0 + (page - 1) * limit,
			query = {};
		let query2 = {};

		if (searchQuery) {
			query = {
				[postgres.Op.or]: {
					title: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};

			query2 = {
				[postgres.Op.or]: {
					title: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
		}

		if (id) query.id = id;
		if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };
		if (category) query2.title = category;
		if (status) query.status = status;
		if (createdAt) query.createdAt = createdAt;

		let result = await postgres.Blog.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			raw: true,
			nest: true,
			include: [
				{
					where: query2,
					model: postgres.Category,
					as: "category",
					nested: true,
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						required: false,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { ...(lang && { code: lang }) },
							required: false,
						},
					},
					required: false,
				},
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
					nested: true,
					include: {
						model: postgres.Language,
						as: "language",
						nested: true,
						where: { ...(lang && { code: lang }) },
						required: false,
					},
					required: false,
				},
			],
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
 * Get blog Translation Data and filter it by id, ...
 * @returns
 * @param data
 */
function getBlogtranslation(data) {
	return new Promise(async (resolve, reject) => {
		let { id, title, description, text, order, page, limit, blogId, languageId, createdAt } = data;

		let offset = 0 + (page - 1) * limit,
			query = {};

		if (id) query.id = id;

		if (title) query.title = { [postgres.Op.like]: `%${title}%` };

		if (description) query.description = { [postgres.Op.like]: `%${description}%` };

		if (text) query.text = { [postgres.Op.like]: `%${text}%` };

		if (blogId) query.blogId = blogId;
		if (languageId) query.languageId = languageId;
		if (createdAt)
			query.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);

		let result = await postgres.BlogTranslation.findAndCountAll({
			where: query,
			offset,
			limit,
			order: [["createdAt", order]],
			raw: true,
			nest: true,
			include: [
				{
					model: postgres.Blog,
					as: "blog",
					nested: true,
				},
				{
					model: postgres.Language,
					as: "language",
					nested: true,
				},
			],
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
 * Add blogs
 * @param {*} title
 * @param {*} description
 * @param {*} status
 * @param {*} files
 * @param categoryId
 * @param link
 * @param tag
 * @param videoUrl
 * @param youtubeUrl
 * @returns
 */
function add(status, categoryId, title, description, link, video, tag, text, files) {
	return new Promise(async (resolve, reject) => {
		let data = { images: null, thumbnails: null };

		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				data[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		if (categoryId) {
			const _category = await postgres.Category.findOne({ where: { id: categoryId }, raw: true });
			if (!_category) throw new HumanError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE);
		}

		let result = await postgres.Blog.create({
			status,
			categoryId,
			title,
			description,
			link,
			video,
			tag,
			text,
			...data,
		});

		if (!result) return reject(new HumanError(Errors.BLOG_FAILED.MESSAGE, Errors.BLOG_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * Add blog Translation
 * @param {*} title
 * @param {*} description
 * @param {*} text
 * @param {*} files
 * @param blogId
 * @param languageId
 * @returns
 */
function addBlogTranslation(title, description, text, files, blogId, languageId) {
	return new Promise(async (resolve, reject) => {
		let data = { images: null, thumbnails: null };

		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				data[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		let result = await postgres.BlogTranslation.create({
			title,
			description,
			text,
			blogId,
			languageId,
			...data,
		});

		if (!result) return reject(new HumanError(Errors.BLOG_FAILED.MESSAGE, Errors.BLOG_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * Edit blogs
 * @param {*} id
 * @param {*} status
 * @param {*} categoryId
 * @param title
 * @param description
 * @param text
 * @param link
 * @param tag
 * @param videoUrl
 * @param youtubeUrl
 * @param files
 * @returns
 */
function edit(id, status, categoryId, title, description, text, link, video, tag, files) {
	return new Promise(async (resolve, reject) => {
		let update = { video, link };

		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				update[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		if (categoryId) update.categoryId = categoryId;
		if (status) update.status = status;
		if (title) update.title = title;
		if (text) update.text = text;
		if (description) update.description = description;
		if (tag) update.tag = tag;

		let result = await postgres.Blog.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * Edit blog Translation
 * @param {*} id
 * @param {*} title
 * @param {*} description
 * @param {*} text
 * @param {*} status
 * @param {*} images
 * @param {*} thumbnails
 * @param {*} files
 * @param blogId
 * @param languageId
 * @returns
 */
function editBlogTranslation(id, title, description, text, images, thumbnails, files = {}, blogId, languageId) {
	return new Promise(async (resolve, reject) => {
		let update = {};

		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				update[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		if (title) update.title = title;

		if (description) update.description = description;

		if (text) update.text = text;

		// if (category) update.category = category;

		if (blogId) update.blogId = blogId;

		if (languageId) update.languageId = languageId;

		if (images === "null") update.images = null;

		if (thumbnails === "null") update.thumbnails = null;

		let result = await postgres.BlogTranslation.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * Delete blogs
 * @param {*} id
 * @returns
 */
function del(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Blog.destroy({ where: { id } });

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * Delete blog Translation
 * @param {*} id
 * @returns
 */
function delBlogTranslation(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.BlogTranslation.destroy({ where: { id } });

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * find blog by id
 * @param {*} id
 * @returns
 */
function findById(id, lang) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Blog.findOne({
			where: {
				id,
			},
			include: [
				{
					model: postgres.Category,
					as: "category",
					nested: true,
					include: {
						model: postgres.CategoryTranslation,
						as: "categoryTranslation",
						nested: true,
						required: false,
						include: {
							model: postgres.Language,
							as: "language",
							nested: true,
							where: { ...(lang && { code: lang }) },
							required: false,
						},
					},
				},
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
					nested: true,
					required: false,
					include: {
						model: postgres.Language,
						as: "language",
						nested: true,
						where: { ...(lang && { code: lang }) },
						required: false,
					},
				},
			],
			nest: true,
		});

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}
/**
 * find blog Translation by id
 * @param {*} id
 * @returns
 */
function findBlogTranslationById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.BlogTranslation.findOne({
			where: {
				id,
			},
			include: [
				{
					model: postgres.Blog,
					as: "blog",
					nested: true,
				},
				{
					model: postgres.Language,
					as: "language",
					nested: true,
				},
			],
			nest: true,
		});

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}
/**
 * like blog
 * @param {*} id
 * @returns
 */
function likeBlog(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Blog.update(
			{
				like: postgres.sequelize.literal("like + 1"),
			},
			{
				where: {
					id,
				},
			},
		);

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}

/**
 * get blog lists
 * @returns
 * @param type
 * @param page
 * @param limit
 */
function blogLists(type, page, limit, lang) {
	return new Promise(async (resolve, reject) => {
		let offset = (page - 1) * limit;
		let column = "";
		if (type === "LIKE") column = "likes";
		else if (type === "RECENT") column = "createdAt";
		else column = "id";
		let result = await postgres.Blog.findAndCountAll({
			offset,
			limit,
			order: [[column, "DESC"]],
			include: [
				{
					model: postgres.Category,
					as: "category",
					nested: true,
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
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
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
			],
			nested: true,
		});

		if (!result)
			return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}

/**
 * get related blogs
 * @returns
 * @param id
 */
function relatedBlogs(id) {
	return new Promise(async (resolve, reject) => {
		let blog = await postgres.Blog.findOne({
			where: {
				id,
			},
			include: [
				{
					model: postgres.Category,
					as: "category",
					nested: true,
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
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
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
			],
			nested: true,
		});
		if (!blog) return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));
		let blogs = await postgres.Blog.findAndCountAll({
			where: {
				categoryId: blog.categoryId,
				id: {
					[postgres.Op.ne]: id,
				},
			},
			include: [
				{
					model: postgres.Category,
					as: "category",
					nested: true,
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
				{
					model: postgres.BlogTranslation,
					as: "blogTranslation",
					nested: true,
					include: {
						model: postgres.Language,
						as: "language",
						nested: true,
						where: { code: lang },
						required: false,
					},
				},
			],
			nested: true,
		});

		if (blogs.count <= 5) {
			return resolve(blogs.rows);
		} else {
			let chosenOnes = [];
			let i = 0;
			while (i < 5) {
				const chosen = Math.random() * blogs.count;
				let repeated = false;
				for (let j = 0; j < chosenOnes.length; j++) {
					if (chosen === chosenOnes[j]) {
						repeated = true;
					}
				}
				if (!repeated) {
					chosenOnes.push(chosen);
					i++;
				}
			}
			i = 0;
			let result = [];
			while (i < 5) {
				result.push(blogs[chosenOnes[i]]);
				i++;
			}
			return resolve(result.rows);
		}
		// if (!result)
		// 	return reject(new NotFoundError(Errors.BLOG_NOT_FOUND.MESSAGE, Errors.BLOG_NOT_FOUND.CODE, { id }));
	});
}

async function blogList(id, categoryId, sortBy = "id", sortDirection = "desc", page = 1, lang) {
	if (id) return await postgres.Blog.findOne({ where: { id }, raw: true });

	const where = {
		status: 1,
	};

	if (categoryId) where.categoryId = categoryId;

	const findObject = {
		where,
		limit: 12,
		nest: true,
		offset: (+page - 1) * 12,
		order: [[sortBy, sortDirection]],
		raw: true,
	};

	const data = await postgres.Blog.findAndCountAll({
		...findObject,
		include: [
			{
				model: postgres.Category,
				as: "category",
				nested: true,
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
			{
				model: postgres.BlogTranslation,
				as: "blogTranslation",
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
		],
		nested: true,
	}).catch((error) => {
		console.log(error);
	});

	return {
		total: data.count,
		pageSize: 12,
		page,
		data: data.rows,
	};
}

async function blogUploadImage(req) {
	let file = [];
	if (req.file) {
		file = [
			{
				name: req.file.newName,
				key: req.file.key,
				location: req.file.location,
			},
		];
	}
	return file;
}

/**
 * get active notice list
 * @returns
 */
function getNotices() {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Blog.findAll({
			where: { status: 1 },
			include: [
				{
					model: postgres.Category,
					as: "category",
					where: { title: "Notices" },
					required: true,
				},
			],
		});

		return resolve(result);
	});
}

module.exports = {
	get,
	add,
	edit,
	del,
	findById,
	likeBlog,
	blogLists,
	relatedBlogs,
	getBlogtranslation,
	addBlogTranslation,
	editBlogTranslation,
	findBlogTranslationById,
	delBlogTranslation,
	blogList,
	blogUploadImage,
	getManager,
	getNotices,
};
