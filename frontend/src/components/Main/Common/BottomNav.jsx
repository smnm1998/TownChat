import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { FiHome, FiMap, FiPlus, FiX, FiMessageSquare, FiUser } from 'react-icons/fi';
import styles from './BottomNav.module.css';

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [previousPath, setPreviousPath] = useState('/');
    const previousPathnameRef = useRef(location.pathname);

    // 경로 변경 감지하여 이전 경로 저장
    useEffect(() => {
        if (previousPathnameRef.current !== '/add' && location.pathname === '/add') {
            // 이전 경로가 없거나 루트 경로였다면 기본값 '/' 사용
            setPreviousPath(previousPathnameRef.current || '/');
        }
        // 현재 경로를 ref에 저장하여 다음 렌더링 시 이전 경로로 사용
        previousPathnameRef.current = location.pathname;
    }, [location.pathname]);

    const isActive = (path) => {
        if (path === '/') {
            return (location.pathname === '/' || location.pathname === '/main') ? styles.active : '';
        }
        if (path === '/add') {
            return location.pathname === '/add' ? styles.activeAddButton : '';
        }
        return location.pathname !== '/' && location.pathname.startsWith(path) ? styles.active : '';
    };

    // '/add' 경로인지 확인하는 변수
    const isOnAddPage = location.pathname === '/add';

    // 중앙 버튼 클릭 핸들러
    const handleCenterButtonClick = (e) => {
        if (isOnAddPage) {
            e.preventDefault();
            navigate(previousPath);
        }
    };

    return (
        <nav className={styles.navbar}>
            {/* 홈 */}
            <Link to="/" className={`${styles.navItem} ${isActive('/')}`}>
                <FiHome className={styles.navIcon} />
                <span className={styles.navText}>메인화면</span>
            </Link>

            {/* 탐색하기 */}
            <Link to="/nearby" className={`${styles.navItem} ${isActive('/nearby')}`}>
                <FiMap className={styles.navIcon} />
                <span className={styles.navText}>탐색하기</span>
            </Link>

            {/* 추가 버튼 (중앙) */}
            <Link
                to="/add"
                className={styles.navItemCenter}
                onClick={handleCenterButtonClick}
            >
                <div className={`${styles.addButton} ${isActive('/add')}`}>
                    {/* isOnAddPage 값에 따라 아이콘 변경 */}
                    {isOnAddPage ? (
                        <FiX className={styles.addIcon} />
                    ) : (
                        <FiPlus className={styles.addIcon} />
                    )}
                </div>
            </Link>

            {/* 채팅목록 */}
            <Link to="/chats" className={`${styles.navItem} ${isActive('/chats')}`}>
                <FiMessageSquare className={styles.navIcon} />
                <span className={styles.navText}>채팅목록</span>
            </Link>

            {/* 개인정보 */}
            <Link to="/profile" className={`${styles.navItem} ${isActive('/profile')}`}>
                <FiUser className={styles.navIcon} />
                <span className={styles.navText}>개인정보</span>
            </Link>
        </nav>
    )
}

export default BottomNav;
