
const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { matchParticipantService } = require("../../services");

/**
 * get MatchParticipant list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getMatchParticipant = async (req, res) => {
	const data = await matchParticipantService.getMatchParticipant(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getMatchParticipantSingle = async (req, res) => {
	const { id } = req.params;
	const data = await matchParticipantService.getMatchParticipantSingle(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.updateMatchParticipant = async (req, res) => {
	const io = req.app.get("socketIo");

	const { match_participant_id, score, status, inFeed } = req.body;
	const data = await matchParticipantService.updateMatchParticipant(
		match_participant_id,
		parseFloat(score),
		status,
		inFeed,
		io,
	);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get MatchParticipant Team list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getMatchParticipantTeam = async (req, res) => {
	try {
		const { id, leagueName, user, score, title, startAt, endtAt, createdAt, status, sort, order, page, limit } =
			req.query;
		const data = await matchParticipantService.getMatchParticipantTeam(
			id,
			leagueName,
			user,
			score,
			title,
			startAt,
			endtAt,
			createdAt,
			status,
			sort,
			order,
			page,
			limit,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 *
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSingleMatchParticipantTeam = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await matchParticipantService.getSingleMatchParticipantTeam(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
