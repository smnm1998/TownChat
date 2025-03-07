const {
    BaseError,
    NotFoundError,
    ValidationError,
    AuthError,
    ForbiddenError,
} = require('../common/errors');
const logger = require('../utils/logger');

// 전역 에러 처리 미들웨어
const errorHandler = (err, req, res, next) => {
    // 에러 로깅
    logger.error(`${err.name}: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // 유형별 에러
    if (err instanceof ValidationError) {
        return res.status(400).json({
            succes: false,
            error: err.name,
            message: err.message,
            details: err.details,
        });
    }

    if (err instanceof AuthError) {
        return res.status(401).json({
            success: false,
            error: err.name,
            message: err.message,
        });
    }

    if (err instanceof ForbiddenError) {
        return res.status(403).json({
            success: false,
            error: err.name,
            message: err.message,
        });
    }

    if (err instanceof BaseError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.name,
            message: err.message,
        });
    }

    // 처리 안된 에러
    res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message:
            ProcessingInstruction.env.NODE_DEV === 'production'
                ? '서버 오류가 발생했습니다.'
                : err.message,
    });
};

// 404
const notFoundHandler = (req, res, next) => {
    next(
        new NotFoundError(`요청한 경로 ${req.originalUrl}를 찾을 수 없습니다.`)
    );
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
