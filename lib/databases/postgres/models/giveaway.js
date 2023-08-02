const { DataTypes } = require("sequelize");

module.exports = {
    attributes: {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            unique: true
        },
        assetId: {
            type: DataTypes.BIGINT
        },
        userId: {
            type: DataTypes.BIGINT
        },
        amount: {
            type: DataTypes.FLOAT,
            defaultValue: 8
        },
        reason: {
            type: DataTypes.TEXT
        },
        isDeposit: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
