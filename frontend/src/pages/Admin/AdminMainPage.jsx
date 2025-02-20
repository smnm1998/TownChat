import { Outlet } from 'react-router-dom';
import Aside from '@components/Shared/Aside';
import styles from './AdminMainPage.module.css';

const AdminMainPage = () => {
    return (
        <div className={styles.container}>
            <Aside />
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminMainPage;
