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
		prompt: {
			type: DataTypes.TEXT,
		},
		negativePrompt: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		width: {
			type: DataTypes.INTEGER,
			defaultValue: 512,
		},
		height: {
			type: DataTypes.INTEGER,
			defaultValue: 512,
		},
		number: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
		},
		method: {
			type: DataTypes.STRING,
			defaultValue: "LMS",
		},
		cfg: {
			type: DataTypes.INTEGER,
			defaultValue: 7,
		},
		step: {
			type: DataTypes.INTEGER,
			defaultValue: 50,
		},
		lastPreview: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		uploadedImage: {
			type: DataTypes.TEXT,
		},
		image: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
		scale: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		upscaleImage: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		isCompleted: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		isFailed: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		upscaleStatus: {
			type: DataTypes.ENUM("NOT_REQUESTED","IN_QUEUE", "ACTIVE", "COMPLETED" , "FAILED"),
			defaultValue: "NOT_REQUESTED",
		},
		progress: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		taskId: {
			type: DataTypes.STRING(36),
		},
		spentTime: {
			type: DataTypes.DECIMAL,
			defaultValue: -1,
		},
		upScaleSpentTime: {
			type: DataTypes.DECIMAL,
			defaultValue: -1,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};