import React from 'react';
import AdminAddForm from '@components/Admin/AdminAddForm';
import styles from './AdminAdd.module.css';

const AdminAdd = () => {
    return (
        <div className={styles.container}>
        <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>점포 등록</h1>
            <p className={styles.pageDescription}>
            새로운 점포 정보를 등록하세요. 등록된 점포는 자동으로 챗봇 서비스가 생성됩니다.
            </p>
        </div>
        
        <div className={styles.formContainer}>
            <AdminAddForm />
        </div>
        </div>
    );
};

export default AdminAdd;