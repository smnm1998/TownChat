import { Link } from 'react-router-dom';
import styles from './StoreCard.module.css';

const StoreCard = ({ id, name, address, imageUrl }) => {
    return (
        <Link to={`/store${id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                <img
                    src={imageUrl || '/placeholder-store.jpg'}
                    alt={name}
                    className={styles.image}
                />
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{name}</h3>
                <p className={styles.address}>{address}</p>
            </div>
        </Link>
    )
}

export default StoreCard;