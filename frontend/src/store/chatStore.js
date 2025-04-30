import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useChatStore = create(
    devtools (
        persist (
            (set, get) => ({
                // 상태
                messages: [],
                isLoading: false,
                isSending: false,
                error: null,
                chatbotId: null,
                sessionId: null,
                threadId: null,
                store: null,
                user: null,

                // 액션
                setSessionId: (sessionId) => set({ sessionId }),
                setThreadId: (threadId) => set({ threadId }),
                setChatbotId: (chatbotId) => set({ chatbotId }),

                //사용자 정보 조회
                fetchUserInfo: async() => {
                    try {
                        const token = localStorage.getItem('accessToken');
                        if (!token) return;

                        const response = await fetch('/api/auth/me', {
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const user = data.data?.user || null;

                            if (user) {
                                localStorage.setItem('userId', user.id);
                                set({ user });
                                return user;
                            }
                        }
                    } catch (error) {
                        console.error('정보 조회 실패', error);
                    } return null;
                },

                // 점포 & 챗봇 정보 조회
                fetchStoreAndChatbot: async(storeId) => {
                    set({ isLoading: true, error: null });

                    try {
                        // 점포 정보
                        const storeResponse = await fetch(`/api/stores/${storeId}`);
                        if (!storeResponse.ok) {
                            throw new Error(storeResponse.status === 404
                                ? '존재하지 않는 점포입니다.'
                                : '점포 정보 불러오기 실패'
                            );
                        }

                        const storeData = await storeResponse.json();
                        set({ store: storeData.data });

                        // 챗봇 정보
                        const chatbotResponse = await fetch(`/api/chatbots/store/${storeId}`);
                        if (!chatbotResponse.ok) {
                            throw new Error('챗봇 정보 불러오기 실패');
                        }

                        const chatbotData = await chatbotResponse.json();
                        set({ chatbotId: chatbotData.data.id});

                        return {
                            store: storeData.data,
                            chatbot: chatbotData.data
                        };
                    } catch (error) {
                        console.error('데이터 로딩 중 오류', error);
                        set({ error: error.message });
                        return null;
                    } finally {
                        set({ isLoading: false });
                    }
                },

                // 대화 기록 조회
                fetchChatHistory: async(options = {}) => {
                    const { chatbotId, sessionId, threadId } = options.chatbotId
                      ? options
                      : get();
                  
                    if (!chatbotId || !sessionId) {
                      console.error('채팅 기록 로드 실패: 챗봇 ID 또는 세션 ID가 없음');
                      console.error('- chatbotId:', chatbotId);
                      console.error('- sessionId:', sessionId);
                      console.error('- threadId:', threadId);
                      return [];
                    }
                  
                    set({ isLoading: true, error: null });
                  
                    try {
                      // threadID 있으면 로그 저장
                      if (threadId) {
                        console.log('채팅 기록 요청 시 스레드 ID 사용:', threadId);
                      }
                  
                      // 로그인 시 인증 설정
                      const headers = {};
                      const token = localStorage.getItem('accessToken');
                      if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                      }
                  
                      // 기록 요청
                      console.log(`채팅 기록 요청 URL: /api/chatbots/${chatbotId}/history?sessionId=${sessionId}`);
                  
                      const historyResponse = await fetch(
                        `/api/chatbots/${chatbotId}/history?sessionId=${sessionId}`,
                        { headers }
                      );
                  
                      if (!historyResponse.ok) {
                        throw new Error('채팅 기록을 불러오는데 실패했습니다');
                      }
                  
                      const historyData = await historyResponse.json();
                      console.log('채팅 기록 응답:', historyData);
                  
                      if (historyData.data && Array.isArray(historyData.data)) {
                        const formattedMessages = [];
                  
                        // 스레드 ID 검색 (기존 스레드 없는 경우)
                        if (!get().threadId) {
                          for (const entry of historyData.data) {
                            if (entry.thread_id) {
                              console.log('대화 기록에서 스레드 ID 발견:', entry.thread_id);
                              set({ threadId: entry.thread_id });
                              break;
                            }
                          }
                        }
                  
                        historyData.data.forEach((entry) => {
                          // user
                          formattedMessages.push({
                            id: `user_${entry.id}`,
                            text: entry.message,
                            isUser: true,
                            timestamp: new Date(
                              entry.timestamp || entry.created_at || Date.now()
                            ),
                            isHistoryMessage: true,
                          });
                  
                          // chatbot
                          formattedMessages.push({
                            id: `bot_${entry.id}`,
                            text: entry.response,
                            isUser: false,
                            timestamp: new Date(
                              entry.timestamp || entry.created_at || Date.now()
                            ),
                            isHistoryMessage: true,
                          });
                        });
                  
                        set({ messages: formattedMessages });
                        return formattedMessages;
                      }
                  
                      // 대화 기록 없거나 로드 실패 시 빈 배열 반환
                      return [];
                    } catch (error) {
                      console.error('대화 기록 로딩 중 오류:', error);
                      set({ error: error.message });
                      return [];
                    } finally {
                      set({ isLoading: false });
                    }
                  },

                // 인사말 메시지
                setGreetingMessage: (greeting) => {
                    const greetingMessage = {
                        id: 'initial',
                        text: greeting || '안녕하세요! 무엇을 도와드릴까요?',
                        isUser: false,
                        timestamp: new Date(),
                        isHistoryMessage: true,
                    };

                    set({ messages: [greetingMessage] });
                },

                // 메시지 전송
                sendMessage: async(message) => {
                    const { chatbotId, sessionId, threadId, user, messages } = get();
                
                    if (!message.trim() || get().isSending) return;
                
                    const userMessage = {
                        id: `user_${Date.now()}`,
                        text: message,
                        isUser: true,
                        timestamp: new Date(),
                    };
                
                    set({
                        messages: [...messages, userMessage],
                        isSending: true
                    });
                
                    try {
                        if (!chatbotId) {
                            throw new Error('챗봇 ID가 없습니다.');
                        }
                
                        // 위치 정보 가져오기
                        let location = null;
                        if (navigator.geolocation) {
                            try {
                                const position = await new Promise((resolve, reject) => {
                                    navigator.geolocation.getCurrentPosition (
                                        resolve,
                                        reject,
                                        {
                                            timeout: 5000,
                                            maximumAge: 10000,
                                        }
                                    );
                                });
                
                                location = {
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude,
                                };
                            } catch (e) {
                                console.log('위치 정보를 가져올 수 없습니다.', e);
                            }
                        }
                
                        // 요청 본문 구성 (threadId 추가)
                        const requestBody = {
                            message: message,
                            sessionId: sessionId,
                            threadId: threadId,
                            location: location
                        };
                
                        console.log('메시지 전송 요청 본문: ', requestBody);
                
                        // 헤더 구성 (로그인한 경우 토큰 추가)
                        const headers = {
                            'Content-Type': 'application/json',
                        };
                
                        if (user) {
                            const token = localStorage.getItem('accessToken');
                            if (token) {
                                headers['Authorization'] = `Bearer ${token}`;
                            }
                        }
                
                        const response = await fetch(
                            `/api/chatbots/${chatbotId}/chat`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify(requestBody),
                            });
                            
                        // 수정된 부분: !response.ok로 변경해야 함
                        if (!response.ok) {
                            throw new Error('챗봇 응답 받아오기 실패');
                        }
                
                        const responseData = await response.json();
                        console.log('챗봇 응답 데이터: ', responseData);
                
                        if (responseData.data.sessionId && !get().sessionId) {
                            set({ sessionId: responseData.data.sessionId });
                
                            if (user) {
                                localStorage.setItem(
                                    `chat_user_${user.id}_chatbot_${chatbotId}`,
                                    responseData.data.sessionId
                                );
                            } else {
                                localStorage.setItem(
                                    `chat_session_${chatbotId}`,
                                    responseData.data.sessionId
                                );
                            }
                        }
                
                        // 스레드 ID 업데이트 (서버 반환 시)
                        if (responseData.data.threadId) {
                            console.log('서버에서 받은 새 스레드 ID: ', responseData.data.threadId);
                            set({ threadId: responseData.data.threadId });
                        }
                
                        // 챗봇 응답 메시지 추가
                        const botMessage = {
                            id: `bot_${Date.now()}`,
                            text: responseData.data.response
                                .replace(/undefined/g, '') // 오타 수정: replcae -> replace
                                .trim(),
                            isUser: false,
                            timestamp: new Date(),
                        };
                
                        set(state => ({
                            messages: [...state.messages, botMessage],
                            isSending: false,
                        }));
                
                        return botMessage;
                    } catch (error) {
                        console.error('메시지 전송 오류: ', error);
                
                        // 오류 메시지 추가
                        const errorMessage = {
                            id: `error_${Date.now()}`,
                            text: '죄송합니다, 메시지를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                            isUser: false,
                            isError: true,
                            timestamp: new Date(),
                        };
                
                        set(state => ({
                            messages: [...state.messages, errorMessage],
                            isSending: false,
                            error: error.message,
                        }));
                
                        return null;
                    }
                },

                // 모든 상태 초기화
                reset: () => set({
                    messages: [],
                    isLoading: false,
                    isSending: false,
                    error: null,
                    chatbotId: null,
                    sessionId: null,
                    threadId: null,
                    store:null
                }),
            }),
            {
                name: 'chat-storage',
                partialize: (state) => ({
                    sessionId: state.sessionId,
                    threadId: state.threadId,
                    chatbotId: state.chatbotId
                }),
            }
        )
    )
);

export default useChatStore;