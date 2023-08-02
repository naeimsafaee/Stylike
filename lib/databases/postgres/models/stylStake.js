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
		title: {
			type: DataTypes.TEXT,
		},
		lensSettingId: {
			type: DataTypes.BIGINT,
			allowNull: true
		},
		stylAmount: {
			type: DataTypes.BIGINT,
		},
		percent: {
			type: DataTypes.DECIMAL,
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
