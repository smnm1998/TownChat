import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import styles from './Input.module.css';

const Input = forwardRef(({
    id,
    type = 'text',
    placeholder,
    icon,
    error,
    showToggledPwd,
    isPwdVisible,
    onTogglePwd,
    ...rest
}, ref) => {
    return (
        <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
                {icon && (
                    <div className={styles.inputIcon}>
                        {icon}
                    </div>
                )}
                <input
                    id={id}
                    ref={ref}
                    type={type}
                    placeholder={placeholder}
                    className={`${styles.input} ${error ? styles.inputError : ''} ${icon ? styles.withIcon : ''}`}
                    {...rest}
                />
                {showToggledPwd && (
                    <button
                        type="button"
                        className={styles.pwdToggle}
                        onClick={onTogglePwd}
                    >
                        {isPwdVisible ? '숨기기' : '보기'}
                    </button>
                )}
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
    )
})

Input.displayName = 'Input';

Input.propTypes = {
    id: PropTypes.string.isRequired,
    type: PropTypes.string,
    placeholder: PropTypes.string,
    icon: PropTypes.node,
    error: PropTypes.string,
    showToggledPwd: PropTypes.bool,
    isPwdVisible: PropTypes.bool,
    onTogglePwd: PropTypes.func,
};

export default Input;