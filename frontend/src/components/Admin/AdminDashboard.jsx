import { useState, useEffect } from 'react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        storeCount: 0,
        activeChatbots: 0,
        totalChatSessions: 0
    });

    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async() => {
            try {
                // 현재 더미
                setStats({
                    storeCount: 24,
                    activeChatbots: 18,
                    totalChatSessions: 156
                });
            } catch (error) {
                console.error('통계 데이터 로딩 실패: ', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (isLoading) {
        return <div className={styles.loading}>데이터 로딩 중...</div>;
    }

    return (
        <div className={styles.dashboard}>
            <h2 className={styles.title}>대시보드</h2>
        
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>등록된 점포</h3>
                    <p className={styles.statValue}>{stats.storeCount}</p>
                </div>
            
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>활성화된 챗봇</h3>
                    <p className={styles.statValue}>{stats.activeChatbots}</p>
                </div>
            
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>총 대화 세션</h3>
                    <p className={styles.statValue}>{stats.totalChatSessions}</p>
                </div>
            </div>
            
            <div className={styles.recentActivity}>
                <h3 className={styles.sectionTitle}>최근 활동</h3>
                {/* 여기에 최근 활동 목록을 표시하는 컴포넌트를 추가할 수 있습니다 */}
                <p className={styles.emptyState}>아직 활동 기록이 없습니다.</p>
            </div>
        </div>
    )
}

export default AdminDashboard;