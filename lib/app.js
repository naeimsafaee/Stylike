require("express-async-errors");
const express = require("express");
const { publicController } = require("./endpoints/controllers");
const app = express();
const throttle = require("express-throttle");
const { telegramBot } = require("./utils/telegramLogger");

if (process.env.NODE_LOCAL !== "true" && process.env.NODE_ENV !== "development") {
	const Sentry = require("@sentry/node");
	const Tracing = require("@sentry/tracing");
	const IntegrationsValue = require("@sentry/integrations");

	try {
		Sentry.init({
			dsn: "https://f57d43b870c04dcba625d2580433f596@o4504003357376512.ingest.sentry.io/4504004510416896",
			integrations: [
				// enable HTTP calls tracing
				new Sentry.Integrations.Http({ tracing: true }),
				// enable Express.js middleware tracing
				new Tracing.Integrations.Express({ app }),
				new IntegrationsValue.CaptureConsole({
					levels: ["log", "info", "warn", "error", "debug", "assert"],
				}),
			],
			debug: process.env.NODE_ENV === "development",
			release: "gamecenter" + ":" + process.env.npm_package_version,
			environment: process.env.NODE_ENV,
			tracesSampleRate: 1.0,
		});
	} catch (e) {
		console.log(e);
	}
}

// register hook containers
global.containers = {};

app.use(
	express.urlencoded({
		extended: true,
		limit: "150mb",
	}),
);
app.use(express.json({ limit: "150mb" }));

require("./middlewares").appMiddlewares(app);
app.use("/api", require("./endpoints/routes"));

app.get("/nft/:filename" /*,throttle({ rate: "6/s" }) */, publicController.attributes);
app.post("/telegram", telegramBot);

app.use(require("./middlewares/errorMiddleware"));

module.exports = app;
