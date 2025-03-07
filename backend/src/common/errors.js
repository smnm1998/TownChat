// 기본 에러 클래스
class BaseError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

// 유효성 검증 에러
class ValidationError extends BaseError {
    constructor(message, details = null) {
        super(message, 400, details);
    }
}

// 인증 에러
class AuthError extends BaseError {
    constructor(message) {
        super(message, 401);
    }
}

// 권한 에러
class ForbiddenError extends BaseError {
    constructor(message) {
        super(message, 403);
    }
}

// 리소스 찾기 에러
class NotFoundError extends BaseError {
    constructor(message) {
        super(message, 404);
    }
}

module.exports = {
    BaseError,
    ValidationError,
    AuthError,
    ForbiddenError,
    NotFoundError,
};
