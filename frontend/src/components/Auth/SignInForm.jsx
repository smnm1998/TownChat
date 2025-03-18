import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './SignInForm.module.css';

const SignInForm = ({ onSubmit, register, errors, isLoading }) => {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>이메일</label>
                <input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력하세요"
                    className={styles.input}
                    {...register('email', {
                        required: '이메일을 입력해주세요',
                        pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: '유효한 이메일 주소를 입력해주세요'
                        }
                    })}
                />
                {errors.email && <p className={styles.errorText}>{errors.email.message}</p>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.label}>비밀번호</label>
                <input
                    id="password"
                    type="password"
                    placeholder="비밀번호를 입력하세요"
                    className={styles.input}
                    {...register('password', {
                        required: '비밀번호를 입력해주세요',
                        minLength: {
                            value: 6,
                            message: '비밀번호는 최소 6자 이상이어야 합니다'
                        },
                    })}
                />
                {errors.password && <p className={styles.errorText}>{errors.password.message}</p>}
            </div>

            <div className={styles.signUpLinkContainer}>
                <div className={styles.signUpWrapper}>
                    <span className={styles.signUpText}>아직 회원이 아니신가요?</span>
                    <Link to="/signup" className={styles.signUpLink}>회원가입</Link>
                </div>
            </div>

            <button 
                type="submit" 
                className={styles.loginButton}
                disabled={isLoading}
            >
                {isLoading ? '로딩중...' : '로그인'}
            </button>
        </form>
    );
};

// prop-types 정의
SignInForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    register: PropTypes.func.isRequired,
    errors: PropTypes.shape({
        email: PropTypes.shape({
            message: PropTypes.string
        }),
        password: PropTypes.shape({
            message: PropTypes.string
        })
    }),
    isLoading: PropTypes.bool
};

// 기본 props 정의
SignInForm.defaultProps = {
    errors: {},
    isLoading: false
};

export default SignInForm;