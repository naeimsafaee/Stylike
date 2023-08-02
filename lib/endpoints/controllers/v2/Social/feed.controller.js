const {
	httpResponse: { response },
	httpStatus,
} = require("../../../../utils");
const { postgres } = require("../../../../databases");

exports.index = async (req, res) => {
	const { page, limit, sort, order, type, searchQuery } = req.query;
	let query = {};
	let result = {};
	const offset = (page - 1) * limit;

	let order2 = [["createdAt", "DESC"]];
	if (order && sort) order2 = [[sort, order]];

	if (type === "post") {
		if (searchQuery) {
			query[postgres.Op.or] = [
				{ "$user.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ caption: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		result = await postgres.UserPost.findAndCountAll({
			where: query,
			attributes: { exclude: ["deletedAt"] },
			include: {
				model: postgres.User,
				attributes: ["id", "name", "email", "avatar"],
			},
			limit,
			offset,
			order: order2,
		});
	}

	if (type === "task") {
		if (searchQuery) {
			query[postgres.Op.or] = [
				{ "$competitionTask.title$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ "$competitionTask.description$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		query.inFeed = true;

		result = await postgres.MatchParticipant.findAndCountAll({
			where: query,
			attributes: ["id", "image", "score", "createdAt"],
			include: [
				{
					model: postgres.CompetitionTask,
					attributes: ["title", "description"],
				},
				{
					model: postgres.MatchParticipantTeam,
					attributes: ["userId"],
					include: {
						model: postgres.User,
						attributes: ["id", "name", "email", "avatar"],
					},
				},
			],
			limit,
			offset,
			order: order2,
		});
	}

	if (type === "user") {
		if (searchQuery) {
			query[postgres.Op.or] = [
				{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ email: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		result = await postgres.User.findAndCountAll({
			where: query,
			attributes: ["id", "name", "email", "avatar"],
			limit,
			offset,
			order: order2,
		});
	}

	return response({
		res,
		statusCode: httpStatus.OK,
		data: {
			total: result.count || 0,
			pageSize: limit,
			page,
			data: result.rows,
		},
	});
};
