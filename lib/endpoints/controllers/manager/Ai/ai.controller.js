const { getAllAiSample } = require("../../../../services/Ai/ai.service");
const { paginate } = require("../../../../utils/httpResponse");
const { postgres } = require("../../../../databases");


async function getAllAi(req , res){

    let where = {};

    if(req.query.userId)
        where["userId"] = req.query.userId

    if(req.query.email)
        where["$user.email$"] = {[postgres.Op.like] : `%${req.query.email}%`}

    if(req.query.prompt)
        where["prompt"] = {[postgres.Op.like] : `%${req.query.prompt}%`}

    if(req.query.negativePrompt)
        where["negativePrompt"] = {[postgres.Op.like] : `%${req.query.negativePrompt}%`}

    if(req.query.taskId)
        where["taskId"] = {[postgres.Op.like] : `%${req.query.taskId}%`}

    const samples = await getAllAiSample(where, req.query.limit, req.query.page);

    return paginate({
        req,
        res,
        data: samples,
    });
}


module.exports = {
    getAllAi
}