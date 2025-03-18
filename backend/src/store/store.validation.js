const { ValidationError } = require('../common/errors');
const { validateRequired } = require('../auth/auth.validation');

// 점포 생성 데이터 검증
const validateCreateStore = (data) => {
    // 필수 필드 확인
    validateRequired(data, ['name', 'address', 'owner_name']);

    // 점포명 길이 검증
    if (data.name && data.name.length < 2) {
        throw new ValidationError('점포명은 최소 2자 이상이어야 합니다.');
    }

    // 전화번호 형식 검증 (있는 경우)
    if (data.phone && !/^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/.test(data.phone)) {
        throw new ValidationError('올바른 전화번호 형식이 아닙니다.');
    }

    // 점주 전화번호 형식 검증 (있는 경우)
    if (data.owner_phone && !/^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/.test(data.owner_phone)) {
        throw new ValidationError('올바른 점주 전화번호 형식이 아닙니다.');
    }

    // 위도/경도 검증 (둘 다 제공된 경우)
    if (data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            throw new ValidationError('올바른 위도 값이 아닙니다. (-90 ~ 90)');
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            throw new ValidationError('올바른 경도 값이 아닙니다. (-180 ~ 180)');
        }
    }
};

// 점포 업데이트 데이터 검증
const validateUpdateStore = (data) => {
    // 점포명 길이 검증 (제공된 경우)
    if (data.name && data.name.length < 2) {
        throw new ValidationError('점포명은 최소 2자 이상이어야 합니다.');
    }

    // 전화번호 형식 검증 (제공된 경우)
    if (data.phone && !/^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/.test(data.phone)) {
        throw new ValidationError('올바른 전화번호 형식이 아닙니다.');
    }

    // 점주 전화번호 형식 검증 (제공된 경우)
    if (data.owner_phone && !/^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/.test(data.owner_phone)) {
        throw new ValidationError('올바른 점주 전화번호 형식이 아닙니다.');
    }

    // 위도/경도 검증 (둘 다 제공된 경우)
    if (data.latitude !== undefined && data.longitude !== undefined) {
        const lat = parseFloat(data.latitude);
        const lng = parseFloat(data.longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            throw new ValidationError('올바른 위도 값이 아닙니다. (-90 ~ 90)');
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            throw new ValidationError('올바른 경도 값이 아닙니다. (-180 ~ 180)');
        }
    }
};

module.exports = {
    validateCreateStore,
    validateUpdateStore
};