const express = require('express');
const router = express.Router();
const multer = require('multer');
const storeController = require('./store.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// 파일 업로드 Multer 설정
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // 이미지 파일 또는 텍스트 파일 허용
        if (file.fieldname === 'image' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else if (file.fieldname === 'knowledge_base_file' && file.mimetype === 'text/plain') {
            cb(null, true);
        } else {
            cb(new Error('지원하지 않는 파일 형식입니다. 이미지 또는.txt 파일만 업로드 가능합니다.'), false);
        }
    }
});

// 공개 API Route (인증 x)
// 더 구체적인 라우트를 먼저 배치
router.get('/nearby', storeController.getNearbyStores);
router.get('/user/stores', authenticate, storeController.getUserStores);

// 점포 생성 - 여러 파일 필드 처리
router.post(
    '/',
    authenticate,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'knowledge_base_file', maxCount: 1 }
    ]),
    storeController.createStore
);

// Admin 전용 API Route
// 모든 점포 목록 조회
router.get('/', authenticate, isAdmin, storeController.getAllStores);

// 패턴 매칭 라우트를 나중에 배치
// 특정 점포 상세 조회
router.get('/:id', storeController.getStoreById);

// 점포 정보 업데이트 - 여러 파일 필드 처리
router.put(
    '/:id',
    authenticate,
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'knowledge_base_file', maxCount: 1 }
    ]),
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

module.exports = router;