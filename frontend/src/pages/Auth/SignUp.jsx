import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import Button from '@components/common/Button';
import SignUpForm from '@components/Auth/SignUpForm';
import styles from '@components/Auth/SignUpForm.module.css';

const SignUp = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);

    const handleSubmit = async (data) => {
        try {
            setIsLoading(true);
            setError(null);
            
            // 전화번호는 선택적 필드
            const userData = {
                username: data.username,
                email: data.email,
                password: data.password,
            };

            if (data.phone) {
                userData.phone = data.phone;
            }
            
            // API 호출 로직은 나중에 구현
            console.log('회원가입 데이터:', userData);
            
            // 임시 대기 시간 (API 호출 시뮬레이션)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 회원가입 성공
            setRegistrationSuccess(true);
        } catch (err) {
            setError(err.message || '회원가입 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentContainer}>
                    <div className={styles.successMessage}>
                        <div className={styles.successIcon}>
                            <FaCheck className={styles.checkMarkIcon} />
                        </div>
                        <h2 className={styles.title}>회원가입 완료!</h2>
                        <p className={styles.successText}>
                            회원가입이 성공적으로 완료되었습니다. 이제 로그인하여 TownChat 서비스를 이용하실 수 있습니다.
                        </p>
                        <div className={styles.successActions}>
                            <Link to="/signin">
                                <Button variant="primary" fullWidth>로그인하기</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentContainer}>
                <div className={styles.header}>
                    <h2 className={styles.title}>회원가입</h2>
                    <p className={styles.subtitle}>
                        이미 계정이 있으신가요?{' '}
                        <Link to="/signin" className={styles.link}>
                            로그인
                        </Link>
                    </p>
                </div>

                {error && (
                    <div className={styles.errorContainer}>
                        <p className={styles.errorMessage}>{error}</p>
                    </div>
                )}

                <SignUpForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default SignUp;