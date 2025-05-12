// frontend/src/store/chatSessionStore.js 수정
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 세션 목록 관리 스토어 개선
const useChatSessionStore = create(
    devtools((set, get) => ({
        sessions: [],
        loading: false,
        error: null,
        deleteLoading: false, // 삭제 로딩 상태 추가

        fetchSessions: async () => {
            try {
                set({ loading: true, error: null, sessions: [] }); // 기존 세션 초기화

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('로그인이 필요합니다.');
                }

                // 캐싱 방지 타임스탬프 추가
                const timestamp = new Date().getTime();

                // API 호출 - 사용자 채팅 목록 조회
                const response = await fetch(`/api/chatbots/user/sessions?t=${timestamp}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || '채팅 목록을 불러오는데 실패했습니다.');
                }

                const data = await response.json();
                console.log('[채팅세션스토어] 세션 API 응답: ', data);

                if (data.success && data.data && Array.isArray(data.data)) {
                    // 각 세션에 대해 마지막 메시지 및 thread_id 가져오기
                    const sessionsPromises = data.data.map(async (session) => {
                        try {
                            // 디버깅 로그
                            console.log('[채팅세션스토어] 세션 정보: ', session);
                            console.log(' - CHATBOT_ID: ', session.chatbot_id);
                            console.log(' - SESSION_ID: ', session.session_id);
                            console.log(' - THREAD_ID: ', session.thread_id);
                            console.log(' - CHATBOT: ', session.Chatbot);

                            // 유효한 chatbot_id 확인 - Chatbot에서 가져오거나 직접 속성 사용
                            const chatbotId = session.chatbot_id || session.Chatbot?.id;
                            
                            if (!chatbotId) {
                                console.warn('[채팅세션스토어] 유효하지 않은 세션 (chatbot_id 없음): ', session);
                                return null;
                            }

                            // 세션 ID를 사용한 대화 이력 조회
                            const historyResponse = await fetch(
                                `/api/chatbots/${chatbotId}/history?sessionId=${session.session_id}`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Cache-Control': 'no-cache'
                                    }
                                }
                            );

                            if (!historyResponse.ok) {
                                console.warn(`[채팅세션스토어] 히스토리 조회 실패 - 채팅봇 ID: ${chatbotId}, 세션 ID: ${session.session_id}`);
                                return {
                                    ...session,
                                    chatbot_id: chatbotId,
                                    lastMessage: '(메시지 내용을 불러올 수 없습니다.)',
                                    thread_id: session.thread_id || null
                                };
                            }

                            const historyData = await historyResponse.json();
                            console.log('[채팅세션스토어] 히스토리 응답: ', historyData);

                            if (historyData.success && historyData.data && historyData.data.length > 0) {
                                // 마지막 메시지 찾기
                                const sortedMessages = [...historyData.data].sort(
                                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                                );

                                const lastMessage = sortedMessages[0];

                                // 모든 메시지를 검사하여 thread_id 찾기
                                let threadId = null;
                                for (const msg of sortedMessages) {
                                    if (msg.thread_id) {
                                        threadId = msg.thread_id;
                                        console.log(`[채팅세션스토어] 채팅 기록에서 thread_id 찾음: ${threadId}`);
                                        break;
                                    }
                                }

                                // thread_id 우선순위: 세션에서 찾은 thread_id > 메시지 내 thread_id > 세션 객체의 thread_id
                                threadId = threadId || session.thread_id || null;
                                
                                console.log(`[채팅세션스토어] 최종 선택된 thread_id: ${threadId}`);

                                return {
                                    ...session,
                                    chatbot_id: chatbotId,
                                    lastMessage: lastMessage.response || lastMessage.message || '(메시지 없음)',
                                    thread_id: threadId,
                                    messages: sortedMessages
                                };
                            }

                            return {
                                ...session,
                                chatbot_id: chatbotId,
                                lastMessage: '(이전 메시지 없음)',
                                thread_id: session.thread_id || null
                            };
                        } catch (err) {
                            console.error('[채팅세션스토어] 대화 내용 조회 오류: ', err);
                            return {
                                ...session,
                                chatbot_id: session.chatbot_id || session.Chatbot?.id,
                                lastMessage: '(메시지 내용을 불러올 수 없습니다.)',
                                thread_id: session.thread_id || null
                            };
                        }
                    });

                    // 모든 프로미스 동시 실행
                    const sessionsWithMessages = await Promise.all(sessionsPromises);

                    // 유효 세션 필터링
                    const validSessions = sessionsWithMessages.filter(session => session !== null);

                    console.log('[채팅세션스토어] 유효한 세션 수: ', validSessions.length);
                    console.log('[채팅세션스토어] 유효한 세션 데이터:', validSessions);
                    
                    // 최근 세션 우선으로 정렬
                    const sortedSessions = validSessions.sort((a, b) => {
                        const aDate = a.last_chat ? new Date(a.last_chat) : new Date(0);
                        const bDate = b.last_chat ? new Date(b.last_chat) : new Date(0);
                        return bDate - aDate; // 내림차순 정렬
                    });
                    
                    set({ sessions: sortedSessions, loading: false });
                } else {
                    console.log('[채팅세션스토어] 세션 없음 또는 잘못된 응답 형식');
                    set({ sessions: [], loading: false });
                }
            } catch (err) {
                console.error('[채팅세션스토어] 채팅 목록 조회 에러: ', err);
                set({
                    error: err.message || '채팅 목록을 불러오는데 문제가 발생했습니다.',
                    loading: false
                });
            }
        },

        // 세션 삭제 기능 구현
        deleteSession: async (sessionId) => {
            // 사용자 확인
            if (!window.confirm('이 채팅 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                return false;
            }
            
            try {
                set({ deleteLoading: true });
                
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('로그인이 필요합니다.');
                }
                
                // 세션 삭제 API 호출
                const response = await fetch(`/api/chatbots/sessions/${sessionId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || '채팅 내역 삭제에 실패했습니다.');
                }
                
                // 삭제 성공 시 상태에서 해당 세션 제거
                const currentSessions = get().sessions;
                const updatedSessions = currentSessions.filter(
                    session => session.session_id !== sessionId
                );
                
                set({ sessions: updatedSessions, deleteLoading: false });
                return true;
            } catch (err) {
                console.error('[채팅세션스토어] 세션 삭제 에러: ', err);
                set({
                    error: err.message || '채팅 내역 삭제에 실패했습니다.',
                    deleteLoading: false
                });
                return false;
            }
        },
        
        // 디버깅을 위한 세션 조회 함수
        debugSession: (sessionId) => {
            const sessions = get().sessions;
            const session = sessions.find(s => s.session_id === sessionId);
            console.log(`[채팅세션스토어] 세션 디버그 - ID: ${sessionId}`, session);
            return session;
        }
    }))
);

export default useChatSessionStore;