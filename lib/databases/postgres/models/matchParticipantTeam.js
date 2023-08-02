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
        userId: {
            type: DataTypes.BIGINT
        },
        cardId: {
            type: DataTypes.BIGINT
        },
        competitionLeagueId: {
            type: DataTypes.BIGINT
        },
        competitionId: {
            type: DataTypes.BIGINT
        },
        score: {
            type: DataTypes.DECIMAL,
            defaultValue: 0
        },
        lenses: {
            type: DataTypes.JSON,
            allowNull:true
        },
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
