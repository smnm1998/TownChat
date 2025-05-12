import React from 'react';
import PropTypes from 'prop-types';

// 인라인 마크다운 파서
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

const parseStoreInfoText = (text) => {
  if (!text) return '';
  
  // 특수한 패턴 감지: 레스토랑 정보 섹션 (여러 줄의 "키: 값" 패턴)
  const lines = text.split('\n');
  const formattedLines = [];
  
  // 제목 / 섹션 제목으로 시작하는지 확인
  const hasTitle = lines.length > 0 && (
    lines[0].trim().startsWith('식당 이름:') || 
    lines[0].trim().match(/^[가-힣\s]+:/) ||
    lines[0].trim().match(/^[A-Za-z\s]+:/)
  );
  
  if (hasTitle) {
    let currentSection = null;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 비어있는 줄 무시
      if (!trimmedLine) return;
      
      // "키: 값" 패턴 확인
      const keyValueMatch = trimmedLine.match(/^([^:]+):\s*(.*)/);
      
      if (keyValueMatch) {
        // 섹션 제목 (첫 번째 줄)
        if (index === 0 || trimmedLine.startsWith('식당 이름:')) {
          currentSection = 'info';
          formattedLines.push(`<h4 class="store-title">${parseInlineMarkdown(trimmedLine)}</h4>`);
        } else {
          // 일반 정보 항목
          const key = keyValueMatch[1].trim();
          const value = keyValueMatch[2].trim();
          formattedLines.push(`
            <div class="store-info-item">
              <span class="store-info-key">${parseInlineMarkdown(key)}:</span>
              <span class="store-info-value">${parseInlineMarkdown(value)}</span>
            </div>
          `);
        }
      } else if (trimmedLine.includes('-') && trimmedLine.match(/\d+원/)) {
        // 메뉴 항목 (가격 포함)
        currentSection = 'menu';
        
        // 여러 항목 분리 (하이픈으로 구분)
        const menuParts = trimmedLine.split(/\s*-\s*/g).filter(part => part.trim());
        
        if (menuParts.length >= 2) {
          const menuName = menuParts[0].trim();
          const menuDetails = menuParts.slice(1);
          
          formattedLines.push(`
            <div class="menu-item">
              <span class="menu-name">${parseInlineMarkdown(menuName)}</span>
              ${menuDetails.map(detail => 
                `<span class="menu-detail">${parseInlineMarkdown(detail)}</span>`
              ).join(' ')}
            </div>
          `);
        } else {
          // 단일 항목인 경우
          formattedLines.push(`<div class="menu-item">${parseInlineMarkdown(trimmedLine)}</div>`);
        }
      } else if (trimmedLine.includes('시간:') || trimmedLine.includes('전화번호:') || trimmedLine.includes('주소:')) {
        // 주요 정보 항목 (특별 스타일)
        const parts = trimmedLine.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          
          formattedLines.push(`
            <div class="store-contact-info">
              <span class="store-info-key">${parseInlineMarkdown(key)}:</span>
              <span class="store-info-value">${parseInlineMarkdown(value)}</span>
            </div>
          `);
        } else {
          formattedLines.push(`<div class="info-text">${parseInlineMarkdown(trimmedLine)}</div>`);
        }
      } else {
        // 일반 텍스트 (위 조건에 해당하지 않는 경우)
        formattedLines.push(`<div class="info-text">${parseInlineMarkdown(trimmedLine)}</div>`);
      }
    });
    
    // 감지된 패턴에 따라 전체 컨테이너 스타일 결정
    return `<div class="store-info-container">${formattedLines.join('')}</div>`;
  }
  
  // 특수 패턴이 없는 경우, 기본 마크다운 파싱 진행
  return null;
};

const parseMarkdown = (text) => {
  if (!text) return '';
  
  // 먼저 특수한 형식(가게 정보)인지 확인
  const storeInfoOutput = parseStoreInfoText(text);
  if (storeInfoOutput) {
    return storeInfoOutput;
  }
  
  // 일반 마크다운 파싱
  // 텍스트를 단락으로 분리 (빈 줄 기준)
  const paragraphs = text.split(/\n\s*\n/);
  const htmlOutput = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;

    // 단락 내 각 줄을 배열로 변환
    const lines = paragraph.split('\n');
    
    // 메뉴 스타일 텍스트 (여러 줄의 "- " 시작 항목) 감지
    const isMenuList = lines.length > 1 && lines.filter(line => line.trim().startsWith('-')).length > 1;
    
    if (isMenuList) {
      // 메뉴 목록 처리
      const nonMenuLines = []; // 메뉴 항목이 아닌 줄 (소개문 등)
      const menuItems = []; // 메뉴 항목

      // 각 줄을 분류
      lines.forEach(line => {
        if (line.trim().startsWith('-')) {
          // 하이픈으로 시작하는 줄은 메뉴 항목으로 처리
          menuItems.push(line.trim());
        } else if (line.trim()) {
          // 내용이 있는 일반 줄은 소개문으로 처리
          nonMenuLines.push(line.trim());
        }
      });

      // 소개문 처리
      if (nonMenuLines.length > 0) {
        htmlOutput.push(`<p class="menu-intro">${parseInlineMarkdown(nonMenuLines.join(' '))}</p>`);
      }

      // 메뉴 목록 처리
      if (menuItems.length > 0) {
        htmlOutput.push('<div class="menu-list">');
        menuItems.forEach(item => {
          // 하이픈 제거하고 내용 처리
          const content = item.replace(/^-\s*/, '').trim();
          
          // 가격 정보가 포함된 항목 처리 (예: "메뉴명 - 가격")
          if (content.includes(' - ')) {
            const parts = content.split(/ - /g); // 모든 " - " 기준 분리
            const menuName = parts[0].trim();
            const details = parts.slice(1);
            
            // 메뉴명과 가격 정보를 구조화하여 표시
            htmlOutput.push(`<div class="menu-item">
              <span class="menu-name">${parseInlineMarkdown(menuName)}</span>
              ${details.map(detail => 
                `<span class="menu-detail">${parseInlineMarkdown(detail)}</span>`
              ).join(' ')}
            </div>`);
          } else {
            // 단순 메뉴 항목
            htmlOutput.push(`<div class="menu-item">${parseInlineMarkdown(content)}</div>`);
          }
        });
        htmlOutput.push('</div>');
      }
    } else {
      // 일반 텍스트 단락 처리
      
      // 헤딩 처리 (###)
      if (paragraph.startsWith('### ')) {
        const headingText = paragraph.replace(/^###\s+/, '');
        htmlOutput.push(`<h4 class="markdown-heading">${parseInlineMarkdown(headingText)}</h4>`);
        continue;
      }
      
      // 인용구 처리 (>)
      if (paragraph.startsWith('> ')) {
        const quoteText = paragraph.replace(/^>\s+/, '');
        htmlOutput.push(`<blockquote><p>${parseInlineMarkdown(quoteText)}</p></blockquote>`);
        continue;
      }
      
      // 단일 "키: 값" 패턴 처리
      if (/^([^:\n]+):\s*(.+)$/.test(paragraph.trim())) {
        const matches = paragraph.trim().match(/^([^:\n]+):\s*(.+)$/);
        const key = matches[1].trim();
        const value = matches[2].trim();
        
        htmlOutput.push(`
          <div class="info-item">
            <span class="info-key">${parseInlineMarkdown(key)}:</span>
            <span class="info-value">${parseInlineMarkdown(value)}</span>
          </div>
        `);
        continue;
      }
      
      // 단일 줄 리스트 항목 처리
      if (paragraph.startsWith('- ')) {
        const itemContent = paragraph.replace(/^-\s+/, '');
        htmlOutput.push(`<ul><li>${parseInlineMarkdown(itemContent)}</li></ul>`);
        continue;
      }
      
      // 일반 단락
      htmlOutput.push(`<p>${parseInlineMarkdown(paragraph)}</p>`);
    }
  }

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

export default MarkdownRenderer;