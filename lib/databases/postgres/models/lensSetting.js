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
		name: {
			type: DataTypes.STRING,
		},
		allowedUsageNumber: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		amount: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		price: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		calculator_image: {
			type: DataTypes.JSONB,
			defaultValue: []
		},
		type: {
			type: DataTypes.ENUM(
				"FISHEYE",
				"WIDEANGLE",
				"STANDARD",
				"SHORTTELEPHOTO",
				"MEDIUMTELEPHOTO",
				"SUPERTELEPHOTO",
				"MACRO",
			),
			allowNull: false,
		},
		status: {
			type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
			defaultValue: "ACTIVE",
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
