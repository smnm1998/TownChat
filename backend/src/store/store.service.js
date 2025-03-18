const { Store, User, Op } = require('../models');
const { NotFoundError, ForbidenError } = require('../common/errors');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logger = require('../utils/logger');

// 모든 점포 목록 조회
const getAllStores = async (option = {}) => {
    const { page = 1, limit = 10, search = null, active = null, userId = null } = options;

    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // 검색어 필터링
    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { address: { [Op.like]: `%${search}%`} },
            { description: { [Op.like]: `%${search}%`} }
        ];
    }

    // 활성
    if (active !== null) {
        whereClause.is_active = active === 'true' || active === true;
    }

    // 특정 사용자 필터
    if (userId) {
        whereClause.owner_id = userId;
    }

    // 페이지네이션 적용 및 조회
    const { count, rows } = await Store.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'email']
            }
        ]
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const pagination = {
        total: count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
    };

    return { stores: rows, pagination };
};

// 근처 점포 검색
const getNearbyStores = async (latitude, longitude, radiusKm = 5, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // 간단한 근사치 계산으로 구현
    const latDelta = radiustKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    // 활성화 점포만 검색
    const { count, rows } = await Store.findAndCountAll({
        where: {
            latitude: { [Op.between]: [minLat, maxLat] },
            longitude: { [Op.between]: [minLng, maxLng] },
            is_active: true
        },
        limit,
        offset,
        order: [['created_at', 'DESC']]
    });

    // 페이지네이션 정보
    const totalPages = Math.ceil(count / limit);
    const pagination = {
        total: count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
    };

    return { stores: rows, pagination };
};

// 특정 점포 상세 조회
const getStoreById = async (storeId) => {
    const store = await Store.findByPk(id, {
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'email']
            }
        ]
    });

    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }
    
    return store;
};

// 점포 생성
const createStore = async (userId, storeData, imageFile = null) => {
    // img 파일 처리
    let imageUrl = null;
    if (imageFile) {
        // 업로드 폴더 경로
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');

        // 폴더 X -> 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 타임스탬프 + 원본 파일명 생성
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, imageFile.buffer);

        // 저장된 img URL 설정
        imageUrl = `/uploads/stores/${fileName}`;
    }

    // 점포 데이터 생성
    const newStore = await Store.create({
        ...storeData,
        owner_id: userId,
        image_url: imageUrl
    });

    return newStore;
}

// 점포 정보 업데이트
const updateStore = async (id, userId, updateData, imageFile = null) => {
    const store = await Store.findByPk(id);

    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }

    // 점포 소유자 확인 (관리자 x)
    if (store.owner_id !== userId) {
        throw new ForbiddenError('해당 점포를 수정할 권한이 없습니다.');
    }

    // img 파일 처리
    if (imageFile) {
        // 기존 img 파일 삭제 (존재할 경우)
        if (store.image_url) {
            try {
                const oldImagePath = path.join(__dirname, '../../public', store.iamge_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            } catch (error) {
                logger.error('기존 이미지 파일 삭제 실패: ', error);
            }
        }

        // 폴더 x -> 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 타임스탬프 + 원본 파일명 생성
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, imageFile.buffer);

        // 저장 이미지 URL 설정
        updateData.image_url = `/uploads/stores/${fileName}`;
    }

    // 점포 정보 업데이트
    await store.update(updateData);

    return await Store.findByPk(id);
};

// 점포 삭제
const deleteStore = async (id, userId) => {
    const store = await Store.findByPk(id);

    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }

    // 점포 소유자 확인 (관리자 x)
    if (store.owner_id !== userId) {
        throw new ForbiddenError('해당 점포를 삭제할 권한이 없습니다.');
    }

    // 기존 img 파일 삭제 (존재할 경우)
    if (store.image_url) {
        try {
            const imagePath = path.join(__dirname, '../../public', store.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        } catch (error) {
            logger.error('이미지 파일 삭제 실패', error);
        }
    }

    // OpenAI Assistant ID가 있는 경우
    if (store.assistant_id) {

    }

    // 점포 삭제
    await store.destroy();

    return true;
};

// 점포 활성화/비활성화 토글
const toggleStoreActive = async (id, userId) => {
    const store = await Store.findByPk(id);

    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }

    // 점포 소유자 확인
    if (store.owner_id !== userId) {
        throw new ForbiddenError('해당 점포를 수정할 권한이 없습니다.');
    }

    // 활성화 상태 토글
    await store.update({ is_active: !store.is_active });

    return await Store.findByPk(id);
};

module.exports = {
    getAllStores,
    getNearbyStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
    toggleStoreActive
};