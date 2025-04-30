import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useChatSessionStore = create(
    devtools((set, get) => ({
        sessions: [],
        loading: false,
        error: null,

        fetchSessions: async () => {
            try {
                set({ loading: true, error: null });

                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('로그인이 필요합니다.');
                }

                // 캐싱 방지 타임스탬프 추가
                const timestamp = new Date().getTime(); // getItem()이 아닌 getTime()

                // API 호출 - 사용자 채팅 목록 조회
                const response = await fetch(`/api/chatbots/user/sessions?t=${timestamp}`, { // sessions=timestamp가 아닌 sessions?t=timestamp
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
                console.log('세션 API 응답: ', data);

                if (data.success && data.data && Array.isArray(data.data)) {
                    // 각 세션에 대해 마지막 메시지 및 thread_id 가져오기
                    const sessionsWithMessages = await Promise.all( // sessioNWithMessage가 아닌 sessionsWithMessages
                        data.data.map(async (session) => {
                            try {
                                // 디버깅 로그
                                console.log('세션 정보: ', session); // sesison이 아닌 session
                                console.log(' - CHATBOT_ID: ', session.chatbot_id);
                                console.log(' - SESSION_ID: ', session.session_id);
                                console.log(' - THREAD_ID: ', session.thread_id);
                                console.log(' - CHATBOT: ', session.Chatbot); // chatbot이 아닌 Chatbot (대소문자 주의)

                                // 유효한 chatbot_id 확인
                                if (!session.chatbot_id && !session.Chatbot?.id) {
                                    console.warn('유효하지 않은 세션 (chatbot_id 없음): ', session);
                                    return null;
                                }

                                // 실제 사용 chatbot_id
                                const chatbotId = session.chatbot_id || session.Chatbot?.id; // chatbot이 아닌 Chatbot

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

                                if (historyResponse.ok) {
                                    const historyData = await historyResponse.json();
                                    console.log('히스토리 응답: ', historyData);

                                    if (historyData.success && historyData.data && historyData.data.length > 0) {
                                        // 마지막 메시지 찾기
                                        const sortedMessages = [...historyData.data].sort(
                                            (a, b) => new Date(b.created_at) - new Date(a.created_at)
                                        );

                                        const lastMessage = sortedMessages[0];

                                        // 가장 최근 메시지 + thread_id 가져오기
                                        const threadId = lastMessage.thread_id ||
                                            sortedMessages.find(msg => msg.thread_id)?.thread_id ||
                                            session.thread_id || null;

                                        console.log('채팅 기록에서 찾은 thread_id: ', threadId);

                                        return {
                                            ...session,
                                            lastMessage: lastMessage.response || lastMessage.message || '(메시지 없음)',
                                            thread_id: threadId // threadId가 아닌 thread_id (일관성 유지)
                                        };
                                    }
                                }

                                return {
                                    ...session,
                                    lastMessage: '(메시지 내용을 불러올 수 없습니다.)'
                                };
                            } catch (err) {
                                console.error('대화 내용 조회 오류: ', err);
                                return {
                                    ...session,
                                    lastMessage: '(메시지 내용을 불러올 수 없습니다.)'
                                };
                            }
                        })
                    );

                    // 유효 세션 필터링
                    const validSessions = sessionsWithMessages.filter(session => session !== null);

                    console.log('유효한 세션 수: ', validSessions.length);
                    set({ sessions: validSessions, loading: false });
                } else {
                    set({ sessions: [], loading: false });
                }
            } catch (err) {
                console.error('채팅 목록 조회 에러: ', err);
                set({
                    error: err.message || '채팅 목록을 불러오는데 문제가 발생했습니다.',
                    loading: false
                });
            }
        },

        // 세션 삭제 기능 (필요한 경우 추가)
        deleteSession: async (sessionId) => {
            // 구현 필요시 추가
        }
    }))
);

export default useChatSessionStore;