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
		blogId: {
			type: DataTypes.BIGINT,
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
			type: DataTypes.STRING(255),
		},
		text: {
			type: DataTypes.TEXT,
		},
		thumbnails: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
		images: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
