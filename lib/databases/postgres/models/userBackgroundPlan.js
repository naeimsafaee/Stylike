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
		userId: {
			type: DataTypes.BIGINT,
		},
		planId: {
			type: DataTypes.BIGINT,
		},
		assetId: {
			type: DataTypes.BIGINT,
		},
		price: {
			type: DataTypes.DECIMAL,
		},
		limit: {
			type: DataTypes.INTEGER,
		},
		remaining: {
			type: DataTypes.INTEGER,
		},
		isUpscalable: {
			type: DataTypes.BOOLEAN,
		},
		isWatermark: {
			type: DataTypes.BOOLEAN,
		},
		hasBlueTick: {
			type: DataTypes.BOOLEAN,
		},
		maxUpscale: {
			type: DataTypes.INTEGER,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
