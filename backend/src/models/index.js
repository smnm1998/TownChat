const { Sequelize, Op } = require('sequelize');
const User = require('./user.model');
const RefreshToken = require('./refreshToken.model');
const Store = require('./store.model');
const Chatbot = require('./chatbot.model');
const ChatLog = require('./chatLog.model');
const Province = require('./province.model');
const City = require('./city.model');

// 인증 관련 관계 설정
User.hasMany(RefreshToken, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id' });

// 점포 관련 관계 설정
User.hasMany(Store, { foreignKey: 'owner_id', onDelete: 'CASCADE' });
Store.belongsTo(User, { foreignKey: 'owner_id' });

// 챗봇 관련 관계 설정
Store.hasOne(Chatbot, { foreignKey: 'store_id', onDelete: 'CASCADE' });
Chatbot.belongsTo(Store, { foreignKey: 'store_id' });

// 챗봇 로그 관련 관계 설정
Chatbot.hasMany(ChatLog, { foreignKey: 'chatbot_id', onDelete: 'CASCADE' });
ChatLog.belongsTo(Chatbot, { foreignKey: 'chatbot_id' });

User.hasMany(ChatLog, { foreignKey: 'user_id', onDelete: 'SET NULL' });
ChatLog.belongsTo(User, { foreignKey: 'user_id' });

// 지역 관련 관계 설정
Province.hasMany(City, { foreignKey: 'province_id', onDelete: 'CASCADE' });
City.belongsTo(Province, { foreignKey: 'province_id' });

module.exports = {
    User,
    RefreshToken,
    Store,
    Chatbot,
    ChatLog,
    Province,
    City,
    Op
};