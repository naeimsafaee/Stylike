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
		stylStakeId: {
			type: DataTypes.BIGINT,
		},
		userAmount: {
			type: DataTypes.DECIMAL,
		},
		profit: {
			type: DataTypes.DECIMAL,
			default: 0,
		},
		percent: {
			type: DataTypes.DECIMAL,
			default: 0,
		},
		lensId: {
			type: DataTypes.BIGINT,
			allowNull: true
		},
		days: {
			type: DataTypes.INTEGER,
		},
		unLockable: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
