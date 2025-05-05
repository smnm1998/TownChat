import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './StoreCard.module.css';

const StoreCard = ({ id, name, address, imageUrl }) => {
    // 주소에서 시/군구 및 상세주소 분리
    const formattedAddress = address ? address.split(',')[0] : '';
    
    return (
        <Link to={`/store/${id}/chat`} className={styles.card}>
            <div className={styles.imageContainer}>
                <img
                    src={imageUrl || '/placeholder-store.jpg'}
                    alt={name}
                    className={styles.image}
                    onError={(e) => {
                        e.target.src = '/placeholder-store.jpg';
                    }}
                />
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{name}</h3>
                <p className={styles.address}>{formattedAddress}</p>
            </div>
        </Link>
    );
};

StoreCard.propTypes = {
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    address: PropTypes.string,
    imageUrl: PropTypes.string
};

export default StoreCard;