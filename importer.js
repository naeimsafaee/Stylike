
const { postgres } = require("./lib/databases");


function init() {
	return new Promise(async (resolve, reject) => {
		let data = {};
		for (const item of items) {
			if (!data[item.category]) data[item.category] = [];

			data[item.category].push(item);
		}

		let i = 1;
		for (const category of Object.keys(data)) {
			let items = data[category];

			if (!items.length) continue;

			let type = await postgres.CardType.findOne({ where: { name: category } });

			if (!type) type = await postgres.CardType.create({ name: category, color: "#FFFFFF", status: "ACTIVE" });

			let j = 1;
			for (const value of items) {
				let card = await postgres.Card.create({
					name: value?.name,
					description: value?.description,
					cardTypeId: type.id,
					image: [
						{
							key: `nft/${value.edition}.png`,
							name: `${value.edition}.png`,
							location: `https://stylike-assets.s3.eu-central-1.amazonaws.com/nft/${value.edition}.png`,
						},
					],
					ipfsImage: value?.image,
					status: "ACTIVE",
					chain: "BSC",
					serialNumber: value.dna,
					edition: value.edition,
					attributes: value.attributes,
					allowedUsageNumber: 1000,
				});

				let assigneCard = await postgres.AssignedCard.create({
					cardId: card.id,
					type: "TRANSFER",
					status: "FREE",
				});

				console.log(i, " - ", j++);
			}

			console.log(i++);
		}

		console.log("END");
	});
}


function update() {
	return new Promise(async (resolve, reject) => {

		let items = await postgres.Card.findAll({ where: { ipfsImage: null } });

		let i = 1;
		for (const item of items) {

			console.log(i);

			await item.update({ ipfsImage: `ipfs://bafybeia66uw77nn5kw6v3c2lf7lf6cofwmv2y3wkk4q6mhf3yhf6vejyxa/${item.edition}.png` });

			i++
		}

		resolve()

	});
}
