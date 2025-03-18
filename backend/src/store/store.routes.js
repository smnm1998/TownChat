const express = require('express');
const router = express.Router();
const multer = require('multer');
const storeController = require('./store.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// 파일 업로드 Multer 설정
const upload = multer ({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, res, cb) => {
        // img 파일만 허용
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
    }
});

// 공개 API Route (인증 x)
// 근처 점포 목록 조회
router.get('/nearby', storeController.getNearbyStores);

// 특정 점포 상세 조회
router.get('/:id', storeController.getStoreById);

// API Route (인증 o)
// 사용자 점포 목록 조회
router.get('/user/stores', authenticate, storeController.getUserStores);

// 점포 생성
router.post(
    '/',
    authenticate,
    upload.single('image'),
    storeController.createStore
);

// 점포 정보 업데이트
router.put(
    '/:id',
    authenticate,
    upload.single('image'),
    storeController.updateStore
);

// 점포 활성화/비활성화 토글
router.patch(
    '/:id/toggle-active',
    authenticate,
    storeController.toggleStoreActive
);

// 점포 삭제
router.delete('/:id', authenticate, storeController.deleteStore);

// Admin 전용 API Route
// 모든 점포 목록 조회
router.get('/', authenticate, isAdmin, storeController.getAllStores);

module.exports = router;