const { ValidationError } = require('../common/errors');

// 필수 필드 검증 함수
const validateRequired = (data, requiredFields) => {
    const missingFields = requiredFields.filter((field) => !data[field]);

    if (missingFields.length > 0) {
        throw new ValidationError(
            `다음 필드는 필수입니다: ${missingFields.join(', ')}`,
            { fields: missingFields }
        );
    }
};

// 이메일 형식 검증
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// 비밀번호 강도 검증
const isStrongPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
};

// 회원가입 데이터 검증
const validateSignUp = (data) => {
    // 필수 필드 확인
    validateRequired(data, ['username', 'email', 'password']);

    // 이메일 형식 확인
    if (!isValidEmail(data.email)) {
        throw new ValidationError('유효한 이메일 주소를 입력하세요.');
    }

    // 비밀번호 강도 확인
    if (!isStrongPassword(data.password)) {
        throw new ValidationError(
            '비밀번호는 최소 6자 이상이며, 대문자, 소문자, 숫자를 포함해야 합니다.'
        );
    }

    // 사용자명 길이 확인
    if (data.username.length < 3) {
        throw new ValidationError('사용자명은 최소 3자 이상이어야 합니다.');
    }
};

// 로그인 데이터 검증
const validateSignIn = (data) => {
    // 필수 필드
    validateRequired(data, ['username', 'password']);
};

// 리프레시 토큰 검증
const validateRefreshToken = (data) => {
    validateRequired(data, ['refreshToken']);
};

module.exports = {
    validateSignUp,
    validateSignIn,
    validateRefreshToken,
    validateRequired,
    isValidEmail,
    isStrongPassword,
};
