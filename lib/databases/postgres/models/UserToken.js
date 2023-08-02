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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        description: {
            type: DataTypes.STRING,
        },
        supply: {
            type: DataTypes.DECIMAL,
            defaultValue: 1,
        },
        ipfsFile: {
            type: DataTypes.JSONB,
            defaultValue: {},
        },
        chain: {
            type: DataTypes.ENUM("ETHEREUM", "POLYGON", "BSC"),
            allowNull: false,
        },
        unblockableContent: {
            type: DataTypes.STRING,
            allowNull: true,
            select: false,
        },
        url: {
            type: DataTypes.STRING,
        },
        properties: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        mainFile: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
        },
        thumbnail: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            defaultValue: [],
        },
        favoriteCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        collectionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        serialId: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        fee: {
            type: DataTypes.DECIMAL,
            defaultValue: 0,
        },
        isSlider: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        isTrend: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        explicitContent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        contractAddress: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        isLazyMint: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
