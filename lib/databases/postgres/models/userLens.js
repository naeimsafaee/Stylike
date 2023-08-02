const { DataTypes } = require("sequelize");

module.exports = {
	attributes: {
		id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
			autoIncrement: true,
			allowNull: false,
			unique: true,
		},
		usageNumber: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		lensId: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		lensAuctionId: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		userId: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		type: {
			type: DataTypes.ENUM("TRANSFER", "BOX"),
			defaultValue: "TRANSFER",
		},
		isGifted: {
			type: DataTypes.BOOLEAN,
			default: false,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
