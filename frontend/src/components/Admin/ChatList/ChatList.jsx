import { useState, useCallback, useMemo } from 'react';
import { RiSearchLine, RiDeleteBin6Line } from 'react-icons/ri';
import ChatDetail from '../ChatDetail/ChatDetail';
import styles from './ChatList.module.css';

const ChatList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);

    // 임시 데이터
    const dummyData = useMemo(
        () =>
            Array.from({ length: 23 }, (_, index) => ({
                id: index + 1,
                storeName: `가게 ${index + 1}`,
                ownerName: `사장님 ${index + 1}`,
                address: `서울시 강남구 ${index + 1}`,
                phone: `010-1234-${String(index + 1).padStart(4, '0')}`,
                image: '/placeholder-image.jpg',
                registrantName: '등록자 이름',
                registrantPhone: '010-0000-0000',
                storePhone: '02-0000-0000',
                storeAddress: '서울시 강남구',
                storeInfo: '상점 상세 정보...',
                knowledgeBase: '#',
            })),
        []
    );

    const itemsPerPage = 12;

    // 데이터 처리 관련 함수들
    const currentData = useMemo(
        () => (filteredData.length > 0 ? filteredData : dummyData),
        [filteredData, dummyData]
    );

    const totalPages = useMemo(
        () => Math.ceil(currentData.length / itemsPerPage),
        [currentData, itemsPerPage]
    );

    const getCurrentPageData = useCallback(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return currentData.slice(startIndex, startIndex + itemsPerPage);
    }, [currentPage, currentData, itemsPerPage]);

    // 이벤트 핸들러
    const handleSearch = useCallback(() => {
        const trimmedTerm = searchTerm.trim();
        if (!trimmedTerm) {
            setFilteredData([]);
            return;
        }

        const loweredTerm = trimmedTerm.toLowerCase();
        const results = dummyData.filter(
            (item) =>
                item.storeName.toLowerCase().includes(loweredTerm) ||
                item.ownerName.toLowerCase().includes(loweredTerm) ||
                item.address.toLowerCase().includes(loweredTerm) ||
                item.phone.includes(trimmedTerm)
        );

        setFilteredData(results);
        setCurrentPage(1);
    }, [searchTerm, dummyData]);

    const handleToggleSelect = useCallback((id) => {
        setSelectedItems((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id]
        );
    }, []);

    const handleRowClick = useCallback(
        (chat, e) => {
            if (
                e.target.type === 'checkbox' ||
                e.target.className.includes('checkboxCell')
            ) {
                return;
            }
            showCheckboxes
                ? handleToggleSelect(chat.id)
                : setSelectedChat(chat);
        },
        [showCheckboxes, handleToggleSelect]
    );

    // 렌더링 컴포넌트
    const renderTableHeader = () => (
        <tr>
            {showCheckboxes && (
                <th className={styles.checkboxCell}>
                    <input
                        type="checkbox"
                        onChange={(e) => {
                            const currentIds = getCurrentPageData().map(
                                (item) => item.id
                            );
                            setSelectedItems(
                                e.target.checked ? currentIds : []
                            );
                        }}
                        checked={
                            getCurrentPageData().length > 0 &&
                            getCurrentPageData().every((item) =>
                                selectedItems.includes(item.id)
                            )
                        }
                    />
                </th>
            )}
            <th>상호명</th>
            <th>대표자</th>
            <th>주소</th>
            <th>연락처</th>
        </tr>
    );

    const renderTableBody = () => (
        <tbody>
            {getCurrentPageData().map((item) => (
                <tr
                    key={item.id}
                    onClick={(e) => handleRowClick(item, e)}
                    className={styles.tableRow}
                >
                    {showCheckboxes && (
                        <td className={styles.checkboxCell}>
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={() => handleToggleSelect(item.id)}
                            />
                        </td>
                    )}
                    <td>{item.storeName}</td>
                    <td>{item.ownerName}</td>
                    <td>{item.address}</td>
                    <td>{item.phone}</td>
                </tr>
            ))}
        </tbody>
    );

    const renderPagination = () =>
        totalPages > 1 && (
            <div className={styles.pagination}>
                {Array.from({ length: totalPages }, (_, i) => (
                    <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`${styles.pageButton} ${
                            currentPage === i + 1 ? styles.activePage : ''
                        }`}
                    >
                        {i + 1}
                    </button>
                ))}
            </div>
        );

    return (
        <div className={styles.container}>
            {/* 툴바 */}
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <RiSearchLine className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="챗봇 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className={styles.searchInput}
                    />
                    <button
                        onClick={handleSearch}
                        className={styles.searchButton}
                    >
                        검색하기
                    </button>
                    {filteredData.length > 0 && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilteredData([]);
                                setCurrentPage(1);
                            }}
                            className={styles.resetButton}
                        >
                            초기화
                        </button>
                    )}
                </div>

                <div className={styles.buttonGroup}>
                    {showCheckboxes && (
                        <button
                            onClick={() => {
                                if (selectedItems.length > 0) {
                                    // API 호출 로직 추가 예정
                                    setSelectedItems([]);
                                }
                            }}
                            className={styles.confirmDeleteButton}
                        >
                            선택 삭제
                        </button>
                    )}
                    <button
                        onClick={() => setShowCheckboxes((prev) => !prev)}
                        className={styles.deleteButton}
                    >
                        <RiDeleteBin6Line />
                        삭제하기
                    </button>
                </div>
            </div>

            {/* 테이블 */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>{renderTableHeader()}</thead>
                    {renderTableBody()}
                </table>
            </div>

            {/* 모달 */}
            {selectedChat && (
                <ChatDetail
                    chat={selectedChat}
                    onClose={() => setSelectedChat(null)}
                />
            )}

            {/* 페이지네이션 */}
            {renderPagination()}
        </div>
    );
};

export default ChatList;
