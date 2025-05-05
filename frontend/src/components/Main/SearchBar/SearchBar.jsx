import { useEffect, useState, useCallback } from 'react';
import { FiSearch, FiX } from 'react-icons/fi'; // FiX 아이콘 import 추가
import styles from './SearchBar.module.css';

const SearchBar = ({ onSearch, onClear, isSearching = false, initialSearchTerm = '' }) => {
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [suggestions, setSuggestions] = useState([]); // 오타 수정: setSuggestiong -> setSuggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);

    useEffect(() => {
        setSearchTerm(initialSearchTerm);
    }, [initialSearchTerm]);

    const fetchSuggestions = useCallback(async (term) => {
        if (!term || term.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`/api/stores/suggestions?query=${encodeURIComponent(term)}`);

            if (!response.ok) {
                throw new Error('자동완성 조회 실패');
            }

            const data = await response.json();
            setSuggestions(data.data || []);
        } catch (error) {
            console.error('자동 완성 조회 중 오류: ', error);
        }
    }, []);

    // 입력 변경 처리
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        // 디바운스 처리
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        const timeout = setTimeout(() => {
            fetchSuggestions(value);
        }, 500);

        setTypingTimeout(timeout);

        if (value) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    // 검색어 초기화
    const handleClear = () => {
        setSearchTerm('');
        setSuggestions([]); // 오타 수정: setSuggestiong -> setSuggestions
        setShowSuggestions(false);
        if (onClear) onClear();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSuggestions(false);
        if (onSearch && searchTerm.trim()) {
            onSearch(searchTerm);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setSearchTerm(suggestion.name); // 수정: suggestions.name -> suggestion.name
        setShowSuggestions(false);
        if (onSearch) {
            onSearch(suggestion.name);
        }
    };

    return (
        <div className={styles.container}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.searchWrapper}>
                    <button type="submit" className={styles.searchButton} disabled={isSearching}>
                        <FiSearch className={styles.searchIcon} />
                    </button>
                    
                    <input 
                        type="text" 
                        placeholder="점포 명을 입력해주세요"
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={() => searchTerm && setShowSuggestions(true)}
                        disabled={isSearching}
                    />
                    
                    {searchTerm && (
                        <button 
                            type="button" 
                            className={styles.clearButton}
                            onClick={handleClear}
                            disabled={isSearching}
                        >
                            <FiX className={styles.clearIcon} />
                        </button>
                    )}
                </div>
                
                {showSuggestions && suggestions.length > 0 && (
                    <div className={styles.suggestionsContainer}>
                        <ul className={styles.suggestionsList}>
                            {suggestions.map((suggestion) => (
                                <li 
                                    key={suggestion.id} 
                                    className={styles.suggestionItem}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                >
                                    <FiSearch className={styles.suggestionIcon} />
                                    <span>{suggestion.name}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </form>
        </div>
    );
};

export default SearchBar;