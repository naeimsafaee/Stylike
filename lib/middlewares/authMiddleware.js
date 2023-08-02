const { httpResponse, jwt } = require("./../utils");
const { redis, postgres } = require("./../databases");
const { NotAuthenticatedError } = require("../services/errorhandler");
const Errors = require("../services/errorhandler/MessageText");

function throwError() {
    throw new NotAuthenticatedError(Errors.UNAUTHORIZED.CODE, Errors.UNAUTHORIZED.MESSAGE);
}

const userAuth = (userType, tokenType, notForce = false) => async (req, res, next) => {
    try {
        //? Check token existance
        let authorization = req?.headers?.authorization ?? null;

        if (notForce === true && !authorization)
            return next();

        if (!authorization) throwError();

        const tokenArray = authorization?.split(" ");
        if (tokenArray[0] != "Bearer" || !tokenArray[1]) throwError();

        let token = tokenArray[1];

        //? Check token payload
        let payload = null;

        try {
            payload = jwt.verify(token, null, userType);
            if (!payload?.id || userType !== payload.userType || tokenType !== payload.tokenType) throwError();
        } catch (e) {
            throwError();
        }

        //? find user
        let user = null,
            sessionModel,
            session;

        if (userType == "user") {
            user = await postgres.User.findOne({ where: { id: payload.id } });

            sessionModel = postgres.UserSession;
        }

        if (userType == "agent") {
            user = await postgres.User.findOne({ where: { id: payload.id, level: "AGENT" } });

            sessionModel = postgres.AgentSession;
        }

        if (userType == "manager") {
            user = await postgres.Manager.findOne({ where: { id: payload.id } });

            sessionModel = postgres.ManagerSession;
        }
        if (!user) throwError();

        if (tokenType == "refresh")
            session = await sessionModel.findOne({
                where: { refreshToken: token, refreshExpiresAt: { [postgres.Op.gt]: +new Date() } }
            });
        else
            session = await sessionModel.findOne({
                where: { accessToken: token, accessExpiresAt: { [postgres.Op.gt]: +new Date() } }
            });

        if (!session) throwError();

        req.sessionEntity = session;

        req.userEntity = user;

        next();
    } catch (e) {
        if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
        return res.status(e.statusCode).json(e);
    }
};

const checkAccess = (req, res, next) => {
    try {
        let authorization = req?.headers?.["x-api-key"] ?? req?.headers?.authorization ?? null;

        if (!authorization) throwError();

        const tokenArray = authorization?.split(" ");

        if (tokenArray[0] != "Bearer" || !tokenArray[1]) throwError();

        token = tokenArray[1];

        if (token !== "49E9F731-4F72-428C-A099-130533D2A55A") throwError();

        next();
    } catch (error) {
        return res.status(error.statusCode).json(error);
    }
};

const userPaymentAuth = (userType, tokenType, requestType) => async (req, res, next) => {
    try {
        const authorization = req?.headers?.authorization ?? null;
        if (!authorization) return next();

        const tokenArray = authorization?.split(" ");

        if (tokenArray[0] != "Bearer" || !tokenArray[1]) throwError();

        const token = tokenArray[1];

        let payload = null;

        try {
            payload = jwt.verify(token, null, userType);
            if (!payload?.id || userType !== payload.userType || tokenType !== payload.tokenType) throwError();
        } catch (e) {
            throwError();
        }

        const user = await postgres.User.findByPk(payload.id);
        if (!user) throwError();

        const session = await postgres.UserSession.findOne({
            where: {
                accessToken: token,
                accessExpiresAt: { [postgres.Op.gt]: +new Date() }
            }
        });

        if (!session) throwError();

        req.sessionEntity = session;
        req.userEntity = user;

        next();
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

module.exports = {
    userAuthMiddleware: userAuth("user", "access"),
    userAuthRefreshMiddleware: userAuth("user", "refresh"),
    agentAuthMiddleware: userAuth("agent", "access"),
    agentAuthRefreshMiddleware: userAuth("agent", "refresh"),
    managerAuthMiddleware: userAuth("manager", "access"),
    managerAuthRefreshMiddleware: userAuth("manager", "refresh"),
    checkAccess,
    userAuthMiddlewareNotForce: userAuth("user", "access", true)
};
