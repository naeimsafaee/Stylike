const { getAllPlans, getUserPlans } = require("../../../../services/Ai/aiPlan.service");
const { paginate, response } = require("../../../../utils/httpResponse");
const { httpStatus } = require("../../../../utils");
const { postgres } = require("../../../../databases");


async function getAllPlansForManager(req, res) {
    const plans = await getAllPlans();
    return response({ res, statusCode: httpStatus.OK, data: plans });
}

async function getAllUserPlans(req, res) {

    let where = {};

    if (req.query.userId)
        where["userId"] = req.query.userId;

    if (req.query.email)
        where["$user.email$"] = { [postgres.Op.like]: `%${req.query.email}%` };

    if (req.query.planName)
        where["$plan.name$"] = { [postgres.Op.like]: `%${req.query.planName}%` };
    else
        where["$plan.name$"] = { [postgres.Op.ne]: 'Free' };

    if (req.query.price)
        where["price"] = req.query.price;

    if (req.query.remaining)
        where["remaining"] = req.query.remaining;

    const plans = await getUserPlans(where, req.query.limit, req.query.page);
    return paginate({
        req,
        res,
        data: plans
    });
}

module.exports = {
    getAllPlansForManager,
    getAllUserPlans
};