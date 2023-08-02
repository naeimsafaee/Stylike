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
		competitionId: {
			type: DataTypes.BIGINT,
		},
		amount: {
			type: DataTypes.DECIMAL,
		},
		assetId: {
			type: DataTypes.BIGINT,
		},
		status: {
			type: DataTypes.ENUM("PENDING", "REJECTED", "DONE"),
			defaultValue: "PENDING",
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
