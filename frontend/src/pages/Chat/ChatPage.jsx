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
    if (imageUrlFromApi.startsWith('http')) return imageUrlFromApi;
    if (imageUrlFromApi.startsWith('/uploads/stores/')) return imageUrlFromApi;
    let path = imageUrlFromApi;
    if (!path.startsWith('/')) path = `/${path}`;
    if (!path.startsWith('/uploads/stores/')) path = `/uploads/stores${path.startsWith('/') ? '' : '/'}${path.replace(/^\/+/, '')}`;
    return path;
};

const MessageAvatar = ({ message }) => {
    const currentStore = useChatStore(state => state.store);
    const imageUrlToLoad = getFinalImageUrl(message?.botProfileImage || currentStore?.image_url);
    const [currentSrc, setCurrentSrc] = useState(imageUrlToLoad);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setCurrentSrc(imageUrlToLoad); setHasError(false); setIsLoaded(false);
    }, [imageUrlToLoad]);

    useEffect(() => {
        if (!currentSrc) { setIsLoaded(true); return; }
        const img = new Image(); img.src = currentSrc; let isMounted = true;
        if (img.complete) { if (isMounted) { setIsLoaded(true); setHasError(false); } }
        else {
            setIsLoaded(false);
            img.onload = () => { if (isMounted) { setIsLoaded(true); setHasError(false); } };
            img.onerror = () => { if (isMounted) { setHasError(true); setIsLoaded(true); if (currentSrc !== DEFAULT_PLACEHOLDER_IMAGE_PATH) setCurrentSrc(DEFAULT_PLACEHOLDER_IMAGE_PATH); } };
        }
        return () => { isMounted = false; };
    }, [currentSrc]);

    if (message?.isUser) return null;
    const altText = message?.storeName || currentStore?.name || '점포 이미지';
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
    const { id: routeIdFromParams } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');
    const [localStoreInfo, setLocalStoreInfo] = useState(null); // API로 가져온 점포 정보 임시 저장

    const {
        messages, isLoading, isSending, error, threadId, sessionId, chatbotId, user, store,
        fetchUserInfo, fetchChatHistory, setGreetingMessage, sendMessage,
        setSessionId, setThreadId, setChatbotId, setError: setChatError, reset,
        setStore: setZustandStore,
    } = useChatStore();

    const prevRouteIdRef = useRef(routeIdFromParams);

    const extractIdFromPath = (path) => {
        const storeMatch = path.match(/\/store\/(\d+)\/chat/); if (storeMatch) return { type: 'store', id: storeMatch[1] };
        const chatMatch = path.match(/\/chat\/(\d+)/); if (chatMatch) return { type: 'chatbot', id: chatMatch[1] };
        return { type: null, id: null };
    };

    // Effect 1: 경로 변경 감지, 상태 초기화, 사용자 정보 로드, URL 쿼리 파라미터로 세션/스레드 ID 설정
    useEffect(() => {
        // console.log(`[ChatPage] Effect 1 (Init & User & Query Params): routeId=${routeIdFromParams}, prevRouteId=${prevRouteIdRef.current}`);
        if (prevRouteIdRef.current !== routeIdFromParams) {
            // console.log(`[ChatPage] Effect 1: Route ID changed. Calling reset().`);
            reset(); // 이전 채팅 관련 상태 (messages, store, chatbotId, sessionId, threadId 등) 완전 초기화
        }
        prevRouteIdRef.current = routeIdFromParams;

        fetchUserInfo(); // 사용자 정보 로드

        const params = new URLSearchParams(location.search);
        const qSessionId = params.get('session');
        const qThreadId = params.get('thread');
        if (qSessionId && qSessionId !== sessionId) setSessionId(qSessionId); // 스토어와 다를 때만 업데이트
        if (qThreadId && qThreadId !== threadId) setThreadId(qThreadId);     // 스토어와 다를 때만 업데이트

    }, [routeIdFromParams, location.search, fetchUserInfo, reset, setSessionId, setThreadId, sessionId, threadId]);


    // Effect 2: 점포 및 챗봇 정보 로드 (routeIdFromParams가 유효할 때)
    useEffect(() => {
        if (!routeIdFromParams) {
            setZustandStore(null); setChatbotId(null);
            return;
        }
        const loadStoreAndBotData = async () => {
            // console.log(`[ChatPage] Effect 2 (Load Store/Bot): For routeId: ${routeIdFromParams}`);
            const { type, id: pathIdFromExtraction } = extractIdFromPath(location.pathname);
            const idToUse = routeIdFromParams; // URL 파라미터 ID를 우선 사용

            if (!idToUse || (pathIdFromExtraction && idToUse !== pathIdFromExtraction) ) {
                // console.warn(`[ChatPage] Effect 2: ID mismatch or invalid. pathIdFromExtraction=${pathIdFromExtraction}, idToUse=${idToUse}`);
                setChatError('URL 경로와 파라미터 ID가 일치하지 않거나 유효하지 않습니다.');
                setZustandStore(null); setChatbotId(null);
                return;
            }
            try {
                let fetchedStoreInfo = null; let fetchedChatbotId = null;
                if (type === 'store') {
                    const storeRes = await fetch(`/api/stores/${idToUse}`, { headers: getAuthHeaders() });
                    if (!storeRes.ok) throw new Error('점포 정보 로드 실패');
                    fetchedStoreInfo = (await storeRes.json()).data;
                    if (fetchedStoreInfo) {
                        const botRes = await fetch(`/api/chatbots/store/${idToUse}`, { headers: getAuthHeaders() });
                        if (botRes.ok) fetchedChatbotId = (await botRes.json()).data?.id;
                    }
                } else if (type === 'chatbot') {
                    const botRes = await fetch(`/api/chatbots/${idToUse}`, { headers: getAuthHeaders() });
                    if (!botRes.ok) throw new Error('챗봇 정보 로드 실패');
                    const botData = await botRes.json();
                    fetchedChatbotId = idToUse;
                    fetchedStoreInfo = botData.data?.Store || { name: botData.data?.name || '챗봇', image_url: null };
                } else {
                     setChatError('유효하지 않은 URL 유형입니다.'); setZustandStore(null); setChatbotId(null); return;
                }
                // console.log(`[ChatPage] Effect 2: Fetched Data - chatbotId=${fetchedChatbotId}, storeName=${fetchedStoreInfo?.name}`);
                setLocalStoreInfo(fetchedStoreInfo); // 로컬 상태에 임시 저장 (아래 Effect 3에서 사용)
                setZustandStore(fetchedStoreInfo);
                setChatbotId(fetchedChatbotId ? String(fetchedChatbotId) : null);
            } catch (e) { console.error('[ChatPage] Effect 2: Error loading store/bot data:', e); setChatError(e.message); setZustandStore(null); setChatbotId(null); }
        };
        loadStoreAndBotData();
    }, [routeIdFromParams, location.pathname, setChatError, setZustandStore, setChatbotId]);


    // Effect 3: 세션 ID 생성/로드 (사용자 정보, 챗봇 ID, 로컬스토어의 점포 정보가 준비된 후)
    useEffect(() => {
        // console.log(`[ChatPage] Effect 3 (Session ID Setup): routeId=${routeIdFromParams}, userReady=${!!user}, chatbotIdReady=${!!chatbotId}`);
        // URL 쿼리에 이미 sessionId가 있으면 그걸 사용 (Effect 1에서 처리)
        if (location.search.includes('session=')) return;

        if (routeIdFromParams && user && chatbotId) { // 모든 조건 만족 시
            const entityId = routeIdFromParams; // 현재 페이지의 주 ID
            const pfx = user.id ? `user_${user.id}` : 'anon';
            const key = `chat_${pfx}_bot${chatbotId}_entity${entityId}`; // 세션 키에 chatbotId 포함
            let csid = localStorage.getItem(key);
            if (!csid) {
                csid = `session_${pfx}_bot${chatbotId}_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
                localStorage.setItem(key, csid);
            }
            // console.log(`[ChatPage] Effect 3: Setting sessionId: ${csid} (key: ${key})`);
            if (csid !== sessionId) setSessionId(csid); // 스토어와 다를 때만 업데이트
        }
    }, [routeIdFromParams, user, chatbotId, location.search, setSessionId, sessionId]);


    // Effect 4: 채팅 기록 로드 및 인사말 설정 (챗봇 ID, 세션 ID, 스토어 정보 유효 시)
    useEffect(() => {
        // console.log('[ChatPage] Effect 4 (History/Greeting):', { chatbotId, sessionId, storeName: store?.name, messagesLength: messages.length });
        if (chatbotId && sessionId && store) {
            const loadHistoryAndSetGreetingIfNeeded = async () => {
                // console.log(`[ChatPage] Effect 4: Fetching history for chatbotId: ${chatbotId}, sessionId: ${sessionId}`);
                const loadedMessages = await fetchChatHistory({ chatbotId, sessionId, threadId });
                // fetchChatHistory는 이제 로드된 메시지를 반환, 스토어는 내부에서 업데이트됨
                if ((!loadedMessages || loadedMessages.length === 0) && store) {
                    // console.log('[ChatPage] Effect 4: History empty, setting greeting for store:', store.name);
                    setGreetingMessage(store.greeting_message || `안녕하세요! ${store.name}입니다! 무엇을 도와드릴까요?`);
                }
            };
            loadHistoryAndSetGreetingIfNeeded();
        } else if (store && messages.length === 0 && !chatbotId && sessionId) {
             // console.log('[ChatPage] Effect 4: No chatbotId, but store & sessionId exist. Setting greeting:', store.name);
             setGreetingMessage(store.greeting_message || `안녕하세요! ${store.name}입니다! 무엇을 도와드릴까요?`);
        }
    }, [chatbotId, sessionId, store, threadId, fetchChatHistory, setGreetingMessage]); // messages.length 의존성 제거


    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        const currentChatbotIdFromStore = useChatStore.getState().chatbotId; // 전송 시점의 ID 재확인
        const currentSessionIdFromStore = useChatStore.getState().sessionId;
        if (!currentChatbotIdFromStore) { setChatError('챗봇 ID가 설정되지 않았습니다. 잠시 후 다시 시도해주세요.'); return; }
        if (!currentSessionIdFromStore) { setChatError('세션 ID가 설정되지 않았습니다. 잠시 후 다시 시도해주세요.'); return; }

        const currentStoreState = useChatStore.getState().store; // 전송 시점의 스토어 정보
        await sendMessage(newMessage, {
            botProfileImage: currentStoreState?.image_url,
            storeName: currentStoreState?.name
        });
        setNewMessage('');
        inputRef.current?.focus();
    };
    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }};
    const handleGoBack = () => navigate(-1);
    const typingIndicatorAvatarMessage = { botProfileImage: store?.image_url, storeName: store?.name };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={handleGoBack} aria-label="뒤로 가기"><FiArrowLeft /></button>
                <h1 className={styles.storeName}>{(isLoading && !store && messages.length === 0 && !error) ? '로딩 중...' : store?.name || '챗봇'}</h1>
            </header>
            <div className={styles.messageContainer}>
                {(isLoading && messages.length === 0 && !error) ? <div className={styles.loadingContainer}><div className={styles.loading}>대화 불러오는 중...</div></div>
                : error ? <div className={styles.errorContainer}><div className={styles.error}>{error}</div><button className={styles.retryButton} onClick={() => { setChatError(null); reset(); window.location.reload();}}>다시 시도</button></div>
                : (
                    <>
                        {messages.map((message) => (
                            <div key={message.id} className={`${styles.message} ${message.isUser ? styles.userMessage : styles.botMessage} ${message.isError ? styles.errorMessage : ''}`}>
                                {!message.isUser && <MessageAvatar message={message} />}
                                <div className={styles.messageContent}><MessageText message={message} />
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
                <input type="text" className={styles.messageInput} placeholder="메시지를 입력하세요..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading || isSending || !!error || !chatbotId || !sessionId} ref={inputRef} />
                <button className={`${styles.sendButton} ${(!newMessage.trim() || isSending || !!error || !chatbotId || !sessionId) ? styles.disabled : ''}`} onClick={handleSendMessage} disabled={!newMessage.trim() || isSending || !!error || !chatbotId || !sessionId} aria-label="메시지 보내기"><FiSend /></button>
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
    store: PropTypes.shape({
        name: PropTypes.string,
        image_url: PropTypes.string
    })
};

export default ChatPage;