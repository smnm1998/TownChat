import { useState, useEffect } from 'react';
import { FiSearch, FiEdit, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import styles from './AdminChatbots.module.css';

const AdminChatbots = () => {
    const [chatbots, setChatbots] = useState([]);
    const [filteredChatbots, setFilteredChatbots] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 챗봇 목록 가져오기
    useEffect(() => {
        const fetchChatbots = async() => {
            setIsLoading(true);
            setError(null);
        
            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('/api/chatbots', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
        
                if (!response.ok) {
                    throw new Error('챗봇 목록을 불러오는데 실패했습니다.');
                }
        
                const data = await response.json();
                console.log('API 응답 데이터:', data); // 응답 데이터 로깅
        
                // 데이터 구조 확인
                if (data.data && Array.isArray(data.data)) {
                    setChatbots(data.data);
                    setFilteredChatbots(data.data);
                } else {
                    console.error('예상치 못한 데이터 구조:', data);
                    setError('데이터 형식이 올바르지 않습니다.');
                }
            } catch (error) {
                console.error('Error fetching chatbots: ', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchChatbots();
    }, []);

    // 검색어에 따른 챗봇 필터링
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredChatbots(chatbots);
        } else {
            const filtered = chatbots.filter(chatbot => 
                chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (chatbot.store && chatbot.store.name && chatbot.store.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (chatbot.store && chatbot.store.address && chatbot.store.address.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setFilteredChatbots(filtered);
        }
    }, [searchTerm, chatbots]);

    // 검색어 변경 핸들러
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // 챗봇 삭제 핸들러
    const handleDeleteChatbot = async (id) => {
        if (!window.confirm('정말로 이 챗봇을 삭제하시겠습니까?')) {
            return;
        }

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/chatbots/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('챗봇 삭제에 실패했습니다.');
            }

            // 삭제 성공시 상태 업데이트
            setChatbots(chatbots.filter(chatbot => chatbot.id !== id));
            alert('챗봇이 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting chatbot: ', error);
            alert(error.message);
        }
    };

    // 챗봇 활성화/비활성화 토글 핸들러
    const handleToggleActive = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/chatbots/${id}/toggle-active`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('챗봇 상태 변경 실패');
            }

            setChatbots(chatbots.map(chatbot => 
                chatbot.id === id ? { ...chatbot, is_active: !currentStatus } : chatbot
            ));
        } catch (error) {
            console.error('Error toggling chatbot status: ', error);
            alert(error.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '정보 없음';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return '날짜 형식 오류';
        }
    };

    if (isLoading) {
        return <div className={styles.loadingContainer}>
            <FiRefreshCw className={styles.loadingIcon} />
            <p>챗봇 목록을 불러오는 중...</p>
        </div> 
    }

    if (error) {
        return <div className={styles.errorContainer}>
            <p className={styles.errorMessage}>{error}</p>
            <button
                className={styles.retryButton}
                onClick={() => window.location.reload()}
            >다시 시도</button>
        </div>;
    }
    
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>챗봇관리</h1>
                <div className={styles.searchContainer}>
                    <FiSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="챗봇 또는 점포명 검색..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            {filteredChatbots.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>검색 결과가 없습니다. 다른 검색어를 입력해보세요.</p>
                </div>
            ) : (
                <div className={styles.chatbotGrid}>
                    {filteredChatbots.map(chatbot => (
                        <div key={chatbot.id} className={styles.chatbotCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.chatbotName}>{chatbot.name}</h3>
                                <span className={`${styles.statusBadge} ${chatbot.is_active ? styles.statusActive : styles.statusInactive}`}>
                                    {chatbot.is_active ? '활성' : '비활성화'}
                                </span>
                            </div>

                            <div className={styles.storeInfo}>
                                <p className={styles.storeName}>
                                    {chatbot.store ? chatbot.store.name : '점포 정보 없음'}
                                </p>
                                <p className={styles.storeAddress}>
                                    {chatbot.store ? chatbot.store.address : ''}
                                </p>
                            </div>

                            <div className={styles.dateInfo}>
                                <p className={styles.dateLabel}>생성일: <span>{formatDate(chatbot.created_at)}</span></p>
                                <p className={styles.dateLabel}>마지막 수정: <span>{formatDate(chatbot.last_updated)}</span></p>
                            </div>

                            <div className={styles.actions}>
                                <button
                                    className={`${styles.actionButton} ${styles.toggleButton} ${chatbot.is_active ? styles.deactivateButton : styles.activateButton}`}
                                    onClick={() => handleToggleActive(chatbot.id, chatbot.is_active)}
                                >{chatbot.is_active ? '비활성화' : '활성화'}</button>
                                <button
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    onClick={() => window.location.href=`/admin/chatbots/${chatbot.id}/edit`}
                                >
                                    <FiEdit className={styles.buttonIcon} />
                                    수정하기
                                </button>
                                <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={() => handleDeleteChatbot(chatbot.id)}
                                >
                                    <FiTrash2 className={styles.buttonIcon} />
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminChatbots;