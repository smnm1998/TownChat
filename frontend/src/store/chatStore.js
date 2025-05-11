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
                setStore: (storeData) => {
                    // console.log('[chatStore] setStore called with:', storeData);
                    set({ store: storeData });
                },

                fetchUserInfo: async () => {
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
                    if (!currentChatbotId || !currentSessionId) return [];
                    set(state => ({ ...state, isLoading: true, error: null }));
                    try {
                        const headers = {};
                        const token = localStorage.getItem('accessToken');
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        const historyResponse = await fetch(`/api/chatbots/${currentChatbotId}/history?sessionId=${currentSessionId}`, { headers });
                        if (!historyResponse.ok) throw new Error('채팅 기록 로드 실패');
                        const historyData = await historyResponse.json();

                        if (historyData.data && Array.isArray(historyData.data)) {
                            const formattedMessages = [];
                            let foundThreadId = get().threadId;
                            historyData.data.forEach((entry) => {
                                if (entry.thread_id && !foundThreadId) foundThreadId = entry.thread_id;
                                
                                let botImageUrl = entry.Chatbot?.Store?.image_url;
                                let storeName = entry.Chatbot?.Store?.name;
                                if (!botImageUrl && get().store) {
                                    botImageUrl = get().store.image_url;
                                    storeName = get().store.name;
                                }

                                formattedMessages.push({ id: `user_${entry.id}`, text: entry.message, isUser: true, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                                formattedMessages.push({ id: `bot_${entry.id}`, text: entry.response, isUser: false, botProfileImage: botImageUrl, storeName: storeName, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                            });
                            if (foundThreadId && foundThreadId !== get().threadId) set(state => ({ ...state, threadId: foundThreadId }));
                            set(state => ({ ...state, messages: formattedMessages, isLoading: false }));
                            return formattedMessages;
                        }
                        set(state => ({ ...state, isLoading: false, messages: [] }));
                        return [];
                    } catch (e) { console.error('[chatStore] fetchChatHistory Error:', e); set(state => ({ ...state, error: e.message, isLoading: false })); return []; }
                },

                setGreetingMessage: (greeting) => {
                    const currentStoreOnGreeting = get().store;
                    const greetingMessage = {
                        id: 'initial', text: greeting || '안녕하세요! 무엇을 도와드릴까요?', isUser: false, timestamp: new Date(), isHistoryMessage: true,
                        botProfileImage: currentStoreOnGreeting?.image_url || null,
                        storeName: currentStoreOnGreeting?.name || null,
                    };
                    set(state => (state.messages.length === 0 ? { ...state, messages: [greetingMessage] } : state));
                },

                sendMessage: async (message, explicitStoreInfo = {}) => {
                    const { chatbotId, sessionId, threadId, user } = get();

                    if (!message.trim() || get().isSending) return;
                    if (!chatbotId) { set({ error: '챗봇 ID가 없습니다' }); return; }
                    if (!sessionId) { set({ error: '세션 ID가 없습니다' }); return; }

                    const userMessage = { id: `user_${Date.now()}`, text: message, isUser: true, timestamp: new Date() };
                    set(s => ({ ...s, messages: [...s.messages, userMessage], isSending: true, error: null }));

                    try {
                        let location = null;
                        const requestBody = { message, sessionId, threadId: threadId || null, location };
                        const headers = { 'Content-Type': 'application/json' };
                        if (user) { const token = localStorage.getItem('accessToken'); if (token) headers['Authorization'] = `Bearer ${token}`; }
                        
                        const response = await fetch(`/api/chatbots/${chatbotId}/chat`, { method: 'POST', headers, body: JSON.stringify(requestBody) });
                        
                        if (!response.ok) {
                            let errorText = `서버 오류 (${response.status})`;
                            try { const errorData = await response.json(); errorText = errorData.message || errorData.error || JSON.stringify(errorData); }
                            catch { errorText = await response.text() || errorText; }
                            throw new Error(`챗봇 응답 실패: ${errorText}`);
                        }
                        
                        const responseData = await response.json();
                        if (!responseData?.data) throw new Error('서버 응답 형식 오류');

                        if (responseData.data.sessionId && !get().sessionId) {
                            const sessionToStore = responseData.data.sessionId;
                            if (user) localStorage.setItem(`chat_user_${user.id}_entity_${chatbotId}`, sessionToStore);
                            else localStorage.setItem(`chat_session_entity_${chatbotId}`, sessionToStore);
                            set(s => ({ ...s, sessionId: sessionToStore }));
                        }
                        if (responseData.data.threadId) {
                            set(s => ({ ...s, threadId: responseData.data.threadId }));
                        }
                        
                        const rawBotText = responseData.data.response;

                        console.log('[chatStore] sendMessage - explicitStoreInfo received:', JSON.stringify(explicitStoreInfo, null, 2)); // ★★★ 이 로그 추가
                        
                        const botMessage = {
                            id: `bot_${Date.now()}`,
                            text: rawBotText || '죄송합니다, 응답을 생성할 수 없습니다.',
                            isUser: false,
                            timestamp: new Date(),
                            botProfileImage: explicitStoreInfo?.botProfileImage || null,
                            storeName: explicitStoreInfo?.storeName || null,
                        };
                        console.log('[chatStore] sendMessage - botMessage.botProfileImage set to:', `"${botMessage.botProfileImage}"`); // ★★★ 이 로그 추가

                        set(s => ({ ...s, messages: [...s.messages, botMessage], isSending: false }));
                        return botMessage;
                    } catch (e) {
                        console.error('[chatStore] sendMessage Error:', e);
                        const errorMessage = { id: `error_${Date.now()}`, text: '죄송합니다, 메시지를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', isUser: false, isError: true, timestamp: new Date() };
                        set(s => ({ ...s, messages: [...s.messages, errorMessage], isSending: false, error: e.message }));
                        return null;
                    }
                },
                reset: () => set({ messages: [], isLoading: false, isSending: false, error: null, chatbotId: null, sessionId: null, threadId: null, store: null }, true),
            }),
            {
                name: 'chat-storage',
                partialize: (state) => ({
                    sessionId: state.sessionId,
                    threadId: state.threadId,
                    chatbotId: state.chatbotId,
                }),
            }
        )
    )
);

export default useChatStore;