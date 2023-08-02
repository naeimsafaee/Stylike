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
			type: DataTypes.STRING(300),
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: true,
		},
		status: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
		},
		thumbnails: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
		images: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
		video: {
			type: DataTypes.TEXT,
		},
		link: {
			type: DataTypes.TEXT,
		},
		categoryId: {
			type: DataTypes.BIGINT,
		},
		text: {
			type: DataTypes.TEXT,
		},
		likes: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		tag: {
			type: DataTypes.TEXT,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};

/*
  blogStatus: {
	show: 1,
	hide: 1,
  },
	  blogCategory: {
		landing: 1,
		page: 2,
		blog: 3,
	  },
*/
