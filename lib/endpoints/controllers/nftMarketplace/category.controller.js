const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");

const { categoryService } = require("../../../services/nftMarketplace");

exports.addCategory = async (req, res) => {
	const { title, description, type } = req.body;
	const data = await categoryService.addCategory(title, description, type, req.files);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getCategories = async (req, res) => {
	const { page, limit, order, sort, title, description, createdAt, type } = req.query;
	const data = await categoryService.getCategories(page, limit, order, sort, title, description, createdAt, type);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getCategory = async (req, res) => {
	const { id } = req.params;
	const data = await categoryService.getCategory(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.editCategory = async (req, res) => {
	const { id, title, description, type } = req.body;
	const data = await categoryService.editCategory(id, title, description, type, req.files);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.deleteCategory = async (req, res) => {
	const { id } = req.params;
	const data = await categoryService.deleteCategory(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.categorySelector = async (req, res) => {
	const { page, limit, order, sort, searchQuery } = req.query;
	const data = await categoryService.categorySelector(page, limit, order, sort, searchQuery);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getCategoriesByManager = async (req, res) => {
	const data = await categoryService.getCategoriesByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getCategoryByManager = async (req, res) => {
	const { id } = req.params;
	const data = await categoryService.getCategoryByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.categorySelectorByManager = async (req, res) => {
	const data = await categoryService.categorySelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
