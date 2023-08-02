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
		nftStakeId: {
			type: DataTypes.BIGINT,
		},
		assignedCardId: {
			type: DataTypes.BIGINT,
		},
		amount: {
			type: DataTypes.DECIMAL,
			default: 0,
		},
		percent: {
			type: DataTypes.DECIMAL,
			default: 0,
		},
		days: {
			type: DataTypes.INTEGER,
		},
		paid: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
