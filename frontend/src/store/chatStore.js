import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useChatStore = create(
    devtools(
        persist(
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
                setError: (error) => set({ error }),
                setStore: (storeData) => set({ store: storeData }),

                fetchUserInfo: async () => {
                    // console.log('[chatStore] fetchUserInfo called');
                    try {
                        const token = localStorage.getItem('accessToken');
                        if (!token) return null;
                        const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                        if (response.ok) {
                            const data = await response.json();
                            const user = data.data?.user || null;
                            if (user) { localStorage.setItem('userId', user.id); set({ user }); return user; }
                        }
                    } catch (e) { console.error('[chatStore] fetchUserInfo Error:', e); }
                    return null;
                },

                fetchChatHistory: async (options = {}) => {
                    const currentChatbotId = options.chatbotId || get().chatbotId;
                    const currentSessionId = options.sessionId || get().sessionId;

                    // console.log('[chatStore] fetchChatHistory attempt:', { currentChatbotId, currentSessionId });

                    if (!currentChatbotId || !currentSessionId) {
                        // console.log('[chatStore] fetchChatHistory: Skipped. chatbotId or sessionId missing.');
                        set(state => ({ ...state, isLoading: false, messages: [] }));
                        return [];
                    }

                    set(state => ({ ...state, isLoading: true, error: null, messages: [] })); // 기록 로드 시작 시 메시지 비우기
                    try {
                        const headers = {};
                        const token = localStorage.getItem('accessToken');
                        if (token) headers['Authorization'] = `Bearer ${token}`;

                        const historyResponse = await fetch(`/api/chatbots/${currentChatbotId}/history?sessionId=${currentSessionId}`, { headers });

                        if (!historyResponse.ok) {
                            const errorText = await historyResponse.text();
                            throw new Error(`채팅 기록 로드 실패 (${historyResponse.status}): ${errorText}`);
                        }
                        const historyData = await historyResponse.json();

                        // API 응답 구조가 { data: { chatlogs: [...] } } 또는 { data: [...] } 일 수 있음
                        const chatlogs = historyData.data?.chatlogs || historyData.data;

                        if (chatlogs && Array.isArray(chatlogs)) {
                            const formattedMessages = [];
                            let foundThreadId = get().threadId;

                            chatlogs.forEach((entry) => {
                                if (entry.thread_id && !foundThreadId) {
                                    foundThreadId = entry.thread_id;
                                }
                                
                                let botImageUrl = entry.botProfileImage || entry.Chatbot?.Store?.image_url || get().store?.image_url;
                                let storeName = entry.storeName || entry.Chatbot?.Store?.name || get().store?.name;

                                formattedMessages.push({ id: `user_${entry.id}`, text: entry.message, isUser: true, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                                if (entry.response) {
                                    formattedMessages.push({ id: `bot_${entry.id}`, text: entry.response, isUser: false, botProfileImage: botImageUrl, storeName: storeName, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                                }
                            });

                            if (foundThreadId && foundThreadId !== get().threadId) {
                                set(state => ({ ...state, threadId: foundThreadId }));
                            }
                            set(state => ({ ...state, messages: formattedMessages, isLoading: false }));
                            return formattedMessages;
                        }
                        set(state => ({ ...state, isLoading: false, messages: [] })); // 유효한 기록이 없는 경우
                        return [];
                    } catch (e) {
                        console.error('[chatStore] fetchChatHistory Error:', e);
                        set(state => ({ ...state, error: e.message, isLoading: false, messages: [] }));
                        return [];
                    }
                },

                setGreetingMessage: (greeting) => {
                    const currentStore = get().store;
                    const currentMessages = get().messages;

                    // console.log('[chatStore] setGreetingMessage attempt:', { greeting, storeExists: !!currentStore, messagesLength: currentMessages.length });

                    if (currentMessages.length === 0 && currentStore) { // 메시지가 없고, 스토어 정보가 있을 때만
                        const greetingMessage = {
                            id: 'initial',
                            text: greeting || `안녕하세요! ${currentStore.name || '고객'}님, 무엇을 도와드릴까요?`,
                            isUser: false,
                            timestamp: new Date(),
                            isHistoryMessage: true,
                            botProfileImage: currentStore.image_url || null,
                            storeName: currentStore.name || null,
                        };
                        // console.log('[chatStore] Adding greeting message:', greetingMessage);
                        set({ messages: [greetingMessage] }); // 다른 상태는 변경하지 않고 messages만 업데이트
                    }
                },

                sendMessage: async (message, explicitStoreInfo = {}) => {
                    const { chatbotId, sessionId, threadId, user, store } = get();

                    if (!message.trim() || get().isSending) return;
                    if (!chatbotId) { set({ error: '챗봇 ID가 없습니다. 페이지를 새로고침하거나 다시 시도해주세요.' }); return; }
                    if (!sessionId) { set({ error: '세션 ID가 없습니다. 페이지를 새로고침하거나 다시 시도해주세요.' }); return; }

                    const userMessage = { id: `user_${Date.now()}`, text: message, isUser: true, timestamp: new Date() };
                    set(s => ({ ...s, messages: [...s.messages, userMessage], isSending: true, error: null }));

                    try {
                        // ... (fetch 로직은 이전과 유사하게 유지)
                        const requestBody = { message, sessionId, threadId: threadId || null, location: null };
                        const headers = { 'Content-Type': 'application/json' };
                        const token = localStorage.getItem('accessToken');
                        if (user && token) {
                            headers['Authorization'] = `Bearer ${token}`;
                        }
                        
                        const response = await fetch(`/api/chatbots/${chatbotId}/chat`, { method: 'POST', headers, body: JSON.stringify(requestBody) });
                        
                        if (!response.ok) {
                            let errorText = `서버 오류 (${response.status})`;
                            try { const errorData = await response.json(); errorText = errorData.message || errorData.error || JSON.stringify(errorData); }
                            catch { errorText = (await response.text()) || errorText; }
                            throw new Error(`챗봇 응답 실패: ${errorText}`);
                        }
                        
                        const responseData = await response.json();
                        if (!responseData?.data) throw new Error('서버 응답 형식 오류 (data 객체 누락)');

                        if (responseData.data.sessionId && responseData.data.sessionId !== get().sessionId) {
                            set(s => ({ ...s, sessionId: responseData.data.sessionId }));
                        }
                        if (responseData.data.threadId && responseData.data.threadId !== get().threadId) {
                            set(s => ({ ...s, threadId: responseData.data.threadId }));
                        }
                        
                        const rawBotText = responseData.data.response;
                        
                        const botMessage = {
                            id: `bot_${Date.now()}`,
                            text: rawBotText || '죄송합니다, 응답을 생성할 수 없습니다.',
                            isUser: false,
                            timestamp: new Date(),
                            botProfileImage: explicitStoreInfo?.botProfileImage || store?.image_url || null,
                            storeName: explicitStoreInfo?.storeName || store?.name || null,
                        };

                        set(s => ({ ...s, messages: [...s.messages, botMessage], isSending: false }));
                        return botMessage;
                    } catch (e) {
                        console.error('[chatStore] sendMessage Error:', e);
                        const errorMessageText = e.message.includes('챗봇 응답 실패') ? e.message : '죄송합니다, 메시지 처리 중 오류가 발생했습니다.';
                        const errorMessage = { id: `error_${Date.now()}`, text: errorMessageText, isUser: false, isError: true, timestamp: new Date() };
                        set(s => ({ ...s, messages: [...s.messages, errorMessage], isSending: false, error: e.message }));
                        return null;
                    }
                },
                reset: () => {
                    // console.log('[chatStore] reset called');
                    set(state => ({ // 두 번째 인자로 false를 주어 persist 미들웨어의 병합을 막을 수 있습니다.
                            ...state,    // 또는 필요한 부분만 명시적으로 null 처리
                            messages: [],
                            isLoading: false,
                            isSending: false,
                            error: null,
                            store: null,      // ★ 스토어 정보 초기화
                            chatbotId: null,  // ★ 챗봇 ID 초기화
                            // sessionId와 threadId는 유지하거나, 필요시 초기화
                        }), false);
                                set(state => ({
                                    ...state,
                                    messages: [],
                                    isLoading: false,
                                    isSending: false,
                                    error: null,
                                    store: null,
                                    chatbotId: null,
                                }), false);
                },
            }),
            {
                name: 'chat-storage',
                partialize: (state) => ({
                    sessionId: state.sessionId,
                    threadId: state.threadId,
                    chatbotId: state.chatbotId,
                    user: state.user,
                }),
            }
        )
    )
);

export default useChatStore;