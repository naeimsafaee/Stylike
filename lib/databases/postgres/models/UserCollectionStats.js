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
        collectionId: {
            type: DataTypes.BIGINT,
        },
        categoryId: {
            type: DataTypes.BIGINT,
        },
        type: {
            type: DataTypes.ENUM("24H", "7D", "30D", "ALL"),
            required: true,
            index: true,
        },
        floorPrice: {
            type: DataTypes.DECIMAL,
            default: 0,
        },
        volume: {
            type: DataTypes.DECIMAL,
            default: 0,
        },
        owners: {
            type: DataTypes.DECIMAL,
            default: 0,
        },
        items: {
            type: DataTypes.DECIMAL,
            default: 0,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
