import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiMap, FiPlus, FiMessageSquare, FiUser } from 'react-icons/fi';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const location = useLocation();

    // 경로의 시작 부분이 일치하는지 확인하도록 수정
    const isActive = (path) => {
        // 루트 경로('/')의 경우 정확히 일치하는지 확인
        if (path === '/') {
            return (location.pathname === '/' || location.pathname === '/main') ? styles.active : '';
        }
        // 다른 경로는 시작 부분이 일치하는지 확인
        return location.pathname.startsWith(path) ? styles.active : '';
    };

    return (
        <nav className={styles.navbar}>
            <Link to="/" className={`${styles.navItem} ${isActive('/')}`}>
                <FiHome className={styles.navIcon} />
                <span className={styles.navText}>메인화면</span>
            </Link>

            <Link to="/nearby" className={`${styles.navItem} ${isActive('/nearby')}`}>
                <FiMap className={styles.navIcon} />
                <span className={styles.navText}>탐색하기</span>
            </Link>

            <Link to="/add" className={styles.navItemCenter}>
                <div className={styles.addButton}>
                    <FiPlus className={styles.addIcon} />
                </div>
            </Link>

            <Link to="/chats" className={`${styles.navItem} ${isActive('/chats')}`}>
                <FiMessageSquare className={styles.navIcon} />
                <span className={styles.navText}>채팅목록</span>
            </Link>

            <Link to="/profile" className={`${styles.navItem} ${isActive('/profile')}`}>
                <FiUser className={styles.navIcon} />
                <span className={styles.navText}>개인정보</span>
            </Link>
        </nav>
    )
}

export default BottomNav;