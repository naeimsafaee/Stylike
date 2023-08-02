

const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { blogService } = require("../../services");

/**
 * Get blogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getBlogs = async (req, res) => {
	try {
		const data = await blogService.get(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Get blogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getBlogsManager = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await blogService.getManager(req.query, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Get blog Translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getBlogsTranslation = async (req, res) => {
	try {
		const data = await blogService.getBlogtranslation(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * search in blogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.searchBlogs = async (req, res) => {
	try {
		const data = await blogService.get(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add blog
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addBlogs = async (req, res) => {
	try {
		const { status, categoryId, title, description, link, video, tag, text } = req.body;
		const data = await blogService.add(status, categoryId, title, description, link, video, tag, text, req.files);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add blog translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addBlogsTranslation = async (req, res) => {
	try {
		const { title, description, text, blogId, languageId } = req.body;
		const data = await blogService.addBlogTranslation(title, description, text, req.files, blogId, languageId);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit blogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editBlogs = async (req, res) => {
	try {
		const { id, status, categoryId, title, description, text, link, video, tag } = req.body;
		const data = await blogService.edit(
			id,
			status,
			categoryId,
			title,
			description,
			text,
			link,
			video,
			tag,
			req.files,
		);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit blog Translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editBlogTranslation = async (req, res) => {
	try {
		const { id, title, description, text, images, thumbnails, blogId, languageId } = req.body;
		const data = await blogService.editBlogTranslation(
			id,
			title,
			description,
			text,
			images,
			thumbnails,
			req.files,
			blogId,
			languageId,
		);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete blogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteBlogs = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await blogService.del(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete blogTranslation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteBlogTranslation = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await blogService.delBlogTranslation(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * find blog by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findById = async (req, res) => {
	try {
		const { id } = req.params;
		const { lang } = req.query;

		const data = await blogService.findById(id, lang);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * find blog Translation by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findByIBlogTransaltion = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await blogService.findBlogTranslationById(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.likeBlog = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await blogService.likeBlog(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.blogLists = async (req, res) => {
	try {
		const { type, page, limit, lang } = req.query;
		const data = await blogService.blogLists(type, page, limit, lang);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get relatedBlogs
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.relatedBlogs = async (req, res) => {
	try {
		const { id, lang } = req.query;
		const data = await blogService.relatedBlogs(id, lang);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

//? Uplad blog files
exports.blogUploadImage = async (req, res) => {
	try {
		const data = await blogService.blogUploadImage(req);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
