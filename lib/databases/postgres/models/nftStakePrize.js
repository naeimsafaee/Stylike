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
		nftStakeId: {
			type: DataTypes.BIGINT,
		},
		cardTypeId: {
			type: DataTypes.BIGINT,
		},
		percent: {
			type: DataTypes.DECIMAL,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
