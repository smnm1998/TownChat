const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const City = sequelize.define(
    'City',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        province_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Provinces',
                key: 'id',
            },
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
    },
    {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = City;