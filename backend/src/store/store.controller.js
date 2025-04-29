const models = require('../models');
const Store = models.Store;
const User = models.User;
const Province = models.Province;
const City = models.City;
const Op = models.Op;
const storeService = require('./store.service');
const { validateCreateStore, validateUpdateStore } = require('./store.validation');
const { success, paginate } = require('../utils/response.utils');

// 모든 점포 목록 조회
const getAllStores = async (req, res, next) => {
    try {
        const { page, limit, search, active } = req.query;
        const { stores, pagination } = await storeService.getAllStores({
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20,
            search,
            active: active === 'true' || active === true
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

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: '위도와 경도가 필요합니다.'
            });
        }

        const { stores, pagination } = await storeService.getNearbyStores(
            parseFloat(latitude),
            parseFloat(longitude),
            radius ? parseFloat(radius) : 5,
            { 
                page: parseInt(page) || 1, 
                limit: parseInt(limit) || 20 
            }
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
        console.log('요청 시작 - 파일 정보:', req.files);
        
        // 입력 데이터 검증
        validateCreateStore(req.body);

        // 점포 생성
        const newStore = await storeService.createStore(
            req.user.id,
            req.body,
            req.files
        );

        console.log('생성된 점포 정보:', newStore);
        return success(res, 201, '점포가 성공적으로 등록되었습니다.', newStore);
    } catch (error) {
        console.error('점포 생성 에러:', error);
        next(error);
    }
};

const getStoresByRegion = async (req, res, next) => {
    try {
        const { provinceId, cityId } = req.query;
        
        if (!provinceId) {
            return res.status(400).json({
                success: false,
                message: '지역 정보가 필요합니다.'
            });
        }
        
        const whereClause = {};
        
        // 주소 필드에서 텍스트 검색을 통한 필터링
        if (provinceId) {
            try {
                const province = await Province.findByPk(provinceId);
                if (province) {
                    // 풀네임 (예: "경상북도")
                    const fullName = province.name;
                    
                    // 줄임말 매핑 (필요에 따라 추가)
                    const shortNameMap = {
                        '서울특별시': '서울',
                        '부산광역시': '부산',
                        '대구광역시': '대구',
                        '인천광역시': '인천',
                        '광주광역시': '광주',
                        '대전광역시': '대전',
                        '울산광역시': '울산',
                        '경기도': '경기',
                        '강원도': '강원',
                        '충청북도': '충북',
                        '충청남도': '충남',
                        '전라북도': '전북',
                        '전라남도': '전남',
                        '경상북도': '경북',
                        '경상남도': '경남',
                        '제주특별자치도': '제주'
                    };
                    
                    // 줄임말 (예: "경북")
                    const shortName = shortNameMap[fullName] || '';
                    
                    // OR 조건으로 검색: 풀네임 또는 줄임말 포함
                    whereClause.address = {
                        [Op.or]: [
                            { [Op.like]: `%${fullName}%` },
                            { [Op.like]: `%${shortName}%` }
                        ]
                    };
                    
                    console.log(`검색 조건 추가: 주소에 ${fullName} 또는 ${shortName} 포함`);
                }
            } catch (error) {
                console.error('Province 조회 오류:', error);
            }
        }
        
        if (cityId) {
            try {
                const city = await City.findByPk(cityId);
                if (city) {
                    // 이미 province로 필터링된 경우 추가 조건으로 설정
                    const cityName = city.name;
                    
                    if (whereClause.address) {
                        // 이미 address 조건이 있을 때 (province 조건이 있는 경우)
                        const existingCondition = whereClause.address;
                        
                        // 기존 조건과 city 조건을 AND로 결합
                        whereClause.address = {
                            [Op.and]: [
                                existingCondition,
                                { [Op.like]: `%${cityName}%` }
                            ]
                        };
                    } else {
                        // address 조건이 없을 때 (province 조건이 없는 경우)
                        whereClause.address = { [Op.like]: `%${cityName}%` };
                    }
                    
                    console.log(`검색 조건 추가: 주소에 ${cityName} 포함`);
                }
            } catch (error) {
                console.error('City 조회 오류:', error);
            }
        }
        
        whereClause.is_active = true;
        console.log('검색 조건:', JSON.stringify(whereClause));
        
        // 검색 쿼리 실행
        const { count, rows } = await Store.findAndCountAll({
            where: whereClause,
            limit: 20,
            include: [{
                model: User,
                attributes: ['id', 'username', 'email']
            }]
        });
        
        return success(res, 200, '지역별 매장 조회 성공', {
            total: count,
            stores: rows
        });
    } catch (error) {
        console.error('지역별 매장 조회 오류:', error);
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

// 점포 검색 제안(자동완성) 컨트롤러
const getStoreSuggestions = async (req, res, next) => {
    try {
        const { query } = req.query;
        
        if (!query || query.length < 2) {
            return success(res, 200, '검색 제안', []);
        }
        
        // 검색어를 포함하는 점포 조회
        const suggestions = await Store.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.like]: `%${query}%` } },
                    { address: { [Op.like]: `%${query}%` } }
                ],
                is_active: true
            },
            attributes: ['id', 'name', 'address'],
            limit: 5
        });
        
        return success(res, 200, '검색 제안 조회 성공', suggestions);
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
    toggleStoreActive,
    getStoreSuggestions,
    getStoresByRegion
};