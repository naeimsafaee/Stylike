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
		assetId: {
			type: DataTypes.BIGINT,
		},
		name: {
			type: DataTypes.STRING,
		},
		price: {
			type: DataTypes.DECIMAL,
		},
		limit: {
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
		extraCredit: {
			type: DataTypes.DECIMAL,
			defaultValue: 0
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
