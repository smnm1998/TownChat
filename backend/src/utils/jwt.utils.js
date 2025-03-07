const jwt = require('jsonwebtoken');
const env = require('../config/environment');

// JWT 액세스 토큰 생성
const generateAccessToken = (payload) => {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPRESS_IN || '1h',
    });
};

// JWT 리프레시 토큰 생성
const generateRefreshToken = (payload) => {
    return (
        jwt.sign(payload, env.JWT_REFRESH_SECRET || env.JWT_SECRET),
        {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN || '7d',
        }
    );
};

// JWT 토큰 검증
const verifyToken = (token, isRefreshToken = false) => {
    try {
        const secret = isRefreshToken
            ? env.JWT_REFRESH_SECRET || env.JWT_SECRET
            : env.JWT_SECRET;
        return jwt.verify(token, secret);
    } catch (error) {
        return null;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
};
