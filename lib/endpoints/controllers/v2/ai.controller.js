const { postgres } = require("../../../databases");
const axios = require("axios");
const { HumanError } = require("../../../services/errorhandler");
const config = require("config");
const amqplib = require("amqplib");
const { sendPushToToken } = require("../../../services/notification.service");
const logger = require("../../../middlewares/WinstonErrorMiddleware");

axios.defaults.timeout = 1200000;

const upScaleUrl = config.get("AI.UPSCALE_SERVER");
const upScaleImageUrl = config.get("AI.UPSCALE_IMAGE_URL");

const generateServers = config.get("AI.GENERATE_SERVER");
const imageServers = config.get("AI.IMAGE_URL");

const queue = "aiQueue";
const queueUpscale = "upScaleQueue";
let ch;

let io;

async function send(queue, data) {
	await ch.assertQueue(queue);
	return ch.sendToQueue(queue, Buffer.from(data));
}

async function createQueue(app) {
	io = app.get("socketIo");

	const conn = await amqplib.connect(config.get("services.rabbitmq.url"));
	ch = await conn.createChannel();

	console.log(`** AI Queue starts with ${generateServers.length} server${generateServers.length > 1 ? "s" : ""}`);

	queueStep();
	upScaleQueueStep();
}

async function upscale(req, res) {
	const { taskId, image, scale } = req.body;

	const aiSample = await postgres.AiSample.findOne({ where: { taskId: taskId } });
	if (!aiSample) throw new HumanError("Sample not found!", 400);

	/*
        if (aiSample.upscaleImage.length > 0)
            throw new HumanError("You upscale this image before", 400);
    */

	aiSample.upscaleStatus = "IN_QUEUE";
	await aiSample.save();

	const user = await postgres.User.findOne({
		where: { id: req.userEntity.id },
	});

	const payload = {
		taskId: `task(${taskId})`,
		userId: user.id,
		image: image,
		scale: scale,
	};

	await send(queueUpscale, JSON.stringify(payload));

	return res.send({
		data: {
			taskId: taskId,
		},
		message: "Stylike AI is up-scaling your image...",
	});
}

async function imagine(req, res) {
	let { prompt, negativePrompt, image, width, height, number, method, cfg, step } = req.body;

	const setting = await postgres.Settings.findOne({
		where: {
			type: "MAINTENANCE",
			key: "ai",
		},
	});
	if (setting && (setting.value === "true" || setting.value === true))
		throw new HumanError("Ai is under maintenance , please wait", 400);

	method = "DPM++ 2M";
	cfg = 10;
	number = 4;
	step = 60;
	width = 512;
	height = 512;

	const user = await postgres.User.findOne({
		where: { id: req.userEntity.id },
	});

	const otherAi = await postgres.AiSample.findAll({
		where: {
			userId: user.id,
			isCompleted: false,
			isFailed: false,
		},
	});

	if (otherAi.length > 0) throw new HumanError("You have an active process , please wait", 400);

	const userPlan = await postgres.UserPlan.findOne({
		where: {
			userId: user.id,
		},
		include: [
			{
				model: postgres.Plan,
				required: true,
			},
		],
	});

	if (!userPlan) throw new HumanError("You don't have a plan yet. Please buy one.", 400);

	if (userPlan.plan.name === "NFT Holders") {
		if (userPlan.remaining <= 0) {
			const extraCredit = userPlan.plan.extraCredit;

			const userWallet = await postgres.UserWallet.findOne({
				where: {
					userId: user.id,
					assetId: userPlan.plan.assetId,
				},
			});

			if (userWallet && parseFloat(userWallet.amount) >= parseFloat(extraCredit)) {
				await userWallet.decrement("amount", { by: extraCredit });
			} else {
				throw new HumanError("You don't have enough balance to use extra credit.", 400);
			}
		} else {
			await userPlan.decrement("remaining", { by: 1 });
		}
	} else {
		if (userPlan.remaining <= 0) throw new HumanError("You don't have a camera yet. Please buy one.", 400);
		else await userPlan.decrement("remaining", { by: 1 });
	}

	const taskId = makeId(16);

	prompt = "dreamlikeart ," + prompt;

	const aiSample = await postgres.AiSample.create(
		{
			userId: user.id,
			prompt: prompt,
			negativePrompt: negativePrompt,
			width: width,
			height: height,
			taskId: taskId,
			number: number,
			method: method,
			cfg: cfg,
			step: step,
			uploadedImage: image,
		},
		{ returning: true },
	);

	const payload = {
		prompt: prompt,
		negativePrompt: negativePrompt,
		width: width,
		height: height,
		taskId: `task(${taskId})`,
		number: number,
		userId: user.id,
		method: method,
		cfg: cfg,
		step: step,
		hasImage: image ? true : false,
		baseUrl: generateServers[aiSample.id % generateServers.length],
		imageUrl: imageServers[aiSample.id % imageServers.length],
	};

	await send(queue, JSON.stringify(payload));

	return res.send({
		data: {
			taskId: taskId,
		},
		message: "Stylike AI is imagining your text...",
	});
}

async function progress(req, res) {
	const taskId = req.params.taskId;
	const userId = req.userEntity.id;

	let aiSample = await postgres.AiSample.findOne({
		where: { taskId: taskId },
	});

	if (!aiSample) throw new HumanError("Sample not found!", 400);

	if (aiSample.userId !== userId) throw new HumanError("This sample is not yours!", 400);

	let estimatedTime = 0;
	let inQueue = 0;
	let upScaleInQueue = 0;
	let upScaleEstimatedTime = 0;

	if (aiSample.isActive === true) {
		try {
			const { data } = await axios.post(
				generateServers[aiSample.id % generateServers.length] + "/internal/progress",
				{
					id_task: `task(${taskId})`,
					id_live_preview: -1,
				},
			);

			if (data) {
				if (aiSample.spentTime < 0) aiSample.spentTime = data.eta;

				estimatedTime = data.eta;
				aiSample.isActive = data.active;
				aiSample.isCompleted = data.completed;
				aiSample.progress = data.progress;
				// if (data.live_preview)
				aiSample.lastPreview = data.live_preview;

				await aiSample.save();
			}
		} catch (e) {}
	} else if (aiSample.isCompleted === false) {
		/* const averageTime = await postgres.AiSample.findOne({
             where: { isCompleted: true },
             attributes: {
                 include: [[postgres.sequelize.fn("AVG", postgres.sequelize.col("spentTime")), "avgSpentTime"]]
             },
             group: ["id"]
         });*/

		inQueue = await postgres.AiSample.count({
			where: {
				isCompleted: false,
				isFailed: false,
				id: { [postgres.Op.lt]: aiSample.id },
			},
		});

		/*const pend = await ch.checkQueue(queue);

        console.log({ pend });

        inQueue = parseInt(pend.messageCount) + 1;*/

		estimatedTime = Math.floor(inQueue / generateServers.length) * /*generateRandomFloat(19 , 21)*/ 20;
	}

	if (aiSample.upscaleStatus === "IN_QUEUE") {
		// const pend = await ch.checkQueue(queueUpscale);
		// console.log({pend})

		upScaleInQueue = await postgres.AiSample.count({
			where: {
				upscaleStatus: "IN_QUEUE",
				id: { [postgres.Op.lte]: aiSample.id },
			},
		});

		// upScaleInQueue = parseInt(pend.messageCount) + 1;

		upScaleEstimatedTime = upScaleInQueue * /*generateRandomFloat(2 , 4)*/ 5;
	}

	aiSample = await postgres.AiSample.findOne({
		where: { taskId: taskId },
	});

	let isCompleted = aiSample.isCompleted;

	if (aiSample.isFailed === true) isCompleted = true;

	return res.send({
		data: {
			isActive: aiSample.isActive,
			isCompleted: isCompleted,
			isFailed: aiSample.isFailed,
			progress: aiSample.progress,
			estimatedTime: estimatedTime,
			inQueue: inQueue,
			lastPreview: aiSample.lastPreview,
			finalImage: aiSample.image,
			upscaleImage: aiSample.upscaleImage,
			scale: aiSample.scale,
			upScaleSpentTime: aiSample.upScaleSpentTime,
			upscaleStatus: aiSample.upscaleStatus,
			upscaleInQueue: upScaleInQueue,
			upScaleEstimatedTime: upScaleEstimatedTime,
		},
	});
}

async function queueStep() {
	await ch.assertQueue(queue);
	ch.prefetch(generateServers.length);

	if (process.env.NODE_ENV === "development") return;
	ch.consume(queue, async (payload) => {
		if (payload !== null) {
			const _payload = JSON.parse(payload.content.toString());

			console.log("running taskId", _payload.taskId);

			let aiSample = await postgres.AiSample.findOne({
				where: { taskId: _payload.taskId.replace("task(", "").replace(")", "") },
			});

			if (!aiSample) {
				ch.ack(payload);
				return;
			}

			const user = await postgres.User.findOne({
				where: { id: _payload.userId },
			});

			try {
				aiSample.isActive = true;
				aiSample.isCompleted = false;
				await aiSample.save();

				sendPushToToken(user, {}, { title: "Stylike Ai", body: "Stylike starts your imagination!" });
				if (io)
					io.to(`UserId:${user.id}`).emit(
						"ai-progress",
						JSON.stringify({
							isActive: true,
							isCompleted: false,
							isFailed: false,
							progress: 0,
							inQueue: 0,
						}),
					);

				let dataPayload = [];

				if (_payload.hasImage === false) {
					dataPayload = [
						_payload.taskId,
						_payload.prompt,
						_payload.negativePrompt,
						[],
						_payload.step,
						_payload.method,
						false,
						false,
						1,
						_payload.number,
						_payload.cfg,
						-1,
						-1,
						0,
						0,
						0,
						false,
						_payload.width,
						_payload.height,
						false,
						0.7,
						2,
						"Latent",
						0,
						0,
						0,
						[],
						"None",
						false,
						false,
						"positive",
						"comma",
						0,
						false,
						false,
						"",
						"Seed",
						"",
						"Nothing",
						"",
						"Nothing",
						"",
						true,
						false,
						false,
						false,
						0,
						[],
						"",
						"",
						"",
					];
				} else {
					dataPayload = [
						_payload.taskId,
						0,
						_payload.prompt,
						_payload.negativePrompt,
						[],
						aiSample.uploadedImage,
						null,
						null,
						null,
						null,
						null,
						null,
						_payload.step,
						_payload.method,
						4,
						0,
						"original",
						false,
						false,
						1,
						_payload.number,
						_payload.cfg,
						1.5,
						0.5,
						-1,
						-1,
						0,
						0,
						0,
						false,
						_payload.width,
						_payload.height,
						"Just resize",
						"Whole picture",
						32,
						"Inpaint masked",
						"",
						"",
						"",
						[],
						"None",
						"",
						true,
						true,
						"",
						"",
						true,
						50,
						true,
						1,
						0,
						false,
						4,
						1,
						"",
						128,
						8,
						["left", "right", "up", "down"],
						1,
						0.05,
						128,
						4,
						"fill",
						["left", "right", "up", "down"],
						false,
						false,
						"positive",
						"comma",
						0,
						false,
						false,
						"",
						"",
						64,
						"None",
						2,
						"Seed",
						"",
						"Nothing",
						"",
						"Nothing",
						"",
						true,
						false,
						false,
						false,
						0,
					];
				}

				const URL = _payload.baseUrl;
				const IMAGE_URL = _payload.imageUrl;

				const { data } = await axios.post(URL + "/run/predict", {
					fn_index: _payload.hasImage === false ? 77 : 146,
					data: dataPayload,
					session_hash: _payload.hasImage === false ? "j0w2nlhuoi" : "pns7jm2oz1g",
				});

				aiSample.isActive = false;
				aiSample.isCompleted = true;
				aiSample.progress = 1;
				aiSample.lastPreview = "";

				let imageArray = [];

				for (let i = 0; i < data.data[0].length; i++) {
					//upScaleImageUrl}${data.data[0][i].name.replace("var/www/output" , "")
					imageArray.push({
						location: IMAGE_URL + data.data[0][i].name.replace("var/www/output", ""),
					});
				}

				aiSample.image = imageArray;
			} catch (e) {
				const userPlan = await postgres.UserPlan.findOne({
					where: {
						userId: user.id,
					},
				});

				if (userPlan) await userPlan.increment("remaining", { by: 1 });

				aiSample.isActive = false;
				aiSample.isCompleted = false;
				aiSample.isFailed = true;
				sendPushToToken(user, {}, { title: "Stylike Ai", body: "Sorry, your request has been failed." });
				console.log({ e });
				logger.error(e);
			}

			await aiSample.save();

			ch.ack(payload);
		} else {
			console.log("Consumer cancelled by server");
		}
	});
}

async function upScaleQueueStep() {
	await ch.assertQueue(queueUpscale);
	ch.prefetch(1);

	ch.consume(queueUpscale, async (payload) => {
		if (payload !== null) {
			const _payload = JSON.parse(payload.content.toString());

			console.log("running upscale taskID", _payload.taskId);

			let aiSample = await postgres.AiSample.findOne({
				where: { taskId: _payload.taskId.replace("task(", "").replace(")", "") },
			});

			if (!aiSample) {
				ch.ack(payload);
				return;
			}

			const user = await postgres.User.findOne({
				where: { id: _payload.userId },
			});

			sendPushToToken(user, {}, { title: "Stylike Ai", body: "Stylike starts your up-scaling!" });

			const dataPayload = [
				null,
				_payload.image,
				null,
				"",
				"",
				true,
				null,
				_payload.scale,
				512,
				512,
				true,
				"ESRGAN_4x",
				"None",
				0,
				0,
				0,
				0,
			];

			try {
				aiSample.upscaleStatus = "ACTIVE";
				await aiSample.save();

				const { data } = await axios.post(upScaleUrl + "/run/predict", {
					fn_index: 163,
					data: dataPayload,
					session_hash: "3g56caqt7gr",
				});

				let imageArray = [];

				for (let i = 0; i < data.data[0].length; i++) {
					imageArray.push({
						location: upScaleImageUrl + data.data[0][i].name.replace("var/www/output", ""),
					});
				}

				aiSample.upscaleStatus = "COMPLETED";
				aiSample.scale = _payload.scale;
				aiSample.upscaleImage = imageArray;
				aiSample.upScaleSpentTime = data.duration;
			} catch (e) {
				aiSample.upscaleStatus = "FAILED";

				sendPushToToken(user, {}, { title: "Stylike Ai", body: "Sorry, your request has been failed." });

				console.log({ e });
				logger.error(e);
			}

			await aiSample.save();

			ch.ack(payload);
		} else {
			console.log("Consumer cancelled by server");
		}
	});
}

function makeId(length) {
	let result = "";
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < length) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result;
}

async function fixCredit(req, res) {
	const userBackgroundPlans = await postgres.UserBackgroundPlan.findAll({ raw: true });

	const plan = await postgres.Plan.findOne({
		where: {
			name: "NFT Holders",
		},
		raw: true,
	});

	const freePlan = await postgres.Plan.findOne({
		wehre: {
			name: "Free",
		},
		raw: true,
	});

	for (let p of userBackgroundPlans) {
		const userId = p.userId;

		const userFreePlan = await postgres.UserPlan.findOne({
			where: {
				userId,
				planId: freePlan.id,
			},
			raw: true,
		});

		const userNftHolderPlan = await postgres.UserPlan.findOne({
			where: {
				userId,
				planId: plan.id,
			},
		});

		let freeCredit = 0;
		if (userFreePlan) {
			freeCredit = userFreePlan.remaining;
			await postgres.UserPlan.destroy({
				where: {
					userId,
					planId: freePlan.id,
				},
			});
		}

		let aiCredit = parseInt(p.remaining);

		await postgres.UserBackgroundPlan.destroy({
			where: {
				id: p.id,
			},
		});

		if (userNftHolderPlan) {
			await userNftHolderPlan.increment("remaining", { by: aiCredit + freeCredit });
			continue;
		}

		await new postgres.UserPlan({
			userId: userId,
			planId: plan.id,
			assetId: plan.assetId,
			price: plan.price,
			limit: aiCredit + freeCredit,
			remaining: aiCredit + freeCredit,
			isUpscalable: plan.isUpscalable,
			isWatermark: plan.isWatermark,
			hasBlueTick: plan.hasBlueTick,
			maxUpscale: plan.maxUpscale,
		}).save();
	}

	return res.send("Success");
}

module.exports = {
	imagine,
	progress,
	createQueue,
	upscale,
	fixCredit,
};
