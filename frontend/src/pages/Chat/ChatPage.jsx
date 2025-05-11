import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter';
import useChatStore from '../../store/chatStore';
import { MarkdownRenderer } from '../../utils/MarkdownParser';
import styles from './ChatPage.module.css';

const DEFAULT_PLACEHOLDER_IMAGE_PATH = '/uploads/stores/placeholder-store.jpg';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const getFinalImageUrl = (imageUrlFromApi) => {
    if (!imageUrlFromApi || typeof imageUrlFromApi !== 'string' || imageUrlFromApi.trim() === '') {
        return DEFAULT_PLACEHOLDER_IMAGE_PATH;
    }
    if (imageUrlFromApi.startsWith('http://') || imageUrlFromApi.startsWith('https://')) {
        return imageUrlFromApi;
    }
    if (imageUrlFromApi.startsWith('/uploads/stores/')) {
        return imageUrlFromApi;
    }
    let potentialRelativePath = imageUrlFromApi;
    if (!potentialRelativePath.startsWith('/')) {
        potentialRelativePath = `/${potentialRelativePath}`;
    }
    if (!potentialRelativePath.startsWith('/uploads/stores/')) {
        if (potentialRelativePath.startsWith('/')) {
             potentialRelativePath = `/uploads/stores${potentialRelativePath}`;
        } else {
            potentialRelativePath = `/uploads/stores/${potentialRelativePath.substring(1)}`;
        }
        return potentialRelativePath;
    }
    return DEFAULT_PLACEHOLDER_IMAGE_PATH;
};

const MessageAvatar = ({ message, store: propStore }) => {
    const currentStore = useChatStore(state => state.store); // Zustand store에서 최신 스토어 정보 사용
    const imageUrlToLoad = getFinalImageUrl(message?.botProfileImage || propStore?.image_url || currentStore?.image_url);
    const [currentSrc, setCurrentSrc] = useState(imageUrlToLoad);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setCurrentSrc(imageUrlToLoad);
        setHasError(false);
        setIsLoaded(false);
    }, [imageUrlToLoad]); // message.id 제거, imageUrlToLoad 변경 시에만 반응

    useEffect(() => {
        if (!currentSrc) { setIsLoaded(true); return; }
        const img = new Image();
        img.src = currentSrc;
        let isMounted = true;
        if (img.complete) {
            if (isMounted) { setIsLoaded(true); setHasError(false); }
        } else {
            setIsLoaded(false);
            img.onload = () => { if (isMounted) { setIsLoaded(true); setHasError(false); } };
            img.onerror = () => {
                if (isMounted) {
                    setHasError(true); setIsLoaded(true);
                    if (currentSrc !== DEFAULT_PLACEHOLDER_IMAGE_PATH) { setCurrentSrc(DEFAULT_PLACEHOLDER_IMAGE_PATH); }
                }
            };
        }
        return () => { isMounted = false; };
    }, [currentSrc]);

    if (message?.isUser) return null;
    const altText = message?.storeName || propStore?.name || currentStore?.name || '점포 이미지';
    return (
        <div className={styles.botAvatar}>
            {!isLoaded && <div className={styles.avatarPlaceholder}><span>L</span></div>}
            <img src={currentSrc} alt={altText} className={`${styles.avatarImage} ${isLoaded ? '' : styles.hidden} ${hasError ? styles.avatarError : ''}`} />
        </div>
    );
};

const MessageText = ({ message }) => {
    const textForTypewriter = message.text || '';
    const skipTypingEffect = Boolean(message.isUser || message.isHistoryMessage);
    const { text: typewrittenText, isComplete, completeTyping } = useTypewriter(textForTypewriter, 30, skipTypingEffect);
    return (
        <div className={styles.messageText} onClick={() => { if (!isComplete) completeTyping(); }}>
            {isComplete ? <MarkdownRenderer content={typewrittenText} className={styles.markdownContent} /> : (<>{typewrittenText}<span className={styles.cursor}>|</span></>)}
        </div>
    );
};

const ChatPage = () => {
    const { id: routeIdFromParams } = useParams(); // URL 파라미터에서 가져오는 ID
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');
    // localStore는 이제 Zustand store로 대체하거나 보조적으로만 사용
    // const [localStore, setLocalStore] = useState(null); // Zustand store 사용으로 대체 고려

    const {
        messages, isLoading, isSending, error, threadId, sessionId, chatbotId, user, store, // Zustand 스토어에서 store 직접 사용
        fetchUserInfo, fetchChatHistory, setGreetingMessage, sendMessage,
        setSessionId, setThreadId, setChatbotId, setError: setChatError, reset, // reset 액션 사용
        setStore: setZustandStore,
    } = useChatStore();

    const prevRouteIdRef = useRef();

    // 1. 초기화 및 세션/스레드 ID 설정 (사용자 정보, URL 파라미터 기반)
    useEffect(() => {
        // console.log(`[ChatPage] Init Effect: routeIdFromParams=${routeIdFromParams}, prevRouteId=${prevRouteIdRef.current}`);
        if (prevRouteIdRef.current && prevRouteIdRef.current !== routeIdFromParams) {
            // console.log('[ChatPage] Route ID changed. Resetting chat state.');
            reset(); // 경로가 변경되면 이전 채팅 상태를 초기화 (messages, chatbotId, store 등)
        }
        prevRouteIdRef.current = routeIdFromParams;

        const initSession = async () => {
            await fetchUserInfo(); // 사용자 정보 먼저 가져오기
            const params = new URLSearchParams(location.search);
            const qSessionId = params.get('session');
            const qThreadId = params.get('thread');

            if (qSessionId) {
                // console.log(`[ChatPage] Setting sessionId from query: ${qSessionId}`);
                setSessionId(qSessionId);
            } else if (routeIdFromParams) { // URL 파라미터의 ID (storeId 또는 chatbotId)
                const currentUserId = useChatStore.getState().user?.id; // 최신 사용자 ID
                const entityId = routeIdFromParams; // 현재 보고 있는 페이지의 ID
                const pfx = currentUserId ? `user_${currentUserId}` : 'anon';
                const key = `chat_${pfx}_entity_${entityId}`; // 키 생성 시 routeIdFromParams 사용
                let csid = localStorage.getItem(key);
                if (!csid) {
                    csid = `session_${pfx}_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
                    localStorage.setItem(key, csid);
                }
                // console.log(`[ChatPage] Setting sessionId from localStorage/new: ${csid} (key: ${key})`);
                setSessionId(csid);
            }

            if (qThreadId) {
                // console.log(`[ChatPage] Setting threadId from query: ${qThreadId}`);
                setThreadId(qThreadId);
            }
        };
        initSession();
    }, [routeIdFromParams, location.search, fetchUserInfo, setSessionId, setThreadId, reset]);


    const extractIdFromPath = (path) => {
        const storeMatch = path.match(/\/store\/(\d+)\/chat/); if (storeMatch) return { type: 'store', id: storeMatch[1] };
        const chatMatch = path.match(/\/chat\/(\d+)/); if (chatMatch) return { type: 'chatbot', id: chatMatch[1] };
        return { type: null, id: null };
    };

    // 2. 스토어 및 챗봇 정보 로드 (경로 기반)
    useEffect(() => {
        if (!routeIdFromParams) {
            // console.log('[ChatPage] loadStoreAndBotData: No routeIdFromParams, skipping.');
            return;
        }

        const loadStoreAndBotData = async () => {
            const { type, id: pathId } = extractIdFromPath(location.pathname);
            // console.log(`[ChatPage] loadStoreAndBotData: type=${type}, pathId=${pathId}`);

            if (!pathId) {
                setChatError('유효하지 않은 접근 (경로 분석 실패)');
                setZustandStore(null); setChatbotId(null);
                return;
            }

            try {
                let fetchedStoreInfo = null;
                let fetchedChatbotId = null;

                if (type === 'store') {
                    // console.log(`[ChatPage] Fetching store info for storeId: ${pathId}`);
                    const storeRes = await fetch(`/api/stores/${pathId}`, { headers: getAuthHeaders() });
                    if (!storeRes.ok) {
                        const errorText = await storeRes.text();
                        throw new Error(`점포 정보 로드 실패 (${storeRes.status}): ${errorText}`);
                    }
                    const storeResponseData = await storeRes.json();
                    fetchedStoreInfo = storeResponseData.data;

                    if (fetchedStoreInfo) {
                        // API 응답에서 chatbot_id, Chatbot.id, chatbot.id 순으로 확인
                        if (fetchedStoreInfo.chatbot_id) fetchedChatbotId = String(fetchedStoreInfo.chatbot_id);
                        else if (fetchedStoreInfo.Chatbot && fetchedStoreInfo.Chatbot.id) fetchedChatbotId = String(fetchedStoreInfo.Chatbot.id);
                        else if (fetchedStoreInfo.chatbot && fetchedStoreInfo.chatbot.id) fetchedChatbotId = String(fetchedStoreInfo.chatbot.id);
                        // else console.warn(`[ChatPage] Chatbot ID not found in store data for store ID ${pathId}.`);
                    }
                } else if (type === 'chatbot') {
                    // console.log(`[ChatPage] Fetching chatbot info for chatbotId: ${pathId}`);
                    const botRes = await fetch(`/api/chatbots/${pathId}`, { headers: getAuthHeaders() });
                    if (!botRes.ok) {
                        const errorText = await botRes.text();
                        throw new Error(`챗봇 정보 로드 실패 (${botRes.status}): ${errorText}`);
                    }
                    const botData = await botRes.json();
                    fetchedChatbotId = pathId; // URL에서 직접 가져온 챗봇 ID
                    fetchedStoreInfo = botData.data?.Store || { name: botData.data?.name || '챗봇', image_url: null }; // 챗봇에 연결된 스토어 정보
                } else {
                    throw new Error('유효하지 않은 URL 유형');
                }

                // console.log(`[ChatPage] Fetched storeInfo:`, fetchedStoreInfo);
                // console.log(`[ChatPage] Fetched chatbotId: ${fetchedChatbotId}`);

                setZustandStore(fetchedStoreInfo); // Zustand 스토어에 스토어 정보 업데이트
                setChatbotId(fetchedChatbotId);   // Zustand 스토어에 챗봇 ID 업데이트

            } catch (e) {
                console.error('[ChatPage] Error in loadStoreAndBotData:', e);
                setChatError(e.message);
                setZustandStore(null);
                setChatbotId(null);
            }
        };

        // sessionId가 설정된 이후에 스토어/챗봇 데이터 로드 시도 (선택적: sessionId 생성 로직에 따라 필요 없을 수도 있음)
        // if (useChatStore.getState().sessionId) {
        loadStoreAndBotData();
        // }
    }, [routeIdFromParams, location.pathname, setChatError, setChatbotId, setZustandStore]); // sessionId 의존성 제거 또는 신중히 추가

    // 3. 채팅 기록 로드 및 인사말 설정 (chatbotId, sessionId, store 상태 기반)
    useEffect(() => {
        // Zustand 스토어에서 직접 최신 값들을 가져와 사용
        const currentChatbotId = useChatStore.getState().chatbotId;
        const currentSessionId = useChatStore.getState().sessionId;
        const currentStore = useChatStore.getState().store;
        const currentMessages = useChatStore.getState().messages;

        // console.log('[ChatPage] History/Greeting Effect:', { currentChatbotId, currentSessionId, storeExists: !!currentStore, messagesLength: currentMessages.length });

        if (!currentSessionId) {
            // console.log('[ChatPage] History/Greeting: SessionId not ready, skipping.');
            return; // 세션 ID가 없으면 아무것도 하지 않음
        }

        // 챗봇 ID가 있고, 스토어 정보도 있는 경우에만 기록 로드 시도
        if (currentChatbotId && currentStore) {
            const loadHistory = async () => {
                // console.log(`[ChatPage] Fetching chat history for chatbotId: ${currentChatbotId}, sessionId: ${currentSessionId}`);
                await fetchChatHistory({ chatbotId: currentChatbotId, sessionId: currentSessionId, threadId: useChatStore.getState().threadId });
                // fetchChatHistory가 messages를 업데이트하므로, 이후 상태를 다시 가져와서 인사말 처리
                const updatedMessages = useChatStore.getState().messages;
                const updatedStore = useChatStore.getState().store; // 혹시 store 정보도 업데이트 될 수 있으니 다시 가져옴
                if ((!updatedMessages || updatedMessages.length === 0) && updatedStore) {
                    // console.log('[ChatPage] History empty after fetch, setting greeting.');
                    setGreetingMessage(updatedStore.greeting_message || `안녕하세요! ${updatedStore.name}입니다! 무엇을 도와드릴까요?`);
                }
            };
            loadHistory();
        }
        // 챗봇 ID가 없지만, 스토어 정보는 있고, 메시지가 없는 경우 -> 인사말만 표시
        else if (!currentChatbotId && currentStore && (!currentMessages || currentMessages.length === 0)) {
            // console.log('[ChatPage] No chatbotId, but store exists and messages empty. Setting greeting.');
            setGreetingMessage(currentStore.greeting_message || `안녕하세요! ${currentStore.name}입니다! 무엇을 도와드릴까요?`);
        }
        // 그 외의 경우 (예: 스토어 정보가 아직 로드되지 않음)에는 아무것도 하지 않음

    }, [chatbotId, sessionId, store, fetchChatHistory, setGreetingMessage]); // Zustand의 chatbotId, sessionId, store를 직접 의존성으로 사용

    // 메시지 목록 변경 시 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        const currentStore = useChatStore.getState().store; // 메시지 보낼 때의 최신 스토어 정보
        await sendMessage(newMessage, {
            botProfileImage: currentStore?.image_url,
            storeName: currentStore?.name
        });
        setNewMessage('');
        inputRef.current?.focus();
    };

    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }};
    const handleGoBack = () => navigate(-1);

    const typingIndicatorAvatarMessage = {
        botProfileImage: store?.image_url, // Zustand store 직접 사용
        storeName: store?.name
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={handleGoBack} aria-label="뒤로 가기"><FiArrowLeft /></button>
                <h1 className={styles.storeName}>
                    {/* store가 로드되기 전에는 로딩 표시, 로드 후에는 store.name 또는 '챗봇' */}
                    { (isLoading && !store && messages.length === 0) ? '로딩 중...' : store?.name || '챗봇' }
                </h1>
            </header>
            <div className={styles.messageContainer}>
                {(isLoading && messages.length === 0 && !error) ? <div className={styles.loadingContainer}><div className={styles.loading}>대화 불러오는 중...</div></div>
                : error ? <div className={styles.errorContainer}><div className={styles.error}>{error}</div><button className={styles.retryButton} onClick={() => { setChatError(null); /* reset(); */ window.location.reload(); }}>다시 시도</button></div>
                : (
                    <>
                        {messages.map((message) => (
                            <div key={message.id} className={`${styles.message} ${message.isUser ? styles.userMessage : styles.botMessage} ${message.isError ? styles.errorMessage : ''}`}>
                                {!message.isUser && <MessageAvatar message={message} />} {/* propStore 제거, MessageAvatar 내부에서 Zustand store 사용 */}
                                <div className={styles.messageContent}>
                                    <MessageText message={message} />
                                    <div className={styles.messageTime}>{new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        {isSending && (
                            <div className={`${styles.message} ${styles.botMessage}`}>
                                <MessageAvatar message={typingIndicatorAvatarMessage} />
                                <div className={styles.typingIndicator}><span></span><span></span><span></span></div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className={styles.inputContainer}>
                <input type="text" className={styles.messageInput} placeholder="메시지를 입력하세요..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading || isSending || !!error} ref={inputRef} />
                <button className={`${styles.sendButton} ${(!newMessage.trim() || isSending || !!error) ? styles.disabled : ''}`} onClick={handleSendMessage} disabled={!newMessage.trim() || isSending || !!error} aria-label="메시지 보내기"><FiSend /></button>
            </div>
        </div>
    );
};

MessageText.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        text: PropTypes.string,
        isUser: PropTypes.bool,
        isHistoryMessage: PropTypes.bool,
        isError: PropTypes.bool,
        timestamp: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
    }).isRequired
};

MessageAvatar.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        isUser: PropTypes.bool,
        botProfileImage: PropTypes.string,
        storeName: PropTypes.string,
    }).isRequired,
    store: PropTypes.shape({ // 이 prop은 이제 선택적 (Zustand store 우선 사용)
        name: PropTypes.string,
        image_url: PropTypes.string
    })
};

export default ChatPage;