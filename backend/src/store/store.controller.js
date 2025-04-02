const storeService = require('./store.service');
const { validateCreateStore, validateUpdateStore } = require('./store.validation');
const { success, paginate } = require('../utils/response.utils');

// 모든 점포 목록 조회
const getAllStores = async (req, res, next) => {
    try {
        const { page, limit, search, active } = req.query;
        const { stores, pagination } = await storeService.getAllStores({
            page,
            limit,
            search,
            active
        });
        return paginate(res, stores, pagination, '점포 목록 조회 성공');
    } catch (error) {
        next(error);
    }
};

// 사용자의 점포 목록 조회
const getUserStores = async (req, res, next) => {
    try {
        const { page, limit, search, active } = req.query;
        const userId = req.user.id;

        const { stores, pagination } = await storeService.getAllStores({
            page,
            limit,
            search,
            active,
            userId
        });

        return paginate(res, stores, pagination, '내 점포 목록 조회 성공');
    } catch (error) {
        next(error);
    }
};

// 근처 점포 검색
const getNearbyStores = async (req, res, next) => {
    try {
        const { latitude, longitude, radius, page, limit } = req.query;

        if (!latitude || !logintude) {
            return res.status(400).json({
                success: false,
                message: '위도와 경도가 필요합니다.'
            });
        }

        const { stores, pagination } = await storeService.getNearbyStores(
            parseFloat(latitude),
            parseFloat(longitude),
            radius ? parseFloat(radius) : 5,
            { page, limit }
        );

        return paginate(res, stores, pagination, '근처 점포 검색 성공');
    } catch (error) {
        next(error);
    }
};

// 특정 점포 상세 조회
const getStoreById = async (req, res, next) => {
    try {
        const storeId = req.params.id;
        const store = await storeService.getStoreById(storeId);

        return success(res, 200, '점포 상세 조회 성공', store);
    } catch (error) {
        next(error);
    }
};

// 점포 생성
const createStore = async (req, res, next) => {
    try {
        // 입력 데이터 검증
        validateCreateStore(req.body);

        // 점포 생성
        const newStore = await storeService.createStore(
            req.user.id,
            req.body,
            req.file
        );

        return success(res, 201, '점포가 성공적으로 등록되었습니다.', newStore);
    } catch (error) {
        next(error);
    }
};

// 점포 정보 업데이트
const updateStore = async (req, res, next) => {
    try {
        const storeId = req.params.id;
        
        console.log("Files received:", req.files); // 로그 추가
        
        // updateStore 함수에 파일 객체 전달
        const updatedStore = await storeService.updateStore(
            storeId,
            req.user.id,
            req.body,
            req.files // files 객체 전체 전달
        );
        
        return success(res, 200, '점포 정보가 성공적으로 업데이트되었습니다.', updatedStore);
    } catch (error) {
        next(error);
    }
};

// 점포 삭제
const deleteStore = async (req, res, next) => {
    try {
        const storeId = req.params.id;
        
        await storeService.deleteStore(storeId, req.user.id);

        return success(res, 200, '점포가 성공적으로 삭제되었습니다.');
    } catch (error) {
        next(error);
    }
};

// 점포 활성화/비활성화 토글
const toggleStoreActive = async (req, res, next) => {
    try {
        const storeId = req.params.id;
        const updateStore = await storeService.toggleStoreActive(storeId, req.user.id);
        const statusMessage = updateStore.is_active
            ? '점포가 활성화되었습니다.'
            : '점포가 비활성화되었습니다.';

            return success(res, 200, statusMessage, updateStore);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllStores,
    getUserStores,
    getNearbyStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
    toggleStoreActive
};