import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '@components/Admin/AdminSidebar';
import AdminHeader from '@components/Admin/AdminHeader';
import styles from './AdminLayout.module.css';

const AdminLayout = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAdminStatus = async () => {
            const token = localStorage.getItem('accessToken');
            console.log('저장된 토큰:', token);

            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('응답 상태:', response.status);

                if (response.ok) {
                    const data = await response.json();
                    console.log('사용자 데이터:', data);
                    setIsAdmin(data.data.user.role === 'admin');
                } else {
                    // 토큰이 유효하지 않은 경우
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    setIsAdmin(false);
                }
            } catch (error) {
                console.error('관리자 상태 확인 중 오류:', error);
                setIsAdmin(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkAdminStatus();
    }, []);

    if (isLoading) {
        return <div className={styles.loading}>로딩 중...</div>
    }

    if (!isAdmin) {
        return <Navigate to="/admin/signin" replace />;
    }

    return (
        <div className={styles.adminLayout}>
            <AdminSidebar />
            <div className={styles.mainContent}>
                <AdminHeader />
                <main className={styles.contentArea}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default AdminLayout;