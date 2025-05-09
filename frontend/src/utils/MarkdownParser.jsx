import React from 'react';
import PropTypes from 'prop-types';

// 인라인 마크다운 파서 (이전과 동일)
const parseInlineMarkdown = (text) => {
    if (!text) return '';
    let result = text;
    result = result.replace(/`([^`]+?)`/g, '<code>$1</code>');
    const urlRegex = /(https?:\/\/[^\s<>()"]+[^\s<>()",.?!;:'])/g;
    result = result.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    result = result.replace(/\*\*(?!\s)(.*?[^\s])\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(?!\s)(.*?[^\s])\*/g, '<em>$1</em>');
    result = result.replace(/~~(?!\s)(.*?[^\s])~~/g, '<del>$1</del>');
    result = result.replace(/(\d{2,4}-\d{3,4}-\d{4})/g, '<a href="tel:$1">$1</a>');
    result = result.replace(/(^|\s)(#([^\s#<>]+))/g, '$1<span class="hashtag">$2</span>');
    return result;
};


const parseMarkdown = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    const htmlOutput = [];
    let currentParagraph = []; // 연속된 일반 텍스트 라인을 모으는 버퍼
    let inList = false;
    let listType = ''; // ul 또는 ol
    let inBlockquote = false;
    let blockquoteContent = [];

    const flushParagraph = () => {
        if (currentParagraph.length > 0) {
            htmlOutput.push(`<p>${currentParagraph.map(parseInlineMarkdown).join('<br />')}</p>`);
            currentParagraph = [];
        }
    };

    const closeOpenBlocks = (keepListOpen = false, keepBlockquoteOpen = false) => {
        flushParagraph(); // 블록 변경 전에 현재 문단 처리
        if (inList && !keepListOpen) {
            htmlOutput.push(listType === 'ol' ? '</ol>' : '</ul>');
            inList = false;
            listType = '';
        }
        if (inBlockquote && !keepBlockquoteOpen) {
            if (blockquoteContent.length > 0) {
                const processedBQContent = blockquoteContent.map(parseInlineMarkdown).join('<br />');
                htmlOutput.push(`<blockquote><p>${processedBQContent}</p></blockquote>`);
            }
            blockquoteContent = [];
            inBlockquote = false;
        }
    };

    const processListItemContent = (itemText) => {
        const cleanedItemText = itemText.trim();
        if (!cleanedItemText) return '';

        const infoItemMatch = cleanedItemText.match(/^([^:\n]+):\s*(.+)/);
        if (infoItemMatch) {
            const key = infoItemMatch[1].trim();
            const value = infoItemMatch[2].trim();
            return (
                `<div class="markdown-info-item">` +
                `<span class="markdown-info-key">${parseInlineMarkdown(key)}:</span> ` +
                `<span class="markdown-info-value">${parseInlineMarkdown(value)}</span>` +
                `</div>`
            );
        }
        return parseInlineMarkdown(cleanedItemText);
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i]; // trim()은 각 규칙에서 필요에 따라 수행

        // 0. 빈 줄: 문단 구분자 및 블록 종료 신호
        if (line.trim() === '') {
            closeOpenBlocks(); // 모든 블록 닫고, 문단도 flush
            continue;
        }

        // --- 특정 블록 요소 우선 처리 ---
        // (HR, Blockquote, Heading, List Item)
        // 이들은 currentParagraph에 추가되지 않고 즉시 HTML로 변환

        // 0.1 구분선 (HR)
        if (line.trim().match(/^(\s*([-*_])\s*){3,}$/)) {
            closeOpenBlocks();
            htmlOutput.push('<hr class="markdown-hr" />');
            continue;
        }

        // 0.2 블록 인용 (>)
        if (line.trim().startsWith('>')) {
            closeOpenBlocks(false, true); // 인용 유지
            if (!inBlockquote) {
                inBlockquote = true;
            }
            blockquoteContent.push(line.trim().substring(line.trim().startsWith('> ') ? 2 : 1).trim());
            continue;
        }
        // 이전이 인용이었고 현재가 인용이 아니면 인용 닫기 (다른 블록 시작 전에)
        if (inBlockquote && !line.trim().startsWith('>')) {
            closeOpenBlocks(); // 여기서 인용 닫힘
        }


        // 0.3 헤딩 (###) - 내부 " - " 패턴은 여전히 목록으로 처리 가능
        const headingMatch = line.trim().match(/^###\s+(.*)/);
        if (headingMatch) {
            closeOpenBlocks();
            let contentAfterMarker = headingMatch[1].trim();
            const parts = contentAfterMarker.split(/\s+-\s+/);

            if (parts.length > 0 && parts[0].trim()) {
                htmlOutput.push(`<h4 class="markdown-heading">${parseInlineMarkdown(parts[0].trim())}</h4>`);
            }

            if (parts.length > 1) { // 헤딩과 같은 줄에 리스트 아이템이 있는 경우
                // 여기에 리스트를 만들고 싶다면 ul/li 로직 추가
                // 예시: htmlOutput.push('<ul class="heading-associated-list">'); ...
                // 여기서는 헤딩만 처리하고, 다음 라인부터 리스트가 시작될 수 있도록 함
                // 또는, 헤딩과 직접 연결된 정보 목록은 다른 스타일을 줄 수 있음
                htmlOutput.push('<ul class="info-list-under-heading">'); // 특별한 클래스 부여
                for (let j = 1; j < parts.length; j++) {
                    const itemHTML = processListItemContent(parts[j]);
                    if (itemHTML) {
                        htmlOutput.push(`<li>${itemHTML}</li>`);
                    }
                }
                htmlOutput.push('</ul>');
            }
            continue;
        }

        // 0.4 리스트 아이템 (- 또는 *)
        const listItemMatch = line.trim().match(/^\s*([-*])\s+(.+)/);
        if (listItemMatch) {
            closeOpenBlocks(true, false); // 리스트 유지
            if (!inList || listType !== 'ul') { // 다른 타입 리스트였거나 리스트가 아니었으면 새로 시작
                if (inList) htmlOutput.push(listType === 'ol' ? '</ol>' : '</ul>'); // 이전 리스트 닫기
                htmlOutput.push('<ul>'); // 현재는 ul만 지원
                inList = true;
                listType = 'ul';
            }
            const itemHTML = processListItemContent(listItemMatch[2]);
            if (itemHTML) {
                htmlOutput.push(`<li>${itemHTML}</li>`);
            }
            continue;
        }
         // 이전이 리스트였고 현재가 리스트 아이템이 아니면 리스트 닫기
        if (inList && !listItemMatch) {
            closeOpenBlocks(); // 여기서 리스트 닫힘
        }

        // --- 위의 특정 블록 요소에 해당하지 않는 경우, 문단으로 간주 ---
        // 또는, "키: 값" 단독 라인이나 " - " 포함 라인 등의 특수 일반 텍스트 처리

        // 0.5 "키: 값" 패턴 (단독 라인) - 문단 처리 전에 확인
        const infoItemMatchStandalone = line.trim().match(/^([^:\n]+):\s*(.+)/);
        if (infoItemMatchStandalone) {
            closeOpenBlocks(); // 이전 문단/블록 닫기
            const key = infoItemMatchStandalone[1].trim();
            const value = infoItemMatchStandalone[2].trim();
            // 이것 자체를 하나의 문단(<p>)으로 감싸거나, 특별한 div로 감쌈
            htmlOutput.push(
                // `<p><div class="markdown-info-item standalone-info">...</div></p>` 또는
                `<div class="markdown-info-item standalone-info section-like-item">` + // section-like-item 추가
                `<span class="markdown-info-key">${parseInlineMarkdown(key)}:</span> ` +
                `<span class="markdown-info-value">${parseInlineMarkdown(value)}</span>` +
                `</div>`
            );
            continue;
        }

        // 0.6 일반 텍스트 줄에서 " - " 패턴 (문단 처리 전에 확인)
        //    이것은 보통 소개문 + 리스트 형태를 의도
        if (line.trim().includes(' - ')) {
            closeOpenBlocks(); // 이전 문단/블록 닫기
            const parts = line.trim().split(/\s+-\s+/);
            let introText = parts[0].trim();

            if (introText) {
                // 소개문이 콜론으로 끝나면 특별 클래스
                if (introText.match(/^([^:\n]+?):\s*$/) && parts.length > 1) {
                     htmlOutput.push(`<p class="markdown-list-intro">${parseInlineMarkdown(introText.slice(0,-1).trim())}:</p>`);
                } else {
                    htmlOutput.push(`<p>${parseInlineMarkdown(introText)}</p>`);
                }
            }

            if (parts.length > 1) {
                htmlOutput.push('<ul class="info-list-inline">'); // 특별한 클래스
                for (let k = 1; k < parts.length; k++) {
                    const itemHTML = processListItemContent(parts[k]);
                    if (itemHTML) {
                        htmlOutput.push(`<li>${itemHTML}</li>`);
                    }
                }
                htmlOutput.push('</ul>');
            }
            continue;
        }


        // 0.7 일반 텍스트 라인이면 currentParagraph에 추가
        currentParagraph.push(line); // trim()은 flushParagraph 내부에서 parseInlineMarkdown이 처리
    }

    closeOpenBlocks(); // 루프 후 남아있는 모든 것 처리 (특히 마지막 문단)

    return htmlOutput.join('');
};


export const MarkdownRenderer = ({ content, className }) => {
    const html = parseMarkdown(content || '');
    return (
        <div
            className={className}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

MarkdownRenderer.propTypes = {
    content: PropTypes.string.isRequired,
    className: PropTypes.string,
};

// export default MarkdownRenderer;