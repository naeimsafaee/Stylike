const { postgres } = require("../databases");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const { HumanError } = require("./errorhandler");
const { sendPushToToken } = require("./notification.service");

async function getMatchParticipant(data) {
	// return new Promise(async (resolve, reject) => {
	const {
		page,
		limit,
		order,
		sort,
		id,
		userId,
		competitionId,
		matchParticipantTeam,
		user,
		status,
		position,
		createdAt,
		searchQuery,
		score,
		competitionName,
	} = data;

	const query = {};
	let finalOrder = [[sort, order]];

	if (id) query.id = id;

	if (matchParticipantTeam)
		query["$matchParticipantTeam.competitionLeague.title$"] = {
			[postgres.Op.iLike]: `%${matchParticipantTeam}%`,
		};

	if (user) {
		query[postgres.Op.or] = [
			{ "$matchParticipantTeam.user.name$": { [postgres.Op.iLike]: `%${user}%` } },
			{ "$matchParticipantTeam.user.email$": { [postgres.Op.iLike]: `%${user}%` } },
		];
	}
	if (status) query.status = { [postgres.Op.in]: status };
	if (position) query.position = { [postgres.Op.in]: position };

	if (userId) query["$matchParticipantTeam.userId$"] = userId;
	if (competitionId) query["$matchParticipantTeam.competitionLeague.competitionId$"] = competitionId;

	if (competitionName) query["$competition.title$"] = { [postgres.Op.iLike]: "%" + competitionName + "%" };

	if (searchQuery) {
		query[postgres.Op.or] = [
			{ "$matchParticipantTeam.user.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ "$matchParticipantTeam.competitionLeague.title$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (score) {
		query.score = postgres.sequelize.where(
			postgres.sequelize.cast(postgres.sequelize.col("matchParticipant.score"), "varchar"),
			{ [postgres.Op.eq]: score },
		);
	}

	/*const ghostType = await postgres.CardType.findOne({ where: { name: "Ghost" } });
	if (ghostType) query["$matchParticipantTeam.competitionLeague.cardTypeId$"] = { [postgres.Op.ne]: ghostType.id };*/
	/*if (sort === "matchParticipantTeam")
        finalOrder = [[postgres.MatchParticipantTeam, postgres.CompetitionLeague, "title", order]];

    if (sort === "user") finalOrder = [[postgres.MatchParticipantTeam, postgres.User, "name", order]];
*/
	let result = await postgres.MatchParticipant.findAndCountAll({
		where: query,
		limit: limit,
		offset: (page - 1) * limit,
		order: [["createdAt", order]],
		include: [
			{
				model: postgres.MatchParticipantTeam,
				include: [
					{ model: postgres.User, attributes: { exclude: ["password", "salt"] } },
					{
						model: postgres.CompetitionLeague,
						includes: [{ model: postgres.Competition }, postgres.CardType],
					},
				],
			},
			{
				model: postgres.CompetitionTask,
			},
			{
				model: postgres.Competition,
			},
		],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
	// });
}

async function getMatchParticipantSingle(id) {
	let result = await postgres.MatchParticipant.findOne({
		where: { id },
		include: [
			{
				model: postgres.MatchParticipantTeam,
				include: [
					{ model: postgres.User, attributes: { exclude: ["password", "salt"] } },
					{ model: postgres.CompetitionLeague, includes: [{ model: postgres.Competition }] },
				],
			},
			{ model: postgres.CompetitionTask },
		],
	});

	return result;
}

function getMatchParticipantTeam(
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
) {
	return new Promise(async (resolve, reject) => {
		let query = {};
		const endAt = endtAt ? endtAt : "";
		if (id) query.id = id;
		if (leagueName) query["$competitionLeague.title$"] = { [postgres.Op.iLike]: "%" + leagueName + "%" };
		if (user) query["$user.name$"] = { [postgres.Op.iLike]: "%" + user + "%" };
		if (score) query.score = score;
		if (title) query["$competitionLeague.competition.title$"] = { [postgres.Op.iLike]: "%" + title + "%" };
		if (startAt) {
			const thisDate = startAt.split("T")[0];
			query["$competitionLeague.competition.startAt$"] = {
				[postgres.Op.eq]: thisDate,
			};
		}

		if (endAt) {
			const thisDate = endAt.split("T")[0];
			query["$competitionLeague.competition.endAt$"] = {
				[postgres.Op.eq]: thisDate,
			};
		}

		if (createdAt)
			query.createdAt = {
				[postgres.Op.gte]: createdAt,
			};

		if (status) query["$competitionLeague.competition.status$"] = status.toUpperCase();

		let exeSort = [];
		if (sort === "title") {
			exeSort = [postgres.CompetitionLeague, postgres.Competition, "title", order];
			sort = null;
		}

		if (sort === "user") {
			exeSort = [postgres.User, "name", order];
			sort = null;
		}

		if (sort === "leagueName") {
			exeSort = [postgres.CompetitionLeague, "title", order];
			sort = null;
		}

		if (sort === "endtAt") {
			exeSort = [postgres.CompetitionLeague, postgres.Competition, "endAt", order];
			sort = null;
		}

		if (sort === "startAt") {
			exeSort = [postgres.CompetitionLeague, postgres.Competition, "startAt", order];
			sort = null;
		}

		if (sort === "status") {
			exeSort = [postgres.CompetitionLeague, postgres.Competition, "status", order];
			sort = null;
		}

		let exeOrder = [];
		if (exeSort.length === 0) {
			exeOrder = [sort, order];
		} else {
			exeOrder = exeSort;
		}

		let result = await postgres.MatchParticipantTeam.findAndCountAll({
			where: query,
			limit: limit,
			offset: (page - 1) * limit,
			order: [exeOrder],
			include: [
				{ model: postgres.User, attributes: { exclude: ["password", "salt"] } },
				{
					model: postgres.CompetitionLeague,
					include: [
						{
							model: postgres.Competition,
							where: {
								...(title ? { title: { [postgres.Op.iLike]: `%${title}%` } } : {}),
								...(status ? { status } : {}),
								...(startAt ? { startAt } : {}),
								...(endAt ? { endAt } : {}),
							},
							required: true,
						},
					],
					required: true,
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

function getSingleMatchParticipantTeam(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.MatchParticipantTeam.findOne({
			where: { id },
			include: [
				{ model: postgres.User, attributes: { exclude: ["password", "salt"] } },
				{ model: postgres.CompetitionLeague, include: [{ model: postgres.Competition }] },
			],
		});

		resolve(result);
	});
}

async function updateMatchParticipant(match_participant_id, score, status, inFeed, io) {
	let transaction = await postgres.sequelize.transaction();

	try {
		const participant = await postgres.MatchParticipant.findOne({
			where: {
				id: match_participant_id,
			},
			include: {
				model: postgres.Competition,
			},
			transaction,
		});
		if (!participant) throw new HumanError("Match Participant not found!", 404);

		if (participant.status !== "OPEN") throw new HumanError("This Match Participant is not open!", 400);

		const team = await postgres.MatchParticipantTeam.findOne({
			where: { id: participant.participantTeamId },
			transaction,
		});

		const card = await postgres.Card.findOne({ where: { id: team.cardId } });
		const cardType = await postgres.CardType.findOne({ where: { id: card.cardTypeId } });
		const { userId } = team;

		await participant.update({ score, status, inFeed }, { transaction });

		await team.increment("score", { by: score, transaction: transaction });

		// send notif to user
		const notif = await postgres.UserNotification.create(
			{
				userId,
				title: `Score`,
				description: `You have earned ${score} points with ${card.name} ${cardType.name} camera in ${participant.competition.title}`,
			},
			{ transaction },
		);

		if (io) io.to(`UserId:${userId}`).emit("notification", JSON.stringify(notif));

		const user = await postgres.User.findOne({ where: { id: userId }, transaction });

		await transaction.commit();

		sendPushToToken(
			user,
			{},
			{
				title: "Score",
				body: `You have earned ${score} points with ${card.name} ${cardType.name} camera in ${participant.competition.title}`,
			},
		);

		return "Successful";
	} catch (e) {
		await transaction.rollback();

		throw e;
	}
}

module.exports = {
	getMatchParticipant,
	getMatchParticipantTeam,
	getSingleMatchParticipantTeam,
	updateMatchParticipant,
	getMatchParticipantSingle,
};
