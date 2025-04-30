import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './ChatListPage.module.css';
import useChatSessionStore from '@store/chatSessionStore';

const ChatListPage = () => {
    const navigate = useNavigate();
    
    // Zustand 스토어 사용
    const {
        sessions,
        loading,
        error,
        fetchSessions
    } = useChatSessionStore();

    // 첫 렌더링 시 세션 목록 불러오기
    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleStoreClick = (chatbotId, sessionId, threadId) => {
        // ID 유효성 검사 추가
        if (!chatbotId) {
            console.error('유효한 챗봇 ID가 없습니다');
            alert('죄송합니다. 이 채팅방에 접근할 수 없습니다.');
            return;
        }
        
        console.log('클릭한 챗봇 ID:', chatbotId);
        console.log('클릭한 세션 ID:', sessionId);
        console.log('클릭한 스레드 ID:', threadId);
        
        // URL 구성 - thread_id도 함께 전달
        let url = `/chat/${chatbotId}`;
        
        // 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        if (sessionId) queryParams.append('session', sessionId);
        if (threadId) queryParams.append('thread', threadId);
        
        // 쿼리 파라미터가 있는 경우 URL에 추가
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
            
        console.log('이동할 URL:', url);
        navigate(url);
    };

    return (
        <div className={styles.container}>
            <Header />
            
            <div className={styles.content}>
                <h1 className={styles.title}>채팅목록</h1>
                
                {loading ? (
                    <div className={styles.loading}>
                        채팅 목록을 불러오는 중...
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        {error}
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <div className={styles.empty}>
                        채팅 내역이 없습니다.
                    </div>
                ) : (
                    <div className={styles.storeList}>
                        {sessions.map((session, index) => (
                            <div 
                                key={session.session_id || `session-${index}`} 
                                className={styles.storeItem}
                                onClick={() => handleStoreClick(
                                    session.chatbot_id || session.Chatbot?.id,
                                    session.session_id,
                                    session.thread_id
                                )}
                            >
                                <div className={styles.storeImage}>
                                    <img 
                                        src={session.Chatbot?.Store?.image_url || '/placeholder-store.jpg'} 
                                        alt={session.Chatbot?.Store?.name || session.Chatbot?.name || '채팅'}
                                        onError={(e) => {
                                            e.target.src = '/placeholder-store.jpg';
                                        }}
                                    />
                                </div>
                                <div className={styles.storeInfo}>
                                    <h3 className={styles.storeName}>
                                        {session.Chatbot?.Store?.name || session.Chatbot?.name || '채팅'}
                                    </h3>
                                    <p className={styles.storeLastMessage}>
                                        {session.lastMessage || '(대화 내용이 없습니다)'}
                                    </p>
                                    <div className={styles.storeTime}>
                                        {session.last_chat ? new Date(session.last_chat).toLocaleString() : ''}
                                        {session.thread_id ? (
                                            <span className={styles.activeIndicator}>연결됨</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
};

export default ChatListPage;