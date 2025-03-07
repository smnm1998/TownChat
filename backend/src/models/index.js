const { Sequelize, Op } = require('sequelize');
const User = require('./user.model');
const RefreshToken = require('./refreshToken.model');

// 관계 설정
User.hasMany(RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    User,
    RefreshToken,
};
