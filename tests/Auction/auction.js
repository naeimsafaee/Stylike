const { postgres } = require("../../lib/databases");
const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../lib/app");
const em = require("exact-math");

const assert = chai.assert;

chai.use(chaiHttp);

const users = require("../Auth/login");

// Refresh database
after(async function () {
	for (let user of users) {
		await postgres.User.destroy({
			where: {
				id: user.user.id,
			},
			force: true,
		});
	}
});

// const users = [
// 	{
// 		user: {
// 			id: "103",
// 			address: null,
// 			name: "Maria-Jose",
// 			mobile: "+98(020)885 7580",
// 			email: "omer+anyango@gmail.com",
// 			totp: null,
// 			status: "ACTIVE",
// 			level: "NORMAL",
// 			levelId: null,
// 			referralCode: "0ec8202e",
// 			referredCode: 'daedeb82',
// 			referralCodeCount: 5,
// 			pushToken: null,
// 			avatar: [],
// 			countryId: "94",
// 			max_withdraw_per_day: 3,
// 			createdAt: "2023-02-01T01:53:21.707Z",
// 			updatedAt: "2023-02-01T01:53:21.707Z",
// 			deletedAt: null,
// 		},
// 		GhostMode: {
// 			isGhostModeEnabledNow: false,
// 			isGhostModeActive: true,
// 			isGhostModeLostNow: false,
// 			ghostExpiryDate: 1677024530,
// 		},
// 		tokens: {
// 		    accessToken: {
// 				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMyIsInVzZXJUeXBlIjoidXNlciIsInRva2VuVHlwZSI6ImFjY2VzcyIsImV4cGlyZXNBdCI6MTY3NjIxMzIxMjA0NiwiaWF0IjoxNjc1NjA4NDEyLCJleHAiOjE2NzYyMTMyMTJ9.iYCJJGcGuwIdltVPMBtYNcO1wQpi2l_sDFJcIn5ev4w',
// 				expiresAt: 1676213212046
// 			  },
// 			  refreshToken: {
// 				token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMyIsInVzZXJUeXBlIjoidXNlciIsInRva2VuVHlwZSI6InJlZnJlc2giLCJleHBpcmVzQXQiOjE2NzYyMTMyMTIwNDYsImlhdCI6MTY3NTYwODQxMiwiZXhwIjoxNjc2MjEzMjEyfQ.MIpeQzqWoGY7nME2x0HoG3vu1EYd94nvuNhDYemzhR0',
// 				expiresAt: 1676213212046
// 			  }
// 		},
// 	},
// 	// {
// 	// 	user: {
// 	// 		id: "104",
// 	// 		address: null,
// 	// 		name: "Anong",
// 	// 		mobile: "+98(741)540 6552",
// 	// 		email: "steven_herrera353@gmail.com",
// 	// 		totp: null,
// 	// 		status: "ACTIVE",
// 	// 		level: "NORMAL",
// 	// 		levelId: null,
// 	// 		referralCode: "d4ba781c",
// 	// 		referredCode: null,
// 	// 		referralCodeCount: 5,
// 	// 		pushToken: null,
// 	// 		avatar: [],
// 	// 		countryId: "94",
// 	// 		max_withdraw_per_day: 3,
// 	// 		createdAt: "2023-02-01T01:53:21.732Z",
// 	// 		updatedAt: "2023-02-01T01:53:21.732Z",
// 	// 		deletedAt: null,
// 	// 	},
// 	// 	GhostMode: {
// 	// 		isGhostModeEnabledNow: false,
// 	// 		isGhostModeActive: true,
// 	// 		isGhostModeLostNow: false,
// 	// 		ghostExpiryDate: 1677024530,
// 	// 	},
// 	// 	tokens: {
// 	// 		accessToken: {
// 	// 			token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMyIsInVzZXJUeXBlIjoidXNlciIsInRva2VuVHlwZSI6ImFjY2VzcyIsImV4cGlyZXNBdCI6MTY3NjAxMzQxMTQ2OSwiaWF0IjoxNjc1NDA4NjExLCJleHAiOjE2NzYwMTM0MTF9.j1d5YBy13xRtkzVUo6iE20k04c_q0nuoOVX93hKsvEI',
// 	// 			expiresAt: 1676013411469
// 	// 		  },
// 	// 		  refreshToken: {
// 	// 			token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEwMyIsInVzZXJUeXBlIjoidXNlciIsInRva2VuVHlwZSI6InJlZnJlc2giLCJleHBpcmVzQXQiOjE2NzYwMTM0MTE0NjksImlhdCI6MTY3NTQwODYxMSwiZXhwIjoxNjc2MDEzNDExfQ.hC7RIZpPfpymh0KsUlUm5MbVuiXYKAPBeNB4WvWVo0o',
// 	// 			expiresAt: 1676013411469
// 	// 		  }
// 	// 	},
// 	// },
// ];

it("Buy camera", async function () {
	for (let i = 0; i < users.length; i++) {
		const user = users[i];

		try {
			// Get some random camera's to purchase

			let cameras = await postgres.sequelize.query(
				`WITH auction AS (
                SELECT
                "auctions".id, "auctions"."immediatePrice", "assignedCards"."cardId", "cardTypeId", "assignedCards".id AS "assignedCardId",
				"assignedCards".status, "assignedCards".type,
                ROW_NUMBER() OVER( PARTITION BY "cardTypeId") l
                FROM "auctions"
                JOIN "assignedCards" on "auctions"."assignedCardId" = "assignedCards"."id"
                JOIN "cards" on "cards".id = "assignedCards"."cardId"
                WHERE "auctions".status='ACTIVE' and "auctions"."deletedAt" is null
                AND "assignedCards".status = 'INAUCTION'
				AND "auctions"."end" >= current_date
				AND "cardTypeId" != 9
                )
                SELECT * FROM auction WHERE l <= 2
                limit 6
                ;`,
				{ nest: true, raw: true },
			);

			// Set wallet address for new user
			await postgres.User.update(
				{ address: "0xe3Afde582b9ce81D3c389CF0e6677750f6BaBAF8" },
				{ where: { id: user.user.id } },
			);

			user.user.address = "0xe3Afde582b9ce81D3c389CF0e6677750f6BaBAF8";

			for (let j = 0; j < cameras.length; j++) {
				const camera = cameras[j];

				let userWallet = await postgres.UserWallet.findOne({
					where: { userId: user.user.id, "$asset.coin$": "BNB" },
					include: [{ model: postgres.Asset, as: "asset" }],
				});

				// Make sure user has enough token to buy the cameras
				await userWallet.update({ amount: 1000 });

				const GhostType = await postgres.CardType.findOne({
					where: { price: "0" },
				});

				// Get all the other cards that user has
				const userHasOtherCard = await postgres.AssignedCard.findAll({
					where: {
						userId: user.user.id,
					},
					include: [
						{
							model: postgres.Card,
							where: { cardTypeId: { [postgres.Op.ne]: GhostType.id } },
							required: true,
						},
					],
				});

				const userAttribute = await postgres.UserAttribute.findOne({
					where: {
						userId: user.user.id,
					},
					include: [
						{
							model: postgres.Attribute,
							where: {
								name: "DAMAGE",
								type: "INITIAL",
							},
							required: true,
						},
						{
							model: postgres.Card,
							required: true,
							include: [
								{
									model: postgres.CardType,
									required: true,
								},
							],
						},
					],
					order: [
						["amount", "DESC"],
						[postgres.Card, postgres.CardType, "price", "DESC"],
					],
				});

				const cardType = await postgres.CardType.findOne({
					where: { id: camera.cardTypeId },
				});

				const coolDown = cardType.coolDown;

				const referredUser = await postgres.User.findOne({
					where: { referralCode: user.user.referredCode, status: "ACTIVE" },
				});

				let referredUserAttribute;
				let referredUserWallet;
				if (referredUser) {
					referredUserAttribute = await postgres.UserAttribute.findOne({
						where: {
							userId: referredUser.id,
						},
						include: [
							{
								model: postgres.Attribute,
								where: {
									name: "DAMAGE",
									type: "INITIAL",
								},
								required: true,
							},
							{
								model: postgres.Card,
								required: true,
								include: [
									{
										model: postgres.CardType,
										required: true,
									},
								],
							},
						],
						order: [
							["amount", "DESC"],
							[postgres.Card, postgres.CardType, "price", "DESC"],
						],
					});

					const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" } }, { raw: true });

					referredUserWallet = await postgres.UserWallet.findOne({
						where: { userId: referredUser.id, assetId: bnbAsset.id },
					});
				}

				// Purchase Camera
				const res = await chai
					.request(server)
					.post("/api/user/card/purchase")
					.send({ address: user.user.address, auctionId: camera.id })
					.set("authorization", `Bearer ${user.tokens.accessToken.token}`);

				assert.equal(res.status, 200);

				// Check the purchase was successful
				let newUserWallet = await postgres.UserWallet.findOne({
					where: { userId: user.user.id, "$asset.coin$": "BNB" },
					include: [{ model: postgres.Asset, as: "asset" }],
				});

				assert.equal(userWallet.amount - newUserWallet.amount, +camera.immediatePrice);

				// Check the log was successfully created
				let auctionLog = await postgres.AuctionLog.findOne({
					where: {
						userId: user.user.id,
						address: user.user.address,
						auctionId: camera.id,
						cardId: camera.cardId,
						assignedCardId: camera.assignedCardId,
						status: "FINISHED",
					},
				});
				assert.isDefined(auctionLog);

				// Check the camera status has been updated
				const newAssignedCard = await postgres.AssignedCard.findOne({
					where: {
						id: camera.assignedCardId,
						type: "SOLD",
						status: "INAUCTION",
					},
				});

				assert.isDefined(newAssignedCard);

				// Check User Auction Trade log was created
				const newUserAuctionTrade = await postgres.UserAuctionTrade.findOne({
					where: {
						auctionId: camera.id,
						payerId: user.user.id,
						amount: camera.immediatePrice,
					},
				});
				assert.isDefined(newUserAuctionTrade);

				// Check attributes of camera were successfully added to user attributes
				let attributes = await postgres.Attribute.findAll({
					where: {
						cardTypeId: camera.cardTypeId,
						type: "INITIAL",
						status: "ACTIVE",
					},
				});

				for (let attribute of attributes) {
					let doc = await postgres.UserAttribute.findOne({
						where: {
							userId: user.user.id,
							cardId: camera.cardId,
							attributeId: attribute.id,
							amount: attribute.amount,
						},
					});
					assert.isDefined(doc);
				}

				if (userHasOtherCard.length > 0) {
					const newUserAttribute = await postgres.UserAttribute.findOne({
						where: {
							userId: user.user.id,
						},
						include: [
							{
								model: postgres.Attribute,
								where: {
									name: "DAMAGE",
									type: "INITIAL",
								},
								required: true,
							},
							{
								model: postgres.Card,
								required: true,
								include: [
									{
										model: postgres.CardType,
										required: true,
									},
								],
							},
						],
						order: [
							["amount", "DESC"],
							[postgres.Card, postgres.CardType, "price", "DESC"],
						],
					});

					if (userAttribute) {
						const newDamageAmount = parseFloat(userAttribute.amount) - parseFloat(coolDown);
						if (newDamageAmount < 0) {
							assert.equal(newUserAttribute.amount, 0);
						} else {
							assert.equal(+userAttribute.amount - coolDown, +newUserAttribute.amount);
						}

						const doc = await postgres.UserAttribute.findOne({
							where: {
								cardId: camera.cardId,
								attributeId: newUserAttribute.attributeId,
								userId: user.user.id,
								type: "FEE",
								amount: -coolDown,
								// description: `Your ${newUserAttribute.card.cardType?.name} damage cool down by ${coolDown} STL because you bought a ${cardType.name}`
							},
						});

						assert.isDefined(doc);
					}
				}
				if (user.user.referredCode) {
					if (referredUser) {
						const newReferredUserAttribute = await postgres.UserAttribute.findOne({
							where: {
								userId: referredUser.id,
							},
							include: [
								{
									model: postgres.Attribute,
									where: {
										name: "DAMAGE",
										type: "INITIAL",
									},
									required: true,
								},
								{
									model: postgres.Card,
									required: true,
									include: [
										{
											model: postgres.CardType,
											required: true,
										},
									],
								},
							],
							order: [
								["amount", "DESC"],
								[postgres.Card, postgres.CardType, "price", "DESC"],
							],
						});
						if (referredUserAttribute) {
							const newDamageAmount = parseFloat(referredUserAttribute.amount) - parseFloat(coolDown);
							if (newDamageAmount < 0) {
								assert.equal(newReferredUserAttribute.amount, 0);
							} else {
								assert.equal(referredUserAttribute.amount - coolDown, newReferredUserAttribute.amount);
							}

							const doc = await postgres.UserAttribute.findOne({
								where: {
									cardId: newReferredUserAttribute.cardId,
									attributeId: newReferredUserAttribute.attributeId,
									userId: referredUser.id,
									type: "FEE",
									amount: -coolDown,
									// description: `Your ${referredUserAttribute.card.cardType.name} damage cool down by ${coolDown} STL because one of your referral bought a ${cardType.name}`
								},
							});

							assert.isDefined(doc);
						}

						if (referredUser.level === "AGENT") {
							const type = "TICKET";

							const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" } }, { raw: true });

							const referredUser = await postgres.User.findOne({
								where: { referralCode: user.user.referredCode, status: "ACTIVE" },
							});

							let newReferredWallet = await postgres.UserWallet.findOne({
								where: { userId: referredUser.id, assetId: bnbAsset.id },
							});

							assert.isDefined(newReferredWallet);

							const fee = await postgres.Fee.findOne({
								userType: "AGENT",
								where: { userLevel: referredUser.levelId },
							});

							if (fee) {
								// Calculate amount
								const calculatedAmount = em.mul(+camera.immediatePrice, fee.referralReward);

								assert.equal(
									(+referredUserWallet.amount + calculatedAmount).toFixed(3),
									+newReferredWallet.amount,
								);

								const agentLinkStatistic = await postgres.AgentLinkStatistic.findOne({
									where: { userId: user.user.id },
								});

								const agentReward = await postgres.AgentReward.findOne({
									where: {
										agentId: referredUser.id,
										userId: user.user.id,
										auctionId: camera.id,
										commission: calculatedAmount,
										agentLinkId: agentLinkStatistic ? agentLinkStatistic.agentLinkId : null,
									},
								});

								assert.isDefined(agentReward);

								const newRefferalReward = await postgres.ReferralReward.findOne({
									where: {
										assetId: bnbAsset.id,
										type,
										amount: +calculatedAmount,
										userId: referredUser.id,
										referredUserId: user.user.id,
										auctionId: camera.id,
									},
								});

								assert.isDefined(newRefferalReward);
							}
						}

						if (referredUser.level === "NORMAL") {
							const type = "TICKET";

							const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" } }, { raw: true });

							const referredUser = await postgres.User.findOne({
								where: { referralCode: user.user.referredCode, status: "ACTIVE" },
							});

							let newReferredWallet = await postgres.UserWallet.findOne({
								where: { userId: referredUser.id, assetId: bnbAsset.id },
							});

							assert.isDefined(newReferredWallet);

							// Caclulate amount
							const calculatedAmount = em.mul(camera.immediatePrice, 0.03);

							assert.equal(
								(+referredUserWallet.amount + calculatedAmount).toFixed(3),
								+newReferredWallet.amount,
							);

							const newRefferalReward = await postgres.ReferralReward.findOne({
								where: {
									assetId: bnbAsset.id,
									type,
									amount: +calculatedAmount,
									userId: referredUser.id,
									referredUserId: user.user.id,
									auctionId: camera.id,
								},
							});

							assert.isDefined(newRefferalReward);
						}
					}
				}
			}
		} catch (e) {
			throw e;
		}
	}
});
