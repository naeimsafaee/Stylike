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
        competitionId: {
            type: DataTypes.BIGINT
        },
        cardTypeId: {
            type: DataTypes.BIGINT
        },
        prizeId: {
            type: DataTypes.BIGINT,
            allowNull: true
        },
        title: {
            type: DataTypes.STRING
        },
        entranceFee: {
            type: DataTypes.INTEGER
        },
        assetId: {
            type: DataTypes.BIGINT
        },
        image: {
            type: DataTypes.JSONB,
            defaultValue: []
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
