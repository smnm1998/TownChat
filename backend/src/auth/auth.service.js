const { User, RefreshToken, Op } = require('../models');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
} = require('../utils/jwt.utils');
const { AuthError } = require('../common/errors');

// 리프레시 토큰 만료 시간 계산 - 7일
const calculateExpiryDate = () => {
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    let days;

    if (refreshExpiry.endsWith('d')) {
        days = parseInt(refreshExpiry.slice(0, -1), 10);
    } else {
        days = 7; // 기본 7일
    }

    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

// 회원가입 서비스 (+ 리프레시 토큰)
const signUp = async (userData) => {
    // 중복 체크
    const existingUser = await User.findOne({
        where: {
            [Op.or]: [
                { username: userData.username },
                { email: userData.email },
            ],
        },
    });

    if (existingUser) {
        throw new AuthError('이미 등록된 사용자명 또는 이메일입니다.');
    }

    // 사용자 생성
    const newUser = await User.create(userData);

    // 토큰 페이로드
    const tokenPayload = { id: newUser.id, username: newUser.username };

    // 액세스 토큰 생성
    const accessToken = generateAccessToken(tokenPayload);

    // 리프레시 토큰 생성
    const refreshToken = generateRefreshToken(tokenPayload);

    // 리프레시 토큰 저장
    await RefreshToken.create({
        token: refreshToken,
        user_id: newUser.id,
        expires_at: calculateExpiryDate(),
    });

    return {
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
        },
        accessToken,
        refreshToken,
    };
};

// 로그인 (+리프레시 토큰)
const signIn = async (email, password) => {
    // 사용자 조회
    const user = await User.findOne({ where: { email } });

    if (!user) {
        throw new AuthError('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    // 비밀번호 검증
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
        throw new AuthError('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    // 토큰 페이로드
    const tokenPayload = { id: user.id, email: user.email };

    // 엑세스 토큰 생성
    const accessToken = generateAccessToken(tokenPayload);

    // 리프레시 토큰 생성
    const refreshToken = generateRefreshToken(tokenPayload);

    // 기존 리프레시 토큰 무효
    await RefreshToken.update(
        { is_revoked: true },
        { where: { user_id: user.id, is_revoked: false } }
    );

    // 새로운 리프레시 토큰 저장
    await RefreshToken.create({
        token: refreshToken,
        user_id: user.id,
        expires_at: calculateExpiryDate(),
    });

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        },
        accessToken,
        refreshToken,
    };
};

// 리프레시 토큰 -> 새 엑세스 토큰 발급
const refreshAccessToken = async (refreshToken) => {
    // 리프레시 토큰 확인
    const tokenRecord = await RefreshToken.findOne({
        where: {
            token: refreshToken,
            is_revoked: false,
            expires_at: { [Op.gt]: new Date() },
        },
    });

    if (!tokenRecord) {
        throw new AuthError('유효하지 않거나 만료된 리프레시 토큰입니다.');
    }

    // 토큰 검증
    const decoded = verifyToken(refreshToken, true);

    if (!decoded) {
        // 유효한 토큰이 아닐 시 DB에서 무효화
        await RefreshToken.update(
            { is_revoked: true },
            { where: { id: tokenRecord.id } }
        );
        throw new AuthError('유효하지 않은 리프레시 토큰입니다.');
    }

    // 사용자 조회
    const user = await User.findByPk(decoded.id);

    if (!user) {
        throw new AuthError('존재하지 않는 사용자입니다.');
    }

    // 새 엑세스 토큰 생성
    const tokenPayload = { id: user.id, username: user.username };
    const newAccessToken = generateAccessToken(tokenPayload);

    return {
        accessToken: newAccessToken,
    };
};

// 로그아웃 (리프레시 무효화)
const signOut = async (userId, refreshToken) => {
    if (!refreshToken) {
        return true;
    }

    await RefreshToken.update(
        { is_revoked: true },
        {
            where: {
                user_id: userId,
                token: refreshToken,
                is_revoked: false,
            },
        }
    );

    return true;
};

module.exports = {
    signUp,
    signIn,
    refreshAccessToken,
    signOut,
};
