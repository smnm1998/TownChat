const { Store, User, Chatbot, Op } = require('../models');
const { NotFoundError, ForbiddenError } = require('../common/errors');
const fs = require('fs');
const path = require('path');
const util = require('util');
const logger = require('../utils/logger');
const openaiService = require('../services/openai.service');

// 모든 점포 목록 조회
const getAllStores = async (option = {}) => {
    const { page = 1, limit = 10, search = null, active = null, userId = null } = option;

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
    const latDelta = radiusKm / 111;
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
        limit: parseInt(limit),
        offset: parseInt(offset),
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
    const store = await Store.findByPk(storeId, {
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
const createStore = async (userId, storeData, files = null) => {
    // 이미지 파일 처리
    let imageUrl = null;
    if (files && files.image && files.image[0]) {
        const imageFile = files.image[0];
        console.log('처리할 이미지 파일:', imageFile.originalname, imageFile.size);
        
        // 업로드 폴더 경로
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');
        console.log('업로드 디렉토리 경로:', uploadDir);
        
        // 폴더 X -> 생성
        try {
            if (!fs.existsSync(uploadDir)) {
                console.log('폴더 생성 시도:', uploadDir);
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('폴더 생성 성공');
            }
        } catch (dirError) {
            console.error('폴더 생성 실패:', dirError);
            // 폴더 생성 실패 시도 계속 진행
        }

        // 파일명 생성
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        console.log('파일 저장 경로:', filePath);

        try {
            // 파일 저장
            const writeFile = util.promisify(fs.writeFile);
            await writeFile(filePath, imageFile.buffer);
            console.log('파일 저장 성공');
            
            // 저장된 img URL 설정
            imageUrl = `/uploads/stores/${fileName}`;
            console.log('설정된 이미지 URL:', imageUrl);
        } catch (fileError) {
            console.error('파일 저장 실패:', fileError);
            // 파일 저장 실패해도 계속 진행
        }
    } else {
        console.log('처리할 이미지 파일이 없음. files 객체:', files);
    }

    // 지식 베이스 파일 처리
    let knowledgeBase = storeData.knowledge_base || '';
    if (files && files.knowledge_base_file && files.knowledge_base_file[0]) {
        try {
            // 텍스트 파일 읽기
            const knowledgeFile = files.knowledge_base_file[0];
            const knowledgeContent = knowledgeFile.buffer.toString('utf8');
            
            // 지식 베이스 텍스트에 파일 내용 추가
            if (knowledgeContent) {
                knowledgeBase += '\n\n' + knowledgeContent;
            }
        } catch (error) {
            logger.error('지식 베이스 파일 처리 오류: ', error);
            // 오류가 발생해도 계속 진행
        }
    }

    // 점포 데이터 생성
    const newStore = await Store.create({
        ...storeData,
        owner_id: userId,
        image_url: imageUrl,
        knowledge_base: knowledgeBase,
        assistant_id: storeData.assistant_id || null
    });

    // 점포 생성 후 자동으로 챗봇 생성
    try {
        logger.info(`점포 ID ${newStore.id}에 대한 챗봇 자동 생성 시작`);
        
        // 챗봇 생성에 필요한 데이터 준비
        const chatbotData = {
            store_id: newStore.id,
            name: `${newStore.name} 챗봇`,
            greeting_message: '안녕하세요! 무엇을 도와드릴까요?',
            model: 'gpt-4o-mini',
            assistant_id: storeData.assistant_id || null,
            knowledge_base: knowledgeBase
        };
        
        // 챗봇 서비스 모듈 직접 불러오기
        const chatbotService = require('../chatbot/chatbot.service');
        
        // 챗봇 생성 서비스 호출
        const chatbot = await chatbotService.createChatbot(newStore.id, chatbotData);
        
        logger.info(`점포 ID ${newStore.id}에 대한 챗봇이 성공적으로 생성되었습니다. 챗봇 ID: ${chatbot.id}`);
    } catch (error) {
        logger.error(`점포 ID ${newStore.id}에 대한 챗봇 자동 생성 중 오류 발생:`, error);
        // 챗봇 생성 실패해도 점포 생성은 성공으로 처리
    }

    return newStore;
};

// 점포 정보 업데이트
const updateStore = async (id, userId, updateData, files = null) => {
    const store = await Store.findByPk(id);

    if (!store) {
        throw new NotFoundError('해당 점포를 찾을 수 없습니다.');
    }

    // 점포 소유자 확인 (관리자 x)
    if (store.owner_id !== userId) {
        throw new ForbiddenError('해당 점포를 수정할 권한이 없습니다.');
    }

    // 이미지 파일 처리
    console.log('Files object in updateStore:', files);
    if (files && files.image && files.image[0]) {
        const imageFile = files.image[0];
        console.log('Processing image file:', imageFile.originalname);
        
        // 기존 이미지 파일 삭제 (존재할 경우)
        if (store.image_url) {
            try {
                const oldImagePath = path.join(__dirname, '../../public', store.image_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            } catch (error) {
                logger.error('기존 이미지 파일 삭제 실패: ', error);
            }
        }
        
        // 업로드 폴더 경로
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');
        
        // 폴더가 없으면 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // 파일명 생성
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);
        
        // 파일 저장
        const writeFile = util.promisify(fs.writeFile);
        try {
            await writeFile(filePath, imageFile.buffer);
            console.log('Image saved successfully to:', filePath);
            updateData.image_url = `/uploads/stores/${fileName}`;
        } catch (fileError) {
            console.error('Image file save error:', fileError);
        }
    }

    // 지식 베이스 파일 처리
    if (files && files.knowledge_base_file && files.knowledge_base_file[0]) {
        try {
            // 텍스트 파일 읽기
            const knowledgeFile = files.knowledge_base_file[0];
            const knowledgeContent = knowledgeFile.buffer.toString('utf8');
            
            // 지식 베이스 텍스트 설정 (기존 내용 대체)
            if (knowledgeContent) {
                updateData.knowledge_base = knowledgeContent;
                logger.info(`점포 ID ${id}의 지식 베이스 업데이트, 길이: ${knowledgeContent.length}`);
            }
        } catch (error) {
            logger.error('지식 베이스 파일 처리 오류: ', error);
        }
    }

    // 점포 정보 업데이트
    await store.update(updateData);
    
    // 챗봇 지식 베이스도 업데이트 (연동)
    try {
        // 연결된 챗봇 찾기
        const chatbotService = require('../chatbot/chatbot.service');
        const chatbot = await Chatbot.findOne({ where: { store_id: id } });
        
        if (chatbot && updateData.knowledge_base) {
            await chatbot.update({
                knowledge_base: updateData.knowledge_base,
                last_updated: new Date()
            });
            
            // OpenAI Assistant 업데이트
            const assistantInstructions = `
                당신은 '${store.name}'의 챗봇 도우미입니다. 
                고객들에게 친절하고 정확한 정보를 제공해주세요.
                항상 공손하고 전문적인 태도를 유지하세요.
                제공된 정보를 기반으로 질문에 답변하되, 모르는 내용에 대해서는 솔직하게 모른다고 말하세요.
                
                다음은 지식 베이스 내용입니다:
                ${updateData.knowledge_base}
            `;
            
            await openaiService.updateAssistant(chatbot.assistant_id, {
                instructions: assistantInstructions
            });
        }
    } catch (error) {
        logger.error('챗봇 지식 베이스 업데이트 실패:', error);
        // 챗봇 업데이트 실패해도 점포 업데이트는 성공으로 처리
    }

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
        // Assistant ID가 있으면 OpenAI에서도 삭제 처리
        try {
            await openaiService.deleteAssistant(store.assistant_id);
        } catch (error) {
            logger.error('OpenAI Assistant 삭제 실패', error);
        }
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