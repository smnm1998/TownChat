import PropTypes from 'prop-types';
import styles from './Button.module.css';

const Button = ({
    children,
    type='button',
    variant='primary',
    size='md',
    fullWidth=false,
    isLoading=false,
    disabled=false,
    className='',
    onClick,
    ...rest
}) => {
    const buttonClasses = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth ? styles.fullWidth : '',
        disabled || isLoading ? styles.disabled : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || isLoading}
            onClick={onClick}
            {...rest}
        >
            {isLoading ? (
                <>
                    <span className={styles.loader}></span>
                    <span>처리 중...</span>
                </>
            ) : (
                children
            )}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    fullWidth: PropTypes.bool,
    disabled: PropTypes.bool,
    isLoading: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func
};

export default Button;