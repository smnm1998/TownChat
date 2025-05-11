import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiShoppingBag, FiMessageSquare, FiLogOut, FiPlus } from 'react-icons/fi';
import styles from './AdminSidebar.module.css';
import Logo from '@assets/Logo.svg';

const AdminSidebar = () => {
    const location = useLocation();

    const handleSignOut = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('isAdmin');
        // replace: true 추가하여 뒤로가기로 관리자 페이지에 접근하지 못하게 함
        window.location.href = '/admin/signin';
    }

    const isActive = (path) => {
        return location.pathname.startsWith(path) ? styles.activeLink : '';
    };

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <img src={Logo} alt="Townchat" className={styles.logo} />
            </div>

            <nav className={styles.navigation}>
                <Link to="/admin/dashboard" className={`${styles.navLink} ${isActive('/admin/dashboard')}`}>
                    <FiHome className={styles.navIcon} />
                    <span>대시보드</span>
                </Link>

                <Link to="/admin/stores/add" className={`${styles.navLink} ${isActive('/admin/stores/add')}`}>
                    <FiPlus className={styles.navIcon} />
                    <span>등록하기</span>
                </Link>

                <Link to="/admin/chatbots" className={`${styles.navLink} ${isActive('/admin/chatbots')}`}>
                    <FiMessageSquare className={styles.navIcon} />
                    <span>챗봇관리</span>
                </Link>
            </nav>

            <div className={styles.signOutContainer}>
                <button onClick={handleSignOut} className={styles.signOutButton}>
                    <FiLogOut className={styles.signOutIcon} />
                    <span>로그아웃</span>
                </button>
            </div>
        </div>
    )
}

export default AdminSidebar;