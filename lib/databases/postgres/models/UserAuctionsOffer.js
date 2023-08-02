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
			allowNull: false,
			references: {
				model: 'users',
				key: 'id',
			},
		},
		auctionId: {
			type: DataTypes.BIGINT,
			references: {
				model: 'UserAuctions',
				key: 'id',
			},
		},
		assignedTokenId: {
			type: DataTypes.BIGINT,
			references: {
				model: 'UserAssignedTokens',
				key: 'id',
			},
		},
		amount: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		expiresAt: {
			type: DataTypes.DATE,
		},
		status: {
			type: DataTypes.ENUM('CANCEL', 'REGISTER', 'ACCEPTED', 'DENIED'),
			defaultValue: 'REGISTER',
		},
		signature: {
			type: DataTypes.JSONB,
			allowNull: false,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
