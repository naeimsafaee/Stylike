const { postgres } = require("./../databases");
const { httpResponse } = require("./../utils");

module.exports = async (req, res, next) => {
	try {
		const { id } = req.body;
		if (!id || !Number.parseInt(id)) return httpResponse.apiError(res, "UNAUTHORIZED|Blog id is not valid");

		const blog = await postgres.Blog.findOne({ where: { id }, raw: true });
		if (!blog?.id) return httpResponse.apiError(res, "UNAUTHORIZED|Blog not found");
		req.blogEntity = blog;
		return next();
	} catch (e) {
		console.log("error => ", e);
		return httpResponse.apiError(res, "INTERNAL_SERVER_ERROR");
	}
};
