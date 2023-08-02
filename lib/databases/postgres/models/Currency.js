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
        from: {
            type: DataTypes.STRING(250)
        },
        to: {
            type: DataTypes.STRING(250)
        },
        rate: {
            type: DataTypes.STRING(250)
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
