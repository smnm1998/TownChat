import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatItem from '@components/Chat/ChatItem';
import Header from '@components/Main/Common/Header';
import styles from './ChatListPage.module.css';

const ChatListPage = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadChats = async () => {
            try {
                setLoading(true);
                setError(null);
    
                // --- 사용자의 채팅방 목록을 조회하는 엔드포인트 호출 ---
                const response = await fetch('/api/chats', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}` // 인증 토큰 포함
                    },
                });
    
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
    
                const data = await response.json();
                // 백엔드에서 받은 채팅방 목록 데이터로 상태 업데이트
                setChats(data || []);
    
            } catch (err) {
                console.error('채팅 목록 로딩 실패: ', err);
                setError(err.message || "채팅 목록을 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };
    
        loadChats();
    }, []);

    const handleChatItemClick = (chatId) => {
        navigate(`/chat/${chatId}`);
    };

    const renderContent = () => {
        if (loading) {
            return <div className={styles.loading}>로딩 중...</div>;
        }
        if (error) {
            return <div className={styles.error}>{error}</div>;
        }
        if (chats.length === 0) {
            return <div className={styles.emptyMessage}>채팅 내역이 없습니다.</div>;
        }
        return chats.map((chat) => (
            <ChatItem
                key={chat.id}
                avatar={chat.avatar}
                name={chat.name}
                lastMessage={chat.lastMessage}
                time={chat.time}
                unreadCount={chat.unreadCount}
                onClick={() => handleChatItemClick(chat.id)}
            />
        ));
    };

    return (
        <div className={styles.pageContainer}>
            <Header title="채팅" />
            <div className={styles.listContainer}>
                {renderContent()}
            </div>
        </div>
    );
};

export default ChatListPage;
