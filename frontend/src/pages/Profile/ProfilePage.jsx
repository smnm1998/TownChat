import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUserInfo = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    navigate('/signin');
                    return;
                }

                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('사용자 정보를 불러오는데 실패했습니다.');
                }

                const data = await response.json();
                setUser(data.data.user);
            } catch (error) {
                console.error('사용자 정보 조회 오류:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, [navigate]);

    const handleEditProfile = () => {
        // 프로필 수정 페이지로 이동
        navigate('/profile/edit');
    };

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');

            // 로그아웃 API 호출
            await fetch('/api/auth/signout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            // 로컬 스토리지 토큰 삭제
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');

            // 로그인 페이지로 이동
            navigate('/signin');
        } catch (error) {
            console.error('로그아웃 오류:', error);
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            // 탈퇴 API 호출 코드 추가 필요
            alert('해당 기능은 현재 개발 중입니다.');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Header />
                <div className={styles.loadingContainer}>
                    <p>정보를 불러오는 중...</p>
                </div>
                <BottomNav />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Header />
                <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>{error}</p>
                    <button 
                        className={styles.retryButton}
                        onClick={() => window.location.reload()}
                    >
                        다시 시도
                    </button>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Header />
            <div className={styles.content}>
                <div className={styles.profileHeader}>
                    <h1 className={styles.title}>개인정보</h1>
                    <button 
                        className={styles.editButton}
                        onClick={handleEditProfile}
                    >
                        수정하기
                    </button>
                </div>

                <div className={styles.profileInfo}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>이름</span>
                        <span className={styles.value}>{user?.username || '-'}</span>
                    </div>
                    
                    <div className={styles.infoItem}>
                        <span className={styles.label}>이메일</span>
                        <span className={styles.value}>{user?.email || '-'}</span>
                    </div>
                    
                    <div className={styles.infoItem}>
                        <span className={styles.label}>전화번호</span>
                        <span className={styles.value}>{user?.phone || '-'}</span>
                    </div>
                    
                    <div className={styles.infoItem}>
                        <span className={styles.label}>비밀번호</span>
                        <span className={styles.value}>{'*'.repeat(10)}</span>
                    </div>
                </div>

                <div className={styles.actionButtons}>
                    <button 
                        className={styles.logoutButton}
                        onClick={handleLogout}
                    >
                        로그아웃
                    </button>
                    
                    <button 
                        className={styles.deleteButton}
                        onClick={handleDeleteAccount}
                    >
                        탈퇴하기
                    </button>
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default ProfilePage;