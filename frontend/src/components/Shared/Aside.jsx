import { Link } from 'react-router-dom';
import { RiAddLine, RiListUnordered, RiLogoutBoxLine } from 'react-icons/ri';
import Logo from '@assets/logo.svg';
import styles from './Aside.module.css';

const Aside = () => {
    return (
        <aside className={styles.aside}>
            <div className={styles.container}>
                <div className={styles.logoWrapper}>
                    <Link to="/admin/list">
                        <img
                            src={Logo}
                            alt="로고 이미지"
                            className={styles.logo}
                        />
                    </Link>
                </div>

                <nav className={styles.nav}>
                    <ul className={styles.menuList}>
                        <li>
                            <Link
                                to="/admin/create"
                                className={styles.menuItem}
                            >
                                <RiAddLine className={styles.icon} />
                                <span>등록하기</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/admin/list" className={styles.menuItem}>
                                <RiListUnordered className={styles.icon} />
                                <span>목록보기</span>
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className={styles.signOutWrapper}>
                    <button className={styles.signOutBtn}>
                        <RiLogoutBoxLine className={styles.icon} />
                        <span>로그아웃</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Aside;
