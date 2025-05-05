const { Province, City } = require('../models');
const { success } = require('../utils/response.utils');

// 모든 시/도 목록 조회
const getAllProvinces = async (req, res, next) => {
    try {
        const provinces = await Province.findAll({
            order: [['name', 'ASC']]
        });
        return success(res, 200, '시/도 목록 조회 성공', provinces);
    } catch (error) {
        next(error);
    }
};

// 특정 시/도의 시/군/구 목록 조회
const getCitiesByProvinceId = async (req, res, next) => {
    try {
        const { provinceId } = req.params;
        const cities = await City.findAll({
            where: { province_id: provinceId },
            order: [['name', 'ASC']]
        });
        return success(res, 200, '시/군/구 목록 조회 성공', cities);
    } catch (error) {
        next(error);
    }
};

// 모든 지역 정보 한번에 조회 (프론트엔드 초기 로딩용)
const getAllRegions = async (req, res, next) => {
    try {
        const provinces = await Province.findAll({
            order: [['name', 'ASC']],
            include: [
                {
                    model: City,
                    attributes: ['id', 'name', 'code'],
                    order: [['name', 'ASC']]
                }
            ]
        });
        return success(res, 200, '전체 지역 정보 조회 성공', provinces);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllProvinces,
    getCitiesByProvinceId,
    getAllRegions
};