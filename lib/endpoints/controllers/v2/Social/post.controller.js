const {
	httpResponse: { response },
	httpStatus,
} = require("../../../../utils");
const { postgres } = require("../../../../databases");
const { HumanError } = require("../../../../services/errorhandler");

exports.index = async (req, res) => {
	const { page, limit, sort, order } = req.query;
	const offset = (page - 1) * limit;

	let order2 = [["createdAt", "DESC"]];
	if (order && sort) order2 = [[sort, order]];

	const result = await postgres.UserPost.findAndCountAll({
		where: {
			userId: req.userEntity.id,
		},
		include: {
			model: postgres.User,
			attributes: ["id", "name", "email", "avatar", "createdAt"],
		},
		limit,
		offset,
		order: order2,
	});

	return response({
		res,
		statusCode: httpStatus.OK,
		data: {
			total: result.count,
			pageSize: limit,
			page,
			data: result.rows,
		},
	});
};

/**
 * create post
 */
exports.store = async (req, res) => {
	const { caption } = req.body;
	const files = req.files;
	let image = {};

	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();

			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	} else throw new HumanError("file is required", 400);

	await new postgres.UserPost({ userId: req.userEntity.id, caption: caption, file: image.file }).save();

	return response({ res, statusCode: httpStatus.OK, data: { message: "success" } });
};

exports.show = async (req, res) => {
	const { id } = req.params;
	const result = await postgres.UserPost.findOne({
		where: {
			id: id,
		},
		include: {
			model: postgres.User,
			attributes: ["id", "name", "email", "avatar", "createdAt"],
		},
	});

	if (!result) throw new HumanError("post does not exist", 404);

	return response({ res, statusCode: httpStatus.OK, data: result });
};

exports.update = async (req, res) => {
	const { id } = req.params;
	const { caption } = req.body;
	const result = await postgres.UserPost.findOne({
		where: {
			id: id,
		},
	});
	if (!result) throw new HumanError("post does not exist", 404);

	if (result.userId !== req.userEntity.id) throw new HumanError("this post is not yours !", 403);

	if (caption) {
		result.caption = caption;
		await result.save();
	}
	return response({ res, statusCode: httpStatus.OK, data: { message: "success" } });
};

exports.delete = async (req, res) => {
	const { id } = req.params;
	const result = await postgres.UserPost.findOne({
		where: {
			id: id,
		},
	});
	if (!result) throw new HumanError("post does not exist", 404);

	if (result.userId === req.userEntity.id) result.destroy();
	else throw new HumanError("this post is not yours !", 403);

	return response({ res, statusCode: httpStatus.OK, data: { message: "success" } });
};
