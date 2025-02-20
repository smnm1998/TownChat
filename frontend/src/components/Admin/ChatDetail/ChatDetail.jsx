import { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ChatDetail.module.css';

const ChatDetail = ({ chat: initialChat, onClose, onEdit, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedChat, setEditedChat] = useState(initialChat);
    const [isHovering, setIsHovering] = useState(false);

    const handleDelete = () => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            onDelete(editedChat.id);
        }
    };

    const handleSave = () => {
        onEdit(editedChat);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedChat(initialChat);
        setIsEditing(false);
    };

    const handleInputChange = (field, value) => {
        setEditedChat((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                handleInputChange('image', reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleInputChange('knowledgeBase', file.name);
        }
    };

    const renderField = (label, field) => (
        <div className={styles.infoItem}>
            <label>{label}</label>
            {isEditing ? (
                <input
                    type="text"
                    value={editedChat[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={styles.editInput}
                />
            ) : (
                <p>{editedChat[field]}</p>
            )}
        </div>
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>챗봇 상세 정보</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.topSection}>
                        <div className={styles.imageContainer}>
                            <div
                                className={styles.imageWrapper}
                                onMouseEnter={() =>
                                    isEditing && setIsHovering(true)
                                }
                                onMouseLeave={() => setIsHovering(false)}
                            >
                                <img
                                    src={editedChat.image}
                                    alt={`${editedChat.storeName} 프로필`}
                                    className={styles.profileImage}
                                />
                                {isEditing && isHovering && (
                                    <div className={styles.imageOverlay}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className={styles.imageInput}
                                        />
                                        <span>이미지 변경</span>
                                    </div>
                                )}
                            </div>
                            <h3 className={styles.storeName}>
                                {editedChat.storeName}
                            </h3>
                        </div>

                        <div className={styles.divider} />

                        <div className={styles.registrantSection}>
                            <h3>등록자 정보</h3>
                            <div className={styles.infoGrid}>
                                {renderField('이름', 'registrantName')}
                                {renderField('연락처', 'registrantPhone')}
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3>상호 정보</h3>
                        <div className={styles.infoGroup}>
                            {renderField('상호명', 'storeName')}
                            {renderField('상호 전화번호', 'storePhone')}
                            {renderField('상호 주소', 'storeAddress')}
                            {renderField('상호 정보', 'storeInfo')}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3>지식 베이스</h3>
                        <div className={styles.infoItem}>
                            {isEditing ? (
                                <div className={styles.fileUpload}>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt"
                                        onChange={handleFileChange}
                                        className={styles.fileInput}
                                        id="knowledgeBase"
                                    />
                                    <label
                                        htmlFor="knowledgeBase"
                                        className={styles.fileLabel}
                                    >
                                        파일 선택
                                    </label>
                                    <span className={styles.currentFile}>
                                        현재 파일: {editedChat.knowledgeBase}
                                    </span>
                                </div>
                            ) : (
                                <a
                                    href={editedChat.knowledgeBase}
                                    download
                                    className={styles.downloadLink}
                                >
                                    지식 베이스 파일 다운로드
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.footer}>
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className={styles.saveButton}
                            >
                                저장하기
                            </button>
                            <button
                                onClick={handleCancel}
                                className={styles.cancelButton}
                            >
                                뒤로가기
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className={styles.editButton}
                            >
                                수정하기
                            </button>
                            <button
                                onClick={handleDelete}
                                className={styles.deleteButton}
                            >
                                삭제하기
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

ChatDetail.propTypes = {
    chat: PropTypes.shape({
        id: PropTypes.number.isRequired,
        image: PropTypes.string.isRequired,
        storeName: PropTypes.string.isRequired,
        registrantName: PropTypes.string.isRequired,
        registrantPhone: PropTypes.string.isRequired,
        storePhone: PropTypes.string.isRequired,
        storeAddress: PropTypes.string.isRequired,
        storeInfo: PropTypes.string.isRequired,
        knowledgeBase: PropTypes.string.isRequired,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default ChatDetail;
