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
		bonusId: {
			type: DataTypes.BIGINT,
		},
		cardTypeId: {
			type: DataTypes.BIGINT,
		},
		cardTierId: {
			type: DataTypes.BIGINT,
		},
		cardNumber: {
			type: DataTypes.INTEGER,
		},
		tokenAmount: {
			type: DataTypes.INTEGER,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
