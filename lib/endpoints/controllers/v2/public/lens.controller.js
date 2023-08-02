const {
	httpResponse: { response },
	httpStatus,
} = require("../../../../utils");
const { postgres } = require("../../../../databases");
const _ = require("lodash");

exports.getLensAuctions = async (req, res) => {
	const { page, limit, sort, order, lensSettingId, min, max } = req.query;

	const query = { status: "IN_AUCTION" };

	const offset = (page - 1) * limit;

	if (lensSettingId) query["lensSettingId"] = lensSettingId;

	let data;

	if (lensSettingId) {
		const items = await postgres.Lens.findAndCountAll({
			where: query,
			limit,
			offset,
			include: [
				{
					model: postgres.LensAuction,
					as: "lenses",
					where: { price: { [postgres.Op.gte]: min, [postgres.Op.lte]: max }  , status: "ACTIVE"},
					order: [[sort, order]],
					attributes: ["id", "price", "assetId", "status"],
					include: [
						{
							model: postgres.Asset,
							attributes: ["id", "coin", "name"],
						},
					],
				},
				{
					model: postgres.LensSetting,
					attributes: ["id", "name"],
				},
			],
			attributes: { exclude: ["updatedAt", "deletedAt"] },
			nest: true,
			raw: true,
		});

		data = {
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		};
	} else {
		let lenses = await postgres.sequelize.query(
			`WITH lens AS (
SELECT "lens".id,"lens".name,"lensSettingId","lens".image,"lens".status,lA.price,"assetId",lS.name as lensName,A.name as assetName,
ROW_NUMBER() OVER( PARTITION BY "lensSettingId") r
FROM lens
inner join "lensAuctions" lA on lens.id = lA."lensId"
    inner join "assets" A on A.id = lA."assetId"
inner join "lensSettings" lS on lS.id = lens."lensSettingId"
where "lens".status='IN_AUCTION' and lA."deletedAt" is null and lA."status"='ACTIVE'
)
SELECT * FROM lens WHERE r <= 10;`,
			{ nest: true, raw: true },
		);

		lenses = _.groupBy(lenses, "lensSettingId");

		data = {
			total: lenses.length,
			pageSize: limit,
			page,
			data: lenses,
		};
	}

	return response({ res, statusCode: httpStatus.OK, data });
};
