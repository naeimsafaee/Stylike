const winston = require("winston");
const Transport = require("winston-transport");
const { send } = require("../utils/telegramLogger");

class ErrorTransport extends Transport {
	constructor(opts) {
		super(opts);
		//
		// Consume any custom options here. e.g.:
		// - Connection information for databases
		// - Authentication information for APIs (e.g. loggly, papertrail,
		//   logentries, etc.).
		//
	}

	log(info, callback) {
		setImmediate(() => {
			this.emit("logged", info);
		});

		const message = info.message;
		const level = info.level;

		if (process.env.NODE_LOCAL !== true && process.env.NODE_ENV !== "development")
			send(JSON.stringify(info));

		// Perform the writing to the remote service
		callback();
	}
}

const logger = winston.createLogger({
	level: "error",
	format: winston.format.json(),
	transports: [new ErrorTransport()],
});

module.exports = logger;
