import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './SignUpForm.module.css';

const SignUpForm = ({ onSubmit, register, errors, isLoading }) => {
    return (
        <form onSubmit={onSubmit} className={styles.form}>
            <div className={styles.formGroup}>
                <label htmlFor="username" className={styles.label}>이름</label>
                <input
                    id="username"
                    type="text"
                    placeholder="이름을 입력하세요"
                    className={styles.input}
                    {...register('username', {
                        required: '이름을 입력해주세요',
                        minLength: {
                            value: 3,
                            message: '이름은 최소 3자 이상이어야 합니다'
                        }
                    })}
                />
                {errors.username && <p className={styles.errorText}>{errors.username.message}</p>}
            </div>

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
                        pattern: {
                            value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
                            message: '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다'
                        }
                    })}
                />
                {errors.password && <p className={styles.errorText}>{errors.password.message}</p>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="passwordConfirm" className={styles.label}>비밀번호 확인</label>
                <input
                    id="passwordConfirm"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    className={styles.input}
                    {...register('passwordConfirm', {
                        required: '비밀번호 확인을 입력해주세요',
                        validate: (value, formValues) => 
                            value === formValues.password || '비밀번호가 일치하지 않습니다'
                    })}
                />
                {errors.passwordConfirm && <p className={styles.errorText}>{errors.passwordConfirm.message}</p>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="phone" className={styles.label}>전화번호 (선택사항)</label>
                <input
                    id="phone"
                    type="tel"
                    placeholder="전화번호를 입력하세요"
                    className={styles.input}
                    {...register('phone', {
                        pattern: {
                            value: /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/,
                            message: '유효한 전화번호 형식을 입력해주세요'
                        }
                    })}
                />
                {errors.phone && <p className={styles.errorText}>{errors.phone.message}</p>}
            </div>

            <div className={styles.checkboxGroup}>
                <input
                    id="termsAgreed"
                    type="checkbox"
                    className={styles.checkbox}
                    {...register('termsAgreed', {
                        required: '개인정보 수집 및 이용에 동의해주세요'
                    })}
                />
                <label htmlFor="termsAgreed" className={styles.checkboxLabel}>
                    개인정보 수집 및 이용에 동의해 주세요.
                </label>
            </div>
            {errors.termsAgreed && <p className={styles.errorText}>{errors.termsAgreed.message}</p>}

            <div className={styles.signInLinkContainer}>
                <div className={styles.signInWrapper}>
                    <span className={styles.signInText}>이미 회원이신가요?</span>
                    <Link to="/signin" className={styles.signInLink}>로그인</Link>
                </div>
            </div>

            <button 
                type="submit" 
                className={styles.signupButton}
                disabled={isLoading}
            >
                {isLoading ? '처리중...' : '회원가입'}
            </button>
        </form>
    );
};

// prop-types 정의
SignUpForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    register: PropTypes.func.isRequired,
    errors: PropTypes.object,
    isLoading: PropTypes.bool
};

// 기본 props 정의
SignUpForm.defaultProps = {
    errors: {},
    isLoading: false
};

export default SignUpForm;