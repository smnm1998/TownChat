import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useChatStore = create(
    devtools(
        persist(
            (set, get) => ({
                messages: [],
                isLoading: false,
                isSending: false,
                error: null,
                chatbotId: null,
                sessionId: null,
                threadId: null,
                store: null,
                user: null,

                setSessionId: (sessionId) => set({ sessionId }),
                setThreadId: (threadId) => set({ threadId }),
                setChatbotId: (chatbotId) => set({ chatbotId }),
                setError: (error) => set({ error }),
                setStore: (storeData) => set({ store: storeData }),

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

                    if (!currentChatbotId || !currentSessionId) {
                        set({ isLoading: false, messages: [] });
                        return [];
                    }

                    set({ isLoading: true, error: null, messages: [] });
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
                        const chatlogs = historyData.data?.chatlogs || historyData.data;

                        if (chatlogs && Array.isArray(chatlogs)) {
                            const formattedMessages = [];
                            let foundThreadId = get().threadId;
                            chatlogs.forEach((entry) => {
                                if (entry.thread_id && (!foundThreadId || foundThreadId !== entry.thread_id)) { // 스레드 ID 업데이트 조건 강화
                                    foundThreadId = entry.thread_id;
                                }
                                let botImageUrl = entry.botProfileImage || entry.Chatbot?.Store?.image_url;
                                let storeName = entry.storeName || entry.Chatbot?.Store?.name;
                                if (!botImageUrl && get().store) botImageUrl = get().store.image_url;
                                if (!storeName && get().store) storeName = get().store.name;

                                formattedMessages.push({ id: `user_${entry.id}`, text: entry.message, isUser: true, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                                if (entry.response) {
                                    formattedMessages.push({ id: `bot_${entry.id}`, text: entry.response, isUser: false, botProfileImage: botImageUrl, storeName: storeName, timestamp: new Date(entry.timestamp || entry.created_at || Date.now()), isHistoryMessage: true });
                                }
                            });
                            if (foundThreadId && foundThreadId !== get().threadId) {
                                set({ threadId: foundThreadId });
                            }
                            set({ messages: formattedMessages, isLoading: false });
                            return formattedMessages; // 로드된 메시지 반환
                        }
                        set({ isLoading: false, messages: [] });
                        return [];
                    } catch (e) {
                        console.error('[chatStore] fetchChatHistory Error:', e);
                        set({ error: e.message, isLoading: false, messages: [] });
                        return []; // 에러 시 빈 배열 반환
                    }
                },

                setGreetingMessage: (greeting) => {
                    const currentStore = get().store;
                    const currentMessages = get().messages;
                    // console.log('[chatStore] Attempting to set greeting. Messages length:', currentMessages.length, 'Store exists:', !!currentStore);
                    if (currentMessages.length === 0 && currentStore) {
                        const greetingMessage = {
                            id: 'initial',
                            text: greeting || `안녕하세요! ${currentStore.name || '고객'}님, 무엇을 도와드릴까요?`,
                            isUser: false,
                            timestamp: new Date(),
                            isHistoryMessage: true,
                            botProfileImage: currentStore.image_url || null,
                            storeName: currentStore.name || null,
                        };
                        // console.log('[chatStore] Setting greeting message:', greetingMessage);
                        set({ messages: [greetingMessage] });
                    }
                },

                sendMessage: async (message, explicitStoreInfo = {}) => {
                    const { chatbotId, sessionId, threadId, user } = get();
                    if (!message.trim() || get().isSending) return;
                    if (!chatbotId) { set({ error: '챗봇 ID가 설정되지 않았습니다.' }); return; }
                    if (!sessionId) { set({ error: '세션 ID가 설정되지 않았습니다.' }); return; }

                    const userMessage = { id: `user_${Date.now()}`, text: message, isUser: true, timestamp: new Date() };
                    set(s => ({ ...s, messages: [...s.messages, userMessage], isSending: true, error: null }));
                    try {
                        const requestBody = { message, sessionId, threadId: threadId || null, location: null };
                        const headers = { 'Content-Type': 'application/json' };
                        const token = localStorage.getItem('accessToken');
                        if (user && token) headers['Authorization'] = `Bearer ${token}`;
                        const response = await fetch(`/api/chatbots/${chatbotId}/chat`, { method: 'POST', headers, body: JSON.stringify(requestBody) });
                        if (!response.ok) {
                            let errorText = `서버 오류 (${response.status})`;
                            try { const errorData = await response.json(); errorText = errorData.message || errorData.error || JSON.stringify(errorData); }
                            catch { errorText = (await response.text()) || errorText; }
                            throw new Error(`챗봇 응답 실패: ${errorText}`);
                        }
                        const responseData = await response.json();
                        if (!responseData?.data) throw new Error('서버 응답 형식 오류');
                        if (responseData.data.sessionId && responseData.data.sessionId !== get().sessionId) { set({ sessionId: responseData.data.sessionId }); }
                        if (responseData.data.threadId && responseData.data.threadId !== get().threadId) { set({ threadId: responseData.data.threadId }); }
                        const rawBotText = responseData.data.response;
                        const currentStoreState = get().store;
                        const botMessage = {
                            id: `bot_${Date.now()}`, text: rawBotText || '죄송합니다, 응답을 생성할 수 없습니다.', isUser: false, timestamp: new Date(),
                            botProfileImage: explicitStoreInfo?.botProfileImage || currentStoreState?.image_url || null,
                            storeName: explicitStoreInfo?.storeName || currentStoreState?.name || null,
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
                    // console.log('[chatStore] reset called - Resetting ALL chat related states including session/thread');
                    set({
                        messages: [],
                        isLoading: false,
                        isSending: false,
                        error: null,
                        chatbotId: null,
                        store: null,
                        sessionId: null, // 세션 ID도 초기화
                        threadId: null,  // 스레드 ID도 초기화
                    }, true, 'FULL_CHAT_RESET_AND_SESSION'); // persist 덮어쓰기 및 액션 이름
                },
            }),
            {
                name: 'chat-storage',
                partialize: (state) => ({
                    user: state.user, // 사용자 정보는 유지
                    // sessionId, threadId, chatbotId는 reset에서 null로 처리하므로,
                    // persist에서 제외하거나, reset 정책을 다르게 가져가야 함.
                    // 여기서는 reset 시 null로 하므로, 페이지 이동 시 완전히 새로 시작.
                }),
            }
        )
    )
);

export default useChatStore;