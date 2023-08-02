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
		isDefault: {
			type: DataTypes.BOOLEAN,
		},
		languageId: {
			type: DataTypes.BIGINT,
		},
		title: {
			type: DataTypes.STRING(300),
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		categoryId: {
			type: DataTypes.BIGINT,
		},
		images: {
			type: DataTypes.JSONB,
			defaultValue: [],
			allowNull: true,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
