import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageSquare, FiTrash2, FiClock } from 'react-icons/fi';
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
        deleteLoading,
        fetchSessions,
        deleteSession
    } = useChatSessionStore();

    // 첫 렌더링 시에만 세션 목록 불러오기
    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 의존성 배열에서 fetchSessions 제거

    // 날짜 형식화 함수
    const formatDate = (dateString) => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // 오늘인 경우 시간만 표시
        if (diff < 24 * 60 * 60 * 1000 && 
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // 일주일 이내인 경우 요일 표시
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return `${days[date.getDay()]}요일`;
        }
        
        // 그 외에는 날짜 표시
        return date.toLocaleDateString();
    };

    const handleStoreClick = (chatbotId, sessionId, threadId) => {
        if (!chatbotId) {
            alert('죄송합니다. 이 채팅방에 접근할 수 없습니다.');
            return;
        }
        
        let url = `/chat/${chatbotId}`;
        const queryParams = new URLSearchParams();
        
        if (sessionId) {
            queryParams.append('session', sessionId);
        }
        
        if (threadId) {
            queryParams.append('thread', threadId);
        }
        
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
            
        navigate(url);
    };

    // 채팅 세션 삭제 처리 함수
    const handleDeleteSession = async (event, sessionId) => {
        // 이벤트 버블링 방지 (부모 요소의 클릭 이벤트 방지)
        event.stopPropagation();
        
        // 삭제 중 상태 확인
        if (deleteLoading) {
            alert('다른 채팅 내역을 삭제하는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }
        
        try {
            // 삭제 기능 호출
            const success = await deleteSession(sessionId);
            
            if (success) {
                // 성공 시 메시지 표시 (선택적)
                alert('채팅 내역이 삭제되었습니다.');
            }
        } catch (error) {
            alert(`삭제 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
        }
    };

    return (
        <div className={styles.container}>
            <Header />
            
            <div className={styles.content}>
                <h1 className={styles.title}>채팅목록</h1>
                
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.loadingSpinner}></div>
                        <p>채팅 목록을 불러오는 중...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        <p>{error}</p>
                        <button 
                            className={styles.retryButton}
                            onClick={() => fetchSessions()}
                        >
                            다시 시도
                        </button>
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <div className={styles.empty}>
                        <FiMessageSquare className={styles.emptyIcon} />
                        <p>채팅 내역이 없습니다.</p>
                        <p className={styles.emptySubtext}>점포를 검색하고 대화를 시작해보세요!</p>
                    </div>
                ) : (
                    <div className={styles.storeList}>
                        {sessions.map((session, index) => {
                            // chatbot_id 확인 - 두 가지 경로에서 가져옴
                            const chatbotId = session.chatbot_id || session.Chatbot?.id;
                            
                            return (
                                <div 
                                    key={session.session_id || `session-${index}`} 
                                    className={styles.storeItem}
                                    onClick={() => handleStoreClick(
                                        chatbotId,
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
                                            <span className={styles.timeText}>
                                                <FiClock className={styles.timeIcon} />
                                                {formatDate(session.last_chat)}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        className={styles.deleteButton}
                                        onClick={(e) => handleDeleteSession(e, session.session_id)}
                                        aria-label="채팅 삭제"
                                    >
                                        <FiTrash2 className={styles.deleteIcon} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
};

export default ChatListPage;