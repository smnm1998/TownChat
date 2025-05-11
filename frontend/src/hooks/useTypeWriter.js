import { useState, useEffect, useRef, useCallback } from 'react';

const useTypewriter = (textToType = '', speed = 30, skipInitially = false) => {

    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    const indexRef = useRef(0);
    const timerRef = useRef(null);
    // currentTextRef를 useEffect 외부에서 바로 초기화하면, textToType prop의 초기값만 반영하고 이후 변경을 못 따라갈 수 있음
    // const currentTextRef = useRef(textToType); // <--- 이 부분이 문제의 소지가 될 수 있음

    // useEffect 내부에서 currentText를 관리하거나, textToType prop을 직접 사용하는 것이 더 안전
    useEffect(() => {
        const currentText = String(textToType || ''); // 항상 문자열로, useEffect 스코프 내에서 최신 prop 값 사용

        indexRef.current = 0;
        setDisplayedText(''); // 타이핑 시작 전 초기화
        setIsComplete(false); // 완료 상태도 초기화

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (skipInitially || currentText === '') {
            setDisplayedText(currentText);
            setIsComplete(true);
            return;
        }

        const type = () => {
            // currentText (useEffect 스코프 내의 최신 prop 값)를 사용해야 함
            if (indexRef.current < currentText.length) {
                // 여기서 displayedText가 어떻게 업데이트 되는지, currentText[indexRef.current] 값이 무엇인지 중요
                const charToAdd = currentText[indexRef.current];

                setDisplayedText((prev) => {
                    // 첫 글자가 빠지는 문제와 .undefined가 붙는 문제는 여기서 발생할 가능성 높음
                    // prev가 초기 빈 문자열일 때, 또는 setState의 비동기적 특성 때문에 발생
                    return prev + charToAdd;
                });
                indexRef.current += 1;
                timerRef.current = setTimeout(type, speed);
            } else {
                setIsComplete(true);
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            }
        };

        timerRef.current = setTimeout(type, speed); // 첫 글자 타이핑 시작

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
                console.log('[useTypewriter] Cleanup: Timer cleared on unmount or textToType/skipInitially change.');
            }
        };
    }, [textToType, speed, skipInitially]);

    const completeTyping = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        // completeTyping 시에는 textToType prop의 최신 값을 사용해야 함
        setDisplayedText(String(textToType || ''));
        setIsComplete(true);
        indexRef.current = (textToType || '').length;
    }, [textToType]); // textToType 의존성 추가

    return {
        text: displayedText,
        isComplete,
        completeTyping,
    };
};

export default useTypewriter;