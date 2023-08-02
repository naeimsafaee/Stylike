const logger = require("./WinstonErrorMiddleware");

const validHttpStatusCode = [
    200, 201, 202, 203, 204,
    300, 301, 302, 303,
    400, 401, 402, 403, 404, 422, 420, 409,
    500, 501, 502, 503, 504 , 505 , 506
];

module.exports = (err, req, res, next) => {
    // winston.error(err.message  , err);
    // console.log(err)
    let message = err.message;

    let statusCode = 500;
    if (err.statusCode)
        statusCode = err.statusCode;

    if(!validHttpStatusCode.includes(statusCode)){
        logger.error("Invalid http status code:" + statusCode);
        statusCode = 500;
    }

    if (process.env.NODE_ENV === "development"){
        console.log({ err })
        return res.status(statusCode).send({
            data: [],
            message: message,
            stack: err
        });
    }


    if (statusCode >= 500) {
        logger.error(err);

        console.log("ServerError", err);
        message = "Server Error!";
    }

    return res.status(statusCode).send({
        data: [],
        message: message
    });
};