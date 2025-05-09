// openai.service.js 파일 수정

const OpenAI = require('openai');
const logger = require('../utils/logger');

// OpenAI API 클라이언트 생성 함수
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.');
    }
    
    return new OpenAI({
        apiKey: apiKey
    });
};

/**
 * OpenAI Assistant API를 사용하여 챗봇과 대화합니다.
 */
const chatWithAssistant = async (assistantId, message, sessionId, threadId = null) => {
    try {
        // OpenAI API 인스턴스 생성
        const openai = getOpenAIClient();
        
        logger.debug(`[OpenAI Service] 챗봇 대화 시작: ${assistantId.substring(0, 10)}...`);
        logger.debug(`- 메시지: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`);
        logger.debug(`- 스레드 ID: ${threadId || 'new'}`);
        
        // 스레드 생성 또는 기존 스레드 사용
        let thread;
        if (threadId) {
            try {
                thread = await openai.beta.threads.retrieve(threadId);
                logger.debug(`[OpenAI Service] 기존 스레드 사용: ${threadId.substring(0, 10)}...`);
            } catch (error) {
                logger.error(`[OpenAI Service] 스레드 조회 실패 (${threadId}):`, error.message);
                logger.debug(`[OpenAI Service] 새 스레드 생성 중...`);
                thread = await openai.beta.threads.create();
            }
        } else {
            logger.debug(`[OpenAI Service] 새 스레드 생성 중...`);
            thread = await openai.beta.threads.create();
        }
        
        // 사용자 메시지 추가
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message
        });
        
        // 실행 생성
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistantId
        });
        
        // 실행 상태 확인 (최대 60초 대기)
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        // 타임아웃 설정
        const startTime = Date.now();
        const TIMEOUT = 60000; // 60초
        
        while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
            // 타임아웃 체크
            if (Date.now() - startTime > TIMEOUT) {
                logger.error(`[OpenAI Service] 실행 타임아웃: ${runStatus.status}`);
                throw new Error('응답 생성 시간이 초과되었습니다.');
            }
            
            // 1초 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 상태 업데이트
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            logger.debug(`[OpenAI Service] 실행 상태: ${runStatus.status}`);
            
            // 실패 상태 확인
            if (runStatus.status === 'failed') {
                logger.error(`[OpenAI Service] 실행 실패:`, runStatus.last_error);
                throw new Error(`OpenAI 응답 생성 실패: ${runStatus.last_error?.message || '알 수 없는 오류'}`);
            }
        }
        
        // 응답 메시지 조회
        const messages = await openai.beta.threads.messages.list(thread.id);
        
        // 가장 최근 어시스턴트 메시지 찾기
        const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
        
        if (assistantMessages.length === 0) {
            logger.error(`[OpenAI Service] 어시스턴트 응답 없음`);
            throw new Error('응답을 받지 못했습니다.');
        }
        
        const latestMessage = assistantMessages[0];
        
        // 응답 텍스트 정제
        let responseText = '';
        
        if (latestMessage.content && latestMessage.content.length > 0) {
            // 응답 내용 기록
            logger.debug(`[OpenAI Service] 원본 응답 타입:`, latestMessage.content[0].type);
            
            if (latestMessage.content[0].type === 'text') {
                responseText = latestMessage.content[0].text.value;
                
                // 원본 응답 로깅 (일부만)
                const originalResponsePreview = responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '');
                logger.debug(`[OpenAI Service] 원본 응답 (일부): ${originalResponsePreview}`);
                logger.debug(`[OpenAI Service] 원본 응답 길이: ${responseText.length}`);
                
                // 특수 마크업 패턴 확인 (예: [8:0 + 피오르틸러츠])
                const specialMarkupMatch = responseText.match(/\[\d+:\d+\s*\+?\s*[^\]]*\]/g);
                if (specialMarkupMatch) {
                    logger.warn(`[OpenAI Service] 특수 마크업 패턴 발견:`, specialMarkupMatch);
                    
                    // 특수 마크업 제거
                    responseText = responseText
                        .replace(/\[\d+:\d+\s*\+?\s*[^\]]*\]/g, '') // [8:0 + 피오르틸러츠] 같은 패턴 제거
                        .trim();
                }
                
                // undefined 관련 패턴 확인 및 제거
                const undefinedMatch = responseText.match(/undefined|\.undefined|\,undefined/g);
                if (undefinedMatch) {
                    logger.warn(`[OpenAI Service] undefined 패턴 발견:`, undefinedMatch);
                    
                    // undefined 패턴 제거
                    responseText = responseText
                        .replace(/undefined/g, '')  // 'undefined' 제거
                        .replace(/\.\s*undefined/g, '.') // '.undefined' 제거
                        .replace(/\,\s*undefined/g, ',') // ',undefined' 제거
                        .replace(/\?\s*undefined/g, '?') // '?undefined' 제거
                        .replace(/\!\s*undefined/g, '!') // '!undefined' 제거
                        .replace(/\:\s*undefined/g, ':') // ':undefined' 제거
                        .trim();
                }
                
                // 응답 정제 후 로깅
                logger.debug(`[OpenAI Service] 정제된 응답 (일부): ${responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')}`);
            } else {
                logger.error(`[OpenAI Service] 지원되지 않는 응답 타입:`, latestMessage.content[0].type);
                responseText = '죄송합니다. 응답 형식이 지원되지 않습니다.';
            }
        } else {
            logger.error(`[OpenAI Service] 응답 내용 없음`);
            responseText = '죄송합니다. 응답을 생성할 수 없습니다.';
        }
        
        // 수정: responseData -> responseText로 변경
        return {
            response: responseText,
            threadId: thread.id,
            messageId: latestMessage.id
        };
    } catch (error) {
        logger.error(`[OpenAI Service] 챗봇 대화 중 오류:`, error);
        throw new Error(`챗봇 응답 생성 실패: ${error.message}`);
    }
};

/**
 * OpenAI에 새 어시스턴트 생성
 */
const createAssistant = async (name, instructions, model = 'gpt-4o-mini') => {
    try {
        const openai = getOpenAIClient();
        
        const assistant = await openai.beta.assistants.create({
            name,
            instructions,
            model,
            tools: [{ type: 'retrieval' }]
        });
        
        return assistant.id;
    } catch (error) {
        logger.error('OpenAI Assistant 생성 실패:', error);
        throw new Error(`Assistant 생성 실패: ${error.message}`);
    }
};

/**
 * 기존 어시스턴트 업데이트
 */
const updateAssistant = async (assistantId, data) => {
    try {
        const openai = getOpenAIClient();
        
        await openai.beta.assistants.update(assistantId, {
            name: data.name,
            instructions: data.instructions,
            model: data.model
        });
        
        return true;
    } catch (error) {
        logger.error(`Assistant 업데이트 실패 (ID: ${assistantId}):`, error);
        throw new Error(`Assistant 업데이트 실패: ${error.message}`);
    }
};

/**
 * 어시스턴트 삭제
 */
const deleteAssistant = async (assistantId) => {
    try {
        const openai = getOpenAIClient();
        
        await openai.beta.assistants.del(assistantId);
        return true;
    } catch (error) {
        logger.error(`Assistant 삭제 실패 (ID: ${assistantId}):`, error);
        throw new Error(`Assistant 삭제 실패: ${error.message}`);
    }
};

module.exports = {
    createAssistant,
    updateAssistant,
    deleteAssistant,
    chatWithAssistant
};