const { Store, User, Chatbot, Op } = require('../models');
const { NotFoundError, ForbiddenError } = require('../common/errors');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logger = require('../utils/logger');
const openaiService = require('../services/openai.service');
const chatbotService = require('../chatbot/chatbot.service'); // 순환 의존성 가능성 있으므로 주의 (여기서는 createStore에서만 사용)

// 모든 점포 목록 조회
const getAllStores = async (option = {}) => {
    const { page = 1, limit = 10, search = null, active = null, userId = null } = option;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
        whereClause[Op.or] = [
            { name: { [Op.like]: `%${search}%` } },
            { address: { [Op.like]: `%${search}%`} },
            { description: { [Op.like]: `%${search}%`} }
        ];
    }
    if (active !== null) {
        whereClause.is_active = active === 'true' || active === true;
    }
    if (userId) {
        whereClause.owner_id = userId;
    }

    const { count, rows } = await Store.findAndCountAll({
        where: whereClause,
        // attributes: ['id', 'name', 'address', 'image_url', ...기타 필요한 Store 필드], // 명시적으로 포함하고 싶을 때
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

    const totalPages = Math.ceil(count / limit);
    const pagination = { /* ... */ };
    return { stores: rows, pagination };
};

// 근처 점포 검색
const getNearbyStores = async (latitude, longitude, radiusKm = 5, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLng = longitude - lngDelta;
    const maxLng = longitude + lngDelta;

    const { count, rows } = await Store.findAndCountAll({
        where: {
            latitude: { [Op.between]: [minLat, maxLat] },
            longitude: { [Op.between]: [minLng, maxLng] },
            is_active: true
        },
        // attributes: ['id', 'name', 'address', 'image_url', ...], // 명시적으로 포함하고 싶을 때
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
        // User 모델 include 필요시 추가
    });

    const totalPages = Math.ceil(count / limit);
    const pagination = { /* ... */ };
    return { stores: rows, pagination };
};

// 특정 점포 상세 조회
const getStoreById = async (storeId) => {
    const store = await Store.findByPk(storeId, {
        // attributes: ['id', 'name', 'address', 'image_url', ...], // 명시적으로 포함하고 싶을 때
        include: [
            {
                model: User,
                attributes: ['id', 'username', 'email']
            },
            // 필요하다면 Chatbot 정보도 여기서 include 할 수 있지만, 순환 의존성 주의
            // {
            //     model: Chatbot,
            //     attributes: ['id', 'name', 'is_active'] // 필요한 챗봇 정보만
            // }
        ]
    });
    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }
    return store; // Store 모델의 모든 필드 (image_url 포함)가 반환됨
};

// 점포 생성 (이전 코드와 거의 동일, chatbotService 임포트 위치만 상단으로 이동)
const createStore = async (userId, storeData, files = null) => {
    let imageUrl = null;
    if (files && files.image && files.image[0]) {
        const imageFile = files.image[0];
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, imageFile.buffer);
        imageUrl = `/uploads/stores/${fileName}`;
    }

    let knowledgeBase = storeData.knowledge_base || '';
    if (files && files.knowledge_base_file && files.knowledge_base_file[0]) {
        try {
            const knowledgeFile = files.knowledge_base_file[0];
            knowledgeBase += '\n\n' + knowledgeFile.buffer.toString('utf8');
        } catch (error) { logger.error('지식 베이스 파일 처리 오류: ', error); }
    }

    const newStore = await Store.create({
        ...storeData,
        owner_id: userId,
        image_url: imageUrl, // 생성 시 image_url 저장
        knowledge_base: knowledgeBase,
        assistant_id: storeData.assistant_id || null
    });

    try {
        logger.info(`점포 ID ${newStore.id}에 대한 챗봇 자동 생성 시작`);
        const chatbotData = {
            name: `${newStore.name} 챗봇`,
            greeting_message: '안녕하세요! 무엇을 도와드릴까요?',
            model: 'gpt-4o-mini',
            assistant_id: newStore.assistant_id || null, // 점포에 assistant_id가 있으면 사용
            knowledge_base: newStore.knowledge_base // 점포의 지식베이스 사용
        };
        const chatbot = await chatbotService.createChatbot(newStore.id, chatbotData);
        logger.info(`점포 ID ${newStore.id} 챗봇 생성 성공. 챗봇 ID: ${chatbot.id}`);
    } catch (error) {
        logger.error(`점포 ID ${newStore.id} 챗봇 자동 생성 오류:`, error);
    }
    return newStore;
};

// 점포 정보 업데이트 (이전 코드와 거의 동일)
const updateStore = async (id, userId, updateData, files = null) => {
    const store = await Store.findByPk(id);
    if (!store) throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    if (store.owner_id !== userId) throw new ForbiddenError('해당 점포를 수정할 권한이 없습니다.');

    if (files && files.image && files.image[0]) {
        // ... (이미지 파일 처리 및 updateData.image_url 설정 로직은 이전과 동일) ...
        const imageFile = files.image[0];
        if (store.image_url) {
            try {
                const oldImagePath = path.join(__dirname, '../../public', store.image_url);
                if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
            } catch (error) { logger.error('기존 이미지 파일 삭제 실패: ', error); }
        }
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        const writeFile = util.promisify(fs.writeFile);
        try {
            await writeFile(filePath, imageFile.buffer);
            updateData.image_url = `/uploads/stores/${fileName}`; // 업데이트 데이터에 image_url 포함
        } catch (fileError) { console.error('Image file save error:', fileError); }
    }

    if (files && files.knowledge_base_file && files.knowledge_base_file[0]) {
        // ... (지식 베이스 파일 처리 로직은 이전과 동일) ...
        try {
            const knowledgeFile = files.knowledge_base_file[0];
            const knowledgeContent = knowledgeFile.buffer.toString('utf8');
            if (knowledgeContent) updateData.knowledge_base = knowledgeContent;
        } catch (error) { logger.error('지식 베이스 파일 처리 오류: ', error); }
    }

    await store.update(updateData); // image_url 포함하여 업데이트

    if (updateData.knowledge_base) { // 지식베이스가 실제로 업데이트된 경우에만 챗봇 업데이트
        try {
            const chatbot = await Chatbot.findOne({ where: { store_id: id } });
            if (chatbot) {
                // ... (챗봇 지식 베이스 및 OpenAI Assistant 업데이트 로직은 이전과 동일) ...
                await chatbot.update({ knowledge_base: updateData.knowledge_base, last_updated: new Date() });
                const assistantInstructions = `당신은 '${store.name}'의 ... 지식 베이스 내용입니다:\n${updateData.knowledge_base}`;
                await openaiService.updateAssistant(chatbot.assistant_id, { instructions: assistantInstructions });
            }
        } catch (error) { logger.error('챗봇 지식 베이스 업데이트 실패:', error); }
    }
    return await Store.findByPk(id); // 업데이트된 점포 정보 반환 (image_url 포함)
};

// 점포 삭제 (이전 코드와 동일)
const deleteStore = async (id, userId) => {
    const store = await Store.findByPk(id);
    if (!store) throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    if (store.owner_id !== userId) throw new ForbiddenError('해당 점포를 삭제할 권한이 없습니다.');
    if (store.image_url) {
        try {
            const imagePath = path.join(__dirname, '../../public', store.image_url);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (error) { logger.error('이미지 파일 삭제 실패', error); }
    }
    if (store.assistant_id) {
        try { await openaiService.deleteAssistant(store.assistant_id); }
        catch (error) { logger.error('OpenAI Assistant 삭제 실패', error); }
    }
    await store.destroy();
    return true;
};

// 점포 활성화/비활성화 토글 (이전 코드와 동일)
const toggleStoreActive = async (id, userId) => {
    const store = await Store.findByPk(id);
    if (!store) throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    if (store.owner_id !== userId) throw new ForbiddenError('해당 점포를 수정할 권한이 없습니다.');
    await store.update({ is_active: !store.is_active });
    return await Store.findByPk(id); // 업데이트된 점포 정보 반환
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