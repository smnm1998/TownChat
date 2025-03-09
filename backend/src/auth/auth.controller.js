const authService = require('./auth.service');
const {
    validateSignUp,
    validateSignIn,
    validateRefreshToken,
} = require('./auth.validation');
const { success } = require('../utils/response.utils');

// 회원가입 컨트롤러
const signUp = async (req, res, next) => {
    try {
        // 입력 데이터 검증
        validateSignUp(req.body);

        // 사용자 등록 및 토큰 생성
        const result = await authService.signUp(req.body);

        // 응답
        return success(res, 201, '회원가입이 완료되었습니다.', result);
    } catch (error) {
        next(error);
    }
};

// 로그인 컨트롤러
const signIn = async (req, res, next) => {
    try {
        // 입력 데이터 검증
        validateSignIn(req.body);

        // 로그인 및 토큰 생성
        const result = await authService.signIn(
            req.body.email,
            req.body.password
        );

        // 응답
        return success(res, 200, '로그인 성공', result);
    } catch (error) {
        next(error);
    }
};

// 토큰 갱신 컨트롤러
const refreshToken = async (req, res, next) => {
    try {
        // 입력 데이터 검증
        validateRefreshToken(req.body);

        // 액세스 토큰 갱신
        const result = await authService.refreshAccessToken(
            req.body.refreshToken
        );

        // 응답
        return success(res, 200, '토큰이 갱신되었습니다.', result);
    } catch (error) {
        next(error);
    }
};

// 로그아웃 컨트롤러
const signOut = async (req, res, next) => {
    try {
        await authService.signOut(req.user.id, req.body.refreshToken || null);

        // 응답
        return success(res, 200, '로그아웃 성공');
    } catch (error) {
        next(error);
    }
};

// 현재 사용자 정보 조회 컨트롤러
const getCurrentUser = async (req, res, next) => {
    try {
        // 인증 미들웨어에서 설정한 req.user 사용
        return success(res, 200, '사용자 정보 조회 성공', {
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                phone: req.user.phone,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signUp,
    signIn,
    refreshToken,
    signOut,
    getCurrentUser,
};
