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
        from: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        to: {
            type: DataTypes.BIGINT,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
        },
        tokenId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'UserTokens',
                key: 'id',
            },
        },
        collectionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'UserCollections',
                key: 'id',
            },
        },
        price: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        type: {
            type: DataTypes.ENUM('LIST', 'SALE', 'OFFER', 'TRANSFER', 'MINT', 'CANCEL', 'BURN', 'BID'),
            allowNull: false,
        },
        blockNumber: {
            type: DataTypes.INTEGER,
            defaultValue: null,
        },
        transactionHash: {
            type: DataTypes.STRING,
            defaultValue: null,
        },
        blockHash: {
            type: DataTypes.STRING,
            defaultValue: null,
        },
        extra: {
            type: DataTypes.JSONB,
            defaultValue: null,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
