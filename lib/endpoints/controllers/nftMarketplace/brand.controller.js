const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { brandService } = require("../../../services/nftMarketplace");

exports.addBrand = async (req, res) => {
	const { title, link } = req.body;
	const data = await brandService.addBrand(title, link, req.files);
	return response({ res, statusCode: httpStatus.CREATED, data });
};

exports.editBrand = async (req, res) => {
	const { id, title, link } = req.body;
	const data = await brandService.editBrand(id, title, link, req.files);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.deleteBrand = async (req, res) => {
	const { id } = req.params;
	const data = await brandService.deleteBrand(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getBrand = async (req, res) => {
	const { id } = req.params;
	const data = await brandService.getBrand(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getBrands = async (req, res) => {
	const data = await brandService.getBrands(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getBrandByManager = async (req, res) => {
	const { id } = req.params;
	const data = await brandService.getBrandByManager(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getBrandsByManager = async (req, res) => {
	const data = await brandService.getBrandsByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
