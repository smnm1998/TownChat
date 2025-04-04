import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiMap, FiPlus, FiMessageSquare, FiUser } from 'react-icons/fi';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? styles.active : '';
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