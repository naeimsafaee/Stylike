const { calculateLenses } = require("../../lib/services/competition.service");
const { postgres } = require("../../lib/databases");
const {
	addBox,
	generateRandomFloat,
	calculateAttributes,
	purchaseBox,
} = require("../../lib/services/manager/box/box.service");
const assert = require("assert");

it("calculating lens effect", function (done) {
	checkLens()
		.then(() => {
			done();
		})
		.catch((e) => done(new Error(e)));
});

it("adding empty boxes", function (done) {
	const count = 10;

	addBox({ name: "Test Box", level: 3, initialNumber: count, price: 100, assetId: 6 })
		.then(() => {
			done();
		})
		.catch((e) => done(new Error(e)));
});

it("generating random numbers", function (done) {
	let totalCount = 10;

	let nftCount = 0;
	let lensCount = 0;
	let attributeCount = 0;
	let referralCount = 0;

	for (let i = 0; i < totalCount; i++) {
		const random = generateRandomFloat(0, totalCount);

		if (random < 0.5) nftCount++;

		if (random >= 0.5 && random < 1.5) lensCount++;

		if (random >= 1.5 && random < 10) attributeCount++;

		if (random >= 4.5 && random < 10) referralCount++;
	}

	// console.log({ nftCount, lensCount, attributeCount, referralCount });
	done();
});

it("generating random attribute box", (done) => {
	calculateAttributes(5)
		.then((amounts) => {
			console.log(amounts);
			done();
		})
		.catch((e) => done(new Error(e)));
});

it("purchasing box", (done) => {
	buyBox(40, 10)
		.then(() => {
			done();
		})
		.catch((e) => done(e));
});

async function buyBox(userId, count) {
	const user = await postgres.User.findOne({
		where: { id: userId },
	});

	const boxAuctions = await postgres.BoxAuction.findAll({
		where: { status: "ACTIVE" },
		include: [
			{
				model: postgres.Box,
				required: true,
				where: { status: "IN_AUCTION" },
			},
		],
		limit: count,
	});

	for (let i = 0; i < boxAuctions.length; i++) {
		const boxAuction = boxAuctions[i];
		const box = boxAuction.box;

		console.log("buying box ", box.id);

		const batteryAttributes = await postgres.UserAttribute.findOne({
			where: {
				type: "INITIAL",
				userId: userId,
			},
			include: [
				{
					model: postgres.Attribute,
					where: { name: "BATTERY", type: "INITIAL" },
					required: true,
				},
			],
		});

		const negativeAttributes = await postgres.UserAttribute.findOne({
			where: {
				type: "INITIAL",
				userId: userId,
			},
			include: [
				{
					model: postgres.Attribute,
					where: { name: "NEGATIVE", type: "INITIAL" },
					required: true,
				},
			],
		});

		const newBox = await purchaseBox({ boxAuctionId: boxAuction.id }, userId, false);

		const newBatteryAttributes = await postgres.UserAttribute.findOne({
			where: {
				type: "INITIAL",
				userId: userId,
			},
			include: [
				{
					model: postgres.Attribute,
					where: { name: "BATTERY", type: "INITIAL" },
					required: true,
				},
			],
		});

		const newNegativeAttributes = await postgres.UserAttribute.findOne({
			where: {
				type: "INITIAL",
				userId: userId,
			},
			include: [
				{
					model: postgres.Attribute,
					where: { name: "NEGATIVE", type: "INITIAL" },
					required: true,
				},
			],
		});

		if (parseFloat(newBox.batteryAmount) > 0) {
			assert.equal(
				parseFloat(newBatteryAttributes.amount),
				parseFloat(batteryAttributes.amount) + parseFloat(newBox.batteryAmount),
			);
		}

		if (parseFloat(newBox.negativeAmount) > 0) {
			assert.equal(
				parseFloat(newNegativeAttributes.amount),
				parseFloat(negativeAttributes.amount) + parseFloat(newBox.negativeAmount),
			);
		}

		if (newBox.cardId != null) {
			const assignCard = await postgres.AssignedCard.findAll({
				where: {
					userId: userId,
					cardId: newBox.cardId,
				},
			});

			assert.equal(assignCard.length, 1);
		}

		if (newBox.lensId != null) {
			const userLens = await postgres.UserLens.findAll({
				where: {
					userId: userId,
					lensId: newBox.lensId,
				},
			});

			assert.equal(userLens.length, 1);
		}
	}
}

async function checkLens() {
	let transaction = await postgres.sequelize.transaction();

	await calculateLenses(57, 30008, 5, ["120"], transaction);

	await transaction.commit();
}
