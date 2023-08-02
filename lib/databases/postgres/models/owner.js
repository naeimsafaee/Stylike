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
        fromAddress: {
            type: DataTypes.STRING
        },
        toAddress: {
            type: DataTypes.STRING
        },
        txId: {
            type: DataTypes.STRING
        },
        cardEdition: {
            type: DataTypes.BIGINT
        },
        blockNumber: {
            type: DataTypes.BIGINT
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
