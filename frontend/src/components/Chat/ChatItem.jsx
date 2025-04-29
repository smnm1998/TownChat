import React from 'react';
import styles from './ChatItem.module.css';

const ChatItem = ({ avatar, name, lastMessage, time, unreadCount }) => {
    return (
        <div className={styles.chatItem}>
            <img src={avatar} alt={`${name}'s avatar`} className={styles.avatar} />
            <div className={styles.chatDetails}>
                <div className={styles.nameAndTime}>
                    <span className={styles.name}>{name}</span>
                    <span className={styles.time}>{time}</span>
                </div>
                <div className={styles.messageAndBadge}>
                    <p className={styles.lastMessage}>{lastMessage}</p>
                    {unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{unreadCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatItem;