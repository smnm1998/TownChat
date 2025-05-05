import { useState, useEffect } from 'react';
import { FiMenu, FiBell } from 'react-icons/fi';
import styles from './AdminHeader.module.css';

const AdminHeader = () => {
    const [username, setUsername] = useState('관리자');

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (!token) return;

                const response = await fetch('/api/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsername(data.data.user.username);
                }
            } catch (error) {
                console.error('사용자 정보 조회 실패: ', error);
            }
        };
        fetchUserInfo();
    }, []);

    return (
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <button className={styles.menuButton}>
                    <FiMenu />
                </button>
                <h1 className={styles.pageTitle}>관리자 대시보드</h1>
            </div>

            <div className={styles.headerRight}>
                <button className={styles.notificationButton}>
                    <FiBell />
                </button>
                <div className={styles.userInfo}>
                    <span className={styles.welcomeText}>안녕하세요</span>
                    <span className={styles.username}>{username}님</span>
                </div>
            </div>
        </header>
    )
}

export default AdminHeader;