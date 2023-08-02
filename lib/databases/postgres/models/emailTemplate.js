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
		templateId: {
			type: DataTypes.STRING(64),
		},
		name: {
			type: DataTypes.STRING(64),
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
