const express = require('express');
const router = express.Router();
const regionController = require('./region.controller');

// 콘솔 로그로 디버깅
console.log('Region controller:', regionController);
console.log('getAllProvinces function:', regionController.getAllProvinces);

// 모든 시/도 목록 조회
router.get('/provinces', regionController.getAllProvinces);

// 특정 시/도의 시/군/구 목록 조회
router.get('/provinces/:provinceId/cities', regionController.getCitiesByProvinceId);

// 모든 지역 정보 한번에 조회
router.get('/all', regionController.getAllRegions);

module.exports = router;