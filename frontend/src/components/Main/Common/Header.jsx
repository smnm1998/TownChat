import { Link } from 'react-router-dom';
import styles from './Header.module.css';
import Logo from '@assets/Logo.svg';

const Header = () => {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <Link to="/" className={styles.logoLink}>
                        <img src={Logo} alt="TownChat" className={styles.logo} />
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;