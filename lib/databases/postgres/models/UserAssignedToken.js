const {DataTypes} = require("sequelize");

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
        tokenId: {
            type: DataTypes.BIGINT,
        },
        collectionId: {
            type: DataTypes.BIGINT,
        },
        status: {
            type: DataTypes.ENUM("FREE", "IN_AUCTION", "TRANSFERRED", "SOLD", "PENDING", "BURNED", "NOT_MINTED" ),
            default: "PENDING",
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};