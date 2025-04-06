import { useState, useEffect, useRef, useCallback } from 'react';

const useTypewriter = (text = '', speed = 30, skipTyping = false) => {
    // 항상 빈 문자열로 초기화하여 undefined 방지
    const [displayedText, setDisplayedText] = useState(skipTyping ? (text || '') : '');
    const [isComplete, setIsComplete] = useState(skipTyping);
    const timerRef = useRef(null);
    const indexRef = useRef(0);
    
    const completeTyping = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // 항상 문자열로 변환하여 undefined 방지
        setDisplayedText(text || '');
        setIsComplete(true);
        indexRef.current = text ? text.length : 0;
    }, [text]);
    
    useEffect(() => {
        // 빈 문자열 또는 undefined 체크 추가
        const safeText = text || '';
        
        if (skipTyping || safeText === '') {
            setDisplayedText(safeText);
            setIsComplete(true);
            indexRef.current = safeText.length;
            return;
        }
        
        setDisplayedText('');
        setIsComplete(false);
        indexRef.current = 0;
        
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        
        const typeNextChar = () => {
            if (indexRef.current < safeText.length) {
                // 이전 값을 전달받아 업데이트하여 undefined 방지
                setDisplayedText(prev => {
                    const prevText = prev || '';
                    return prevText + safeText[indexRef.current];
                });
                indexRef.current++;
                
                timerRef.current = setTimeout(typeNextChar, speed);
            } else {
                setIsComplete(true);
                timerRef.current = null;
            }
        };
        
        timerRef.current = setTimeout(typeNextChar, speed);
        
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [text, speed, skipTyping]);
    
    return { 
        text: (displayedText || '').toString(),
        isComplete, 
        completeTyping 
    };
};

export default useTypewriter;