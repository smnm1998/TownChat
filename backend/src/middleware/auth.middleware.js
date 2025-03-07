const { verifyToken } = require('../utils/jwt.utils');
const User = require('../models/user.model');
const {
    AuthError,
    ForbiddenError,
    NotFoundError,
} = require('../common/errors');

// JWT 인증 미들웨어
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer')) {
            throw new AuthError('인증 토큰이 필요합니다.');
        }

        // 토큰 검증
        const decoded = verifyToken(token);

        if (!decoded) {
            throw new AuthError('유효하지 않거나 만료된 토큰입니다.');
        }

        // 사용자 조회
        const user = await User.findByPk(decoded.id);

        if (!user) {
            throw new AuthError('존재하지 않는 사용자입니다.');
        }

        // 요청 객체에 사용자 정보 추가
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

// 관리자 권한 확인 미들웨어
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return next(new ForbiddenError('관리자 권한이 필요합니다.'));
    }
    next();
};

// 점포 소유자 확인 미들웨어
const isStoreOwner = async (req, res, next) => {
    try {
        const storeId = req.params.id || req.params.storeId;
        const Store = require('../models/store.model');

        const store = await Store.findByPk(storeId);

        if (!store) {
            throw new ForbiddenError('이 점포에 대한 권한이 없습니다.');
        }
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate,
    isAdmin,
    isStoreOwner,
};
