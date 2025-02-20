import { useState } from 'react';
import { useForm } from 'react-hook-form';
import styles from './AdminSignInForm.module.css';
import Logo from '@assets/logo.svg';

const AdminSignInForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            console.log(data);
        } catch (error) {
            console.log('로그인 실패: ', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.logoContainer}>
                <img src={Logo} alt="로고이미지" className={styles.logo} />
            </div>
            <div className={styles.formWrapper}>
                <div>
                    <h2 className={styles.title}>로그인</h2>
                </div>
                <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                    <div className={styles.inputGroup}>
                        <div>
                            <label htmlFor="email" className={styles.label}>
                                이메일
                            </label>
                            <input
                                id="email"
                                type="email"
                                {...register('email', {
                                    required: '이메일을 입력해주세요.',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message:
                                            '유효한 이메일 주소를 입력해주세요.',
                                    },
                                })}
                                className={styles.input}
                            />
                            {errors.email && (
                                <p className={styles.errorMessage}>
                                    {errors.email.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="password" className={styles.label}>
                                비밀번호
                            </label>
                            <input
                                id="password"
                                type="password"
                                {...register('password', {
                                    required: '비밀번호를 입력해주세요',
                                    minLength: {
                                        value: 6,
                                        message:
                                            '비밀번호는 최소 6자 이상이여야 합니다.',
                                    },
                                })}
                                className={styles.input}
                            />
                            {errors.password && (
                                <p className={styles.errorMessage}>
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={styles.button}
                        >
                            {isLoading ? '로그인 중...' : '로그인'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminSignInForm;
