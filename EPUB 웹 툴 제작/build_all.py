import os
from PIL import Image, ImageDraw

os.makedirs('icons', exist_ok=True)
os.makedirs('css', exist_ok=True)
os.makedirs('js', exist_ok=True)

# 1. Icons
def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = int(size * 0.05)
    radius = int(size * 0.2)
    draw.rounded_rectangle([margin, margin, size - margin, size - margin], radius=radius, fill='#2563eb')
    pad = int(size * 0.25)
    book_w = size - 2 * pad
    book_h = int(book_w * 1.1)
    top_y = int((size - book_h) / 2)
    mid_x = size // 2
    draw.rectangle([mid_x - book_w//2, top_y, mid_x - int(size*0.02), top_y + book_h], fill='#ffffff')
    draw.rectangle([mid_x + int(size*0.02), top_y, mid_x + book_w//2, top_y + book_h], fill='#e2e8f0')
    draw.line([mid_x, top_y, mid_x, top_y + book_h], fill='#cbd5e1', width=max(2, int(size*0.02)))
    line_spacing = int(book_h * 0.18)
    for i in range(1, 4):
        ly = top_y + i * line_spacing
        draw.line([mid_x - int(book_w*0.4), ly, mid_x - int(book_w*0.1), ly], fill='#94a3b8', width=max(2, int(size*0.015)))
        draw.line([mid_x + int(book_w*0.1), ly, mid_x + int(book_w*0.4), ly], fill='#94a3b8', width=max(2, int(size*0.015)))
    img.save(filename, 'PNG')

create_icon(192, 'icons/icon-192.png')
create_icon(512, 'icons/icon-512.png')

# 2. manifest.json
with open('manifest.json', 'w', encoding='utf-8') as f:
    f.write('''{
  "name": "EPUB 전자책 제작 스튜디오",
  "short_name": "EPUB Studio",
  "description": "TXT 파일을 빠르고 안전하게 표준 EPUB 3/2 전자책으로 변환하는 모던 웹 툴",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#f4f6f9",
  "theme_color": "#2563eb",
  "orientation": "any",
  "icons": [
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}''')

# 3. index.html
with open('index.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>EPUB 전자책 제작 스튜디오 (v2.1.7)</title>
    
    <!-- PWA Settings -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#2563eb">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="apple-touch-icon" href="icons/icon-192.png">

    <!-- Fonts & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=Pretendard:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- App Styles -->
    <link rel="stylesheet" href="css/style.css">
    
    <!-- JSZip for EPUB compression -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</head>
<body>

    <!-- Top Header -->
    <header class="app-header">
        <div class="header-top">
            <div class="app-title">
                <i class="fa-solid fa-book-open-reader" style="color: #2563eb;"></i>
                <span>EPUB Studio</span>
                <span class="app-version">v2.1.7</span>
                <span id="uiModeBadge" class="ui-mode-badge">[감지 중...]</span>
            </div>
            <div class="header-right-action">
                <button id="btnOpenPublishModal" class="btn btn-export" title="도서 메타데이터 설정 후 EPUB 전자책을 생성합니다">
                    <i class="fa-solid fa-file-export"></i> <span>전자책 생성</span>
                </button>
            </div>
        </div>

        <!-- Top Core Toolbar (Editor-focused: Load / Analyze / Add) -->
        <div class="toolbar">
            <div class="toolbar-scroll-container">
                <!-- 파일 불러오기 -->
                <button id="btnLoadFile" class="btn btn-load" title="TXT 파일 열기">
                    <i class="fa-regular fa-folder-open"></i> <span>파일 불러오기</span>
                </button>
                <input type="file" id="fileInput" accept=".txt" style="display: none;">

                <!-- 목차 형식 분석 -->
                <button id="btnLearnPattern" class="btn btn-analyze" title="선택 텍스트 패턴(예: 제1장) 분석하여 전체 목차 자동 생성">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> <span>목차 형식 분석</span>
                </button>

                <!-- 선택영역 목차 추가 -->
                <button id="btnAddManualToc" class="btn btn-manual" title="선택 영역을 수동 목차로 추가">
                    <i class="fa-solid fa-plus"></i> <span>선택영역 목차 추가</span>
                </button>

                <!-- PC / 태블릿 가로 전용 확장 툴바 -->
                <div class="desktop-only-tools">
                    <button id="btnUpdateToc" class="btn btn-sync" title="본문 수정 시 목차 위치 재동기화">
                        <i class="fa-solid fa-arrows-rotate"></i> <span>목차 변동 반영</span>
                    </button>
                    <button id="btnRemoveToc" class="btn btn-del-single" title="선택한 목차 삭제">
                        <i class="fa-solid fa-minus"></i> <span>목차 개별 해제</span>
                    </button>
                    <button id="btnClearAllToc" class="btn btn-del-all" title="목차 전체 초기화">
                        <i class="fa-regular fa-trash-can"></i> <span>목차 전체 삭제</span>
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Workspace -->
    <main class="main-workspace">
        
        <!-- Panel 1: TOC List & Management -->
        <aside id="panelToc" class="workspace-panel panel-toc">
            <div class="panel-header">
                <div class="panel-title">
                    <i class="fa-solid fa-list-ol" style="color: #0284c7;"></i>
                    <span>목차 목록</span>
                    <span id="tocCountBadge" class="badge">0개</span>
                </div>
            </div>
            
            <!-- 목차 탭 전용 내부 관리 툴바 -->
            <div class="toc-sub-toolbar">
                <button id="btnUpdateTocSub" class="btn btn-sync btn-sm" title="본문 수정 시 목차 위치 재동기화">
                    <i class="fa-solid fa-arrows-rotate"></i> <span>동기화</span>
                </button>
                <button id="btnRemoveTocSub" class="btn btn-del-single btn-sm" title="선택한 목차 삭제">
                    <i class="fa-solid fa-minus"></i> <span>개별 해제</span>
                </button>
                <button id="btnClearAllTocSub" class="btn btn-del-all btn-sm" title="목차 전체 초기화">
                    <i class="fa-regular fa-trash-can"></i> <span>전체 삭제</span>
                </button>
            </div>

            <div id="tocList" class="toc-list">
                <div class="empty-placeholder">
                    <i class="fa-solid fa-list-ol"></i>
                    <p>등록된 목차가 없습니다.<br>본문에서 텍스트를 선택 후<br>'목차 형식 분석' 또는 '선택영역 추가'를 클릭하세요.</p>
                </div>
            </div>
        </aside>

        <!-- Panel 2: Main Text Editor -->
        <section id="panelEditor" class="workspace-panel panel-editor active">
            <div class="panel-header">
                <span><i class="fa-solid fa-align-left"></i> 본문 에디터</span>
                <span id="editorStats" class="editor-stats-text">텍스트를 불러오세요</span>
            </div>
            <textarea id="textArea" class="editor-textarea" placeholder="여기에 텍스트 파일을 불러오거나 직접 붙여넣으세요...&#10;&#10;[팁]&#10;1. '파일 불러오기'로 소설 TXT 파일을 엽니다.&#10;2. '제1장...' 같은 목차를 마우스/터치로 드래그 후 [목차 형식 분석]을 누르면 전체 목차가 자동 생성됩니다.&#10;3. 목차를 클릭하면 해당 위치 본문으로 즉시 점프합니다."></textarea>
        </section>

        <!-- Panel 3: Image Library -->
        <aside id="panelImg" class="workspace-panel panel-img">
            <div class="panel-header">
                <div class="panel-title">
                    <i class="fa-regular fa-images" style="color: #16a34a;"></i>
                    <span>삽화 라이브러리</span>
                    <span id="imgCountBadge" class="badge">0개</span>
                </div>
                <div class="img-controls">
                    <button id="btnAddImages" class="btn btn-load btn-sm">
                        <i class="fa-solid fa-upload"></i> <span>추가</span>
                    </button>
                    <input type="file" id="imageInput" accept="image/*" multiple style="display: none;">
                    
                    <div class="view-mode-toggle">
                        <label><input type="radio" name="imageViewMode" value="detail" checked> 목록</label>
                        <label><input type="radio" name="imageViewMode" value="large"> 카드</label>
                    </div>
                </div>
            </div>
            <div id="imgContainer" class="img-gallery detail-view">
                <div class="empty-placeholder">
                    <i class="fa-regular fa-image"></i>
                    <p>등록된 삽화가 없습니다.<br>'추가' 버튼을 눌러 이미지를 등록하세요.</p>
                </div>
            </div>
        </aside>

    </main>

    <!-- Mobile / Portrait Bottom Navigation Bar -->
    <nav class="mobile-bottom-nav">
        <button class="nav-tab active" data-target="panelEditor">
            <i class="fa-solid fa-pen-to-square"></i>
            <span>본문 에디터</span>
        </button>
        <button class="nav-tab" data-target="panelToc">
            <i class="fa-solid fa-list-ol"></i>
            <span>목차 목록</span>
            <span id="mobileTocBadge" class="nav-badge">0</span>
        </button>
        <button class="nav-tab" data-target="panelImg">
            <i class="fa-regular fa-images"></i>
            <span>삽화 보관함</span>
            <span id="mobileImgBadge" class="nav-badge">0</span>
        </button>
    </nav>

    <!-- Toast Notification -->
    <div id="toastMsg" class="toast-msg">
        <span id="toastContent">메시지</span>
        <span id="toastTime" class="toast-time">(3s)</span>
    </div>

    <!-- Final Publishing Modal -->
    <div id="publishModal" class="modal-overlay">
        <div class="modal-card">
            <div class="modal-header">
                <span><i class="fa-solid fa-book" style="color: #2563eb;"></i> 최종 출판 설정</span>
                <button id="btnClosePublishModal" class="btn-close-modal"><i class="fa-solid fa-times"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="inputTitle">도서 제목</label>
                    <input type="text" id="inputTitle" placeholder="도서 제목을 입력하세요">
                </div>
                <div class="form-group">
                    <label for="inputAuthor">작가명</label>
                    <input type="text" id="inputAuthor" placeholder="작가명을 입력하세요">
                </div>
                <div class="form-group">
                    <label for="inputPublisher">출판사</label>
                    <input type="text" id="inputPublisher" placeholder="출판사를 입력하세요 (선택)">
                </div>
                <div class="form-group">
                    <label for="inputDate">작성일자</label>
                    <input type="date" id="inputDate">
                </div>
                
                <div class="form-group">
                    <label>표지 이미지</label>
                    <div class="cover-select-box">
                        <img id="coverPreviewImg" class="cover-preview" alt="표지 미리보기">
                        <div class="cover-info">
                            <span id="coverPreviewName">선택된 표지 이미지 없음</span>
                            <button id="btnSelectCover" type="button" class="btn btn-load btn-sm" style="align-self: flex-start;">
                                <i class="fa-regular fa-image"></i> 이미지 선택
                            </button>
                            <input type="file" id="coverInput" accept="image/*" style="display: none;">
                        </div>
                    </div>
                </div>

                <button id="btnConfirmExport" class="btn btn-export" style="width: 100%; justify-content: center; padding: 12px; margin-top: 10px; font-size: 1rem;">
                    <i class="fa-solid fa-check"></i> 전자책 작성 완료 (.epub 다운로드)
                </button>
            </div>
        </div>
    </div>

    <!-- Progress Modal -->
    <div id="progressModal" class="modal-overlay">
        <div class="modal-card progress-card">
            <h3 id="progressText" style="font-size: 1rem; color: #0f172a;">처리 중...</h3>
            <div class="progress-bar-bg">
                <div id="progressBar" class="progress-bar-fill"></div>
            </div>
            <div class="progress-status">
                <span>진행 상태</span>
                <span id="progressPercent" style="font-weight: 700; color: #2563eb;">0%</span>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="js/epub_generator.js"></script>
    <script src="js/app.js"></script>
    
    <!-- PWA Service Worker Registration -->
    <script>
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
                    .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
            });
        }
    </script>
</body>
</html>''')

# 4. css/style.css with Grand Modal Touch in Phone Portrait
with open('css/style.css', 'w', encoding='utf-8') as f:
    f.write('''/* ==========================================================================
   EPUB Studio - Precision Multi-Device System (v2.1.7 - Grand Modal Touch)
   ========================================================================== */

:root {
    --bg-main: #f4f6f9;
    --bg-panel: #ffffff;
    --border-color: #e2e8f0;
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    
    --btn-primary: #2563eb;
    --btn-analyze: #0284c7;
    --btn-manual: #38bdf8;
    --btn-sync: #eab308;
    --btn-delete-item: #f97316;
    --btn-delete-all: #ef4444;
    --btn-export: #16a34a;

    --highlight-toc: #fef08a;
    --highlight-img: #bbf7d0;
}

*, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
}

html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif;
    background-color: var(--bg-main);
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
}

/* Header & Toolbar Base */
.app-header {
    background-color: var(--bg-panel);
    border-bottom: 1px solid var(--border-color);
    padding: 8px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    z-index: 20;
    flex-shrink: 0;
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.app-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.app-version {
    font-size: 0.72rem;
    background: #e0f2fe;
    color: #0369a1;
    padding: 2px 7px;
    border-radius: 12px;
    font-weight: 600;
}

.ui-mode-badge {
    font-size: 0.72rem;
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
    padding: 2px 7px;
    border-radius: 12px;
    font-weight: 700;
}

.toolbar {
    display: flex;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
}
.toolbar::-webkit-scrollbar { display: none; }

.toolbar-scroll-container {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: nowrap;
    padding-bottom: 2px;
}

.desktop-only-tools {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Button Styles Base */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.btn:hover { filter: brightness(0.92); transform: translateY(-1px); }
.btn:active { transform: translateY(1px); filter: brightness(0.85); }

.btn-load { background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
.btn-analyze { background-color: #38bdf8; color: #082f49; }
.btn-manual { background-color: #7dd3fc; color: #0c4a6e; }
.btn-sync { background-color: #fde047; color: #713f12; }
.btn-del-single { background-color: #fdba74; color: #7c2d12; }
.btn-del-all { background-color: #fca5a5; color: #7f1d1d; }
.btn-export { background-color: #4ade80; color: #052e16; font-size: 0.88rem; padding: 7px 14px; font-weight: 700; }

/* Workspace Base */
.main-workspace {
    flex: 1;
    display: flex;
    padding: 10px;
    gap: 10px;
    overflow: hidden;
    min-height: 0;
}

.workspace-panel {
    background-color: var(--bg-panel);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    overflow: hidden;
    min-height: 0;
}

.panel-header {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.84rem;
    color: var(--text-secondary);
    background: #fafafa;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    flex-shrink: 0;
}

.panel-title {
    font-size: 0.86rem;
    font-weight: 700;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 6px;
}

.badge {
    background: #e2e8f0;
    color: #475569;
    font-size: 0.72rem;
    padding: 1px 6px;
    border-radius: 10px;
    font-weight: 600;
}

/* Editor Panel */
.panel-editor {
    flex: 1;
    min-width: 0;
}

.editor-stats-text {
    font-size: 0.78rem;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.editor-textarea {
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    padding: 14px;
    font-family: "Nanum Myeongjo", "Malgun Gothic", "Pretendard", serif;
    font-size: 1rem;
    line-height: 1.8;
    color: #1e293b;
    resize: none;
    background-color: transparent;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-all;
}

.editor-textarea.drag-over {
    background-color: #f0fdf4;
    outline: 2px dashed #22c55e;
}

/* TOC Panel & Sub Toolbar */
.toc-sub-toolbar {
    display: none;
    padding: 8px 10px;
    background: #f8fafc;
    border-bottom: 1px solid var(--border-color);
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}

.toc-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
}

.toc-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 0.86rem;
    cursor: pointer;
    transition: background 0.1s;
    user-select: none;
}

.toc-item:hover { background-color: #f1f5f9; }
.toc-item.active { background-color: #e0f2fe; font-weight: 600; color: #0369a1; }
.toc-line { color: #64748b; font-family: monospace; font-size: 0.8rem; }
.toc-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-del-toc {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 4px;
    opacity: 0.7;
    transition: all 0.15s;
}
.btn-del-toc:hover { color: #ef4444; background: #fee2e2; }

/* Image Panel & Gallery */
.img-controls { display: flex; align-items: center; gap: 6px; }
.view-mode-toggle { display: flex; align-items: center; gap: 3px; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
.view-mode-toggle label { cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; gap: 2px; }

.img-gallery {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
}

.img-gallery.large-view {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
    align-content: start;
}

.img-card {
    background: #f8fafc;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: grab;
    transition: all 0.15s;
}
.img-card:hover { border-color: #93c5fd; background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.img-thumb-mini { width: 36px; height: 36px; border-radius: 4px; background-size: cover; background-position: center; flex-shrink: 0; border: 1px solid #e2e8f0; }
.img-card .img-name { flex: 1; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.btn-insert-tag { background: #e0f2fe; color: #0369a1; border: none; padding: 5px 8px; border-radius: 4px; font-size: 0.78rem; cursor: pointer; font-weight: 600; }
.btn-insert-tag:hover { background: #bae6fd; }
.btn-del-img { background: transparent; border: none; color: #94a3b8; padding: 5px; border-radius: 4px; cursor: pointer; }
.btn-del-img:hover { color: #ef4444; background: #fee2e2; }

.large-view .img-card { flex-direction: column; padding: 8px; gap: 6px; }
.large-view .img-thumb-large { width: 100%; height: 95px; border-radius: 4px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; }
.large-view .img-thumb-large img { max-width: 100%; max-height: 100%; object-fit: cover; }
.large-view .img-meta { width: 100%; display: flex; flex-direction: column; gap: 4px; }
.large-view .img-actions { display: flex; justify-content: space-between; align-items: center; }
.btn-sm { font-size: 0.76rem; padding: 4px 8px; }

.empty-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-muted);
    text-align: center;
    padding: 20px;
    gap: 8px;
    font-size: 0.85rem;
    line-height: 1.4;
}
.empty-placeholder i { font-size: 2rem; color: #cbd5e1; }

/* Bottom Nav Base */
.mobile-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #ffffff;
    border-top: 1px solid var(--border-color);
    box-shadow: 0 -3px 12px rgba(0,0,0,0.06);
    z-index: 100;
    justify-content: space-around;
    align-items: center;
    padding-bottom: env(safe-area-inset-bottom);
}

.nav-tab {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    transition: all 0.15s;
}
.nav-tab.active { color: #2563eb; font-weight: 700; }
.nav-badge {
    position: absolute;
    top: 6px;
    background: #ef4444;
    color: #ffffff;
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 700;
}

/* Modals Base */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none; transition: all 0.2s ease;
    z-index: 900;
}
.modal-overlay.active { opacity: 1; pointer-events: auto; }
.modal-card {
    background: #ffffff; border-radius: 12px; width: 440px; max-width: 90vw;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden;
    transform: scale(0.95); transition: all 0.2s ease;
}
.modal-overlay.active .modal-card { transform: scale(1); }
.modal-header { padding: 14px 18px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
.btn-close-modal { background: transparent; border: none; font-size: 1.2rem; color: #64748b; cursor: pointer; }
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group label { font-size: 0.88rem; font-weight: 700; color: #334155; }
.form-group input { padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; outline: none; }
.form-group input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

.cover-select-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; background: #f8fafc; }
.cover-preview { width: 55px; height: 75px; background: #e2e8f0; border-radius: 4px; object-fit: cover; display: none; }
.cover-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.cover-info span { font-size: 0.85rem; color: #64748b; word-break: break-all; }

.toast-msg {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-30px);
    background: #1e293b; color: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 0.95rem;
    display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    opacity: 0; pointer-events: none; transition: all 0.25s ease; z-index: 1000;
}
.toast-msg.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.toast-time { color: #f87171; font-size: 0.85rem; font-weight: 700; }

.progress-card { padding: 22px; text-align: center; display: flex; flex-direction: column; gap: 14px; width: 340px; }
.progress-bar-bg { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #2563eb); width: 0%; transition: width 0.15s ease; }
.progress-status { display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; }


/* ==========================================================================
   📱 1. [스마트폰의 세로 UI] 👉 20배 초대형 타이탄 스케일 + 그랜드 모달 터치
   ========================================================================== */
@media (orientation: portrait) and (max-aspect-ratio: 9/16) {
    body {
        padding-bottom: 110px !important;
    }
    .app-header {
        padding: 16px 18px !important;
        gap: 14px !important;
    }
    .app-title {
        font-size: 1.6rem !important;
        gap: 12px !important;
    }
    .app-title i { font-size: 1.7rem !important; }
    .app-version {
        font-size: 1.05rem !important;
        padding: 5px 12px !important;
    }
    .ui-mode-badge {
        font-size: 1.05rem !important;
        padding: 5px 12px !important;
    }
    
    .desktop-only-tools {
        display: none !important;
    }
    .toolbar-scroll-container {
        gap: 14px !important;
        padding-bottom: 8px !important;
    }
    
    .btn {
        padding: 22px 34px !important;
        font-size: 1.55rem !important;
        border-radius: 44px !important;
        font-weight: 800 !important;
        box-shadow: 0 6px 16px rgba(0,0,0,0.15) !important;
        gap: 12px !important;
    }
    .btn i { font-size: 1.65rem !important; }
    .btn span { font-size: 1.55rem !important; }
    .btn-export {
        padding: 20px 32px !important;
        font-size: 1.55rem !important;
    }

    .main-workspace {
        padding: 12px !important;
        height: calc(100vh - 170px - 110px) !important;
        height: calc(100dvh - 170px - 110px) !important;
    }
    .workspace-panel {
        display: none;
        width: 100% !important;
        height: 100% !important;
        border-radius: 16px !important;
    }
    .workspace-panel.active {
        display: flex !important;
    }
    .panel-header {
        padding: 16px 20px !important;
        font-size: 1.3rem !important;
    }
    .panel-title {
        font-size: 1.45rem !important;
        gap: 12px !important;
    }
    .panel-title i { font-size: 1.5rem !important; }
    .badge {
        font-size: 1.1rem !important;
        padding: 4px 12px !important;
    }

    .editor-stats-text {
        font-size: 1.15rem !important;
    }
    .editor-textarea {
        font-size: 1.7rem !important;
        line-height: 2.3 !important;
        padding: 24px !important;
    }

    .toc-sub-toolbar {
        display: flex !important;
        justify-content: space-around !important;
        padding: 16px !important;
        background: #f1f5f9 !important;
        gap: 12px !important;
    }
    .toc-sub-toolbar .btn {
        padding: 16px 22px !important;
        font-size: 1.3rem !important;
        border-radius: 14px !important;
    }

    .toc-item {
        padding: 24px 26px !important;
        font-size: 1.5rem !important;
        border-radius: 14px !important;
        gap: 16px !important;
    }
    .toc-line { font-size: 1.35rem !important; }
    .btn-del-toc { font-size: 1.5rem !important; padding: 10px 16px !important; }

    .img-controls { gap: 12px !important; }
    .view-mode-toggle {
        padding: 6px 12px !important;
        gap: 10px !important;
        border-radius: 8px !important;
    }
    .view-mode-toggle label {
        font-size: 1.25rem !important;
        gap: 6px !important;
        font-weight: 700 !important;
    }
    .view-mode-toggle input[type="radio"] {
        width: 22px !important;
        height: 22px !important;
    }
    #btnAddImages {
        padding: 14px 22px !important;
        font-size: 1.3rem !important;
        border-radius: 10px !important;
    }

    .img-card { padding: 20px !important; gap: 16px !important; border-radius: 14px !important; }
    .img-thumb-mini { width: 75px !important; height: 75px !important; border-radius: 8px !important; }
    .img-card .img-name { font-size: 1.4rem !important; font-weight: 600 !important; }
    .btn-insert-tag { padding: 14px 22px !important; font-size: 1.3rem !important; border-radius: 8px !important; }
    .btn-del-img { font-size: 1.5rem !important; padding: 10px 14px !important; }

    .empty-placeholder {
        padding: 40px 20px !important;
        gap: 16px !important;
        font-size: 1.35rem !important;
        line-height: 1.6 !important;
    }
    .empty-placeholder i {
        font-size: 3.8rem !important;
    }

    .mobile-bottom-nav {
        display: flex !important;
        height: 110px !important;
    }
    .nav-tab { gap: 8px !important; font-size: 1.25rem !important; }
    .nav-tab i { font-size: 2.6rem !important; }
    .nav-badge { right: calc(50% - 32px) !important; font-size: 1.05rem !important; padding: 4px 10px !important; top: 10px !important; }

    .toast-msg {
        font-size: 1.35rem !important;
        padding: 18px 30px !important;
        border-radius: 12px !important;
    }
    .toast-time { font-size: 1.25rem !important; }

    /* 🔍 최종 출판 설정 모달 창 2배+ 초대형 확대 */
    .modal-card {
        width: 94vw !important;
        max-width: 94vw !important;
        max-height: 88vh !important;
        border-radius: 20px !important;
        overflow-y: auto !important;
    }
    .modal-header {
        padding: 20px 24px !important;
        font-size: 1.55rem !important;
    }
    .modal-header i { font-size: 1.6rem !important; }
    .btn-close-modal {
        font-size: 1.8rem !important;
        padding: 6px 12px !important;
    }
    .modal-body {
        padding: 24px 20px !important;
        gap: 20px !important;
    }
    .form-group {
        gap: 8px !important;
    }
    .form-group label {
        font-size: 1.35rem !important;
        font-weight: 700 !important;
    }
    .form-group input {
        padding: 16px 18px !important;
        font-size: 1.35rem !important;
        border-radius: 12px !important;
        border: 2px solid #cbd5e1 !important;
    }
    .form-group input:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2) !important;
    }
    
    .cover-select-box {
        padding: 20px !important;
        gap: 18px !important;
        border-radius: 14px !important;
        border-width: 2px !important;
    }
    .cover-preview {
        width: 85px !important;
        height: 115px !important;
        border-radius: 8px !important;
    }
    .cover-info {
        gap: 10px !important;
    }
    .cover-info span {
        font-size: 1.25rem !important;
    }
    #btnSelectCover {
        padding: 14px 22px !important;
        font-size: 1.25rem !important;
        border-radius: 10px !important;
    }

    #btnConfirmExport {
        padding: 22px !important;
        font-size: 1.55rem !important;
        font-weight: 800 !important;
        border-radius: 16px !important;
        margin-top: 14px !important;
        box-shadow: 0 6px 18px rgba(22, 163, 74, 0.25) !important;
    }

    .progress-card {
        width: 90vw !important;
        max-width: 90vw !important;
        padding: 30px 24px !important;
        gap: 20px !important;
        border-radius: 20px !important;
    }
    #progressText {
        font-size: 1.45rem !important;
    }
    .progress-bar-bg {
        height: 16px !important;
        border-radius: 8px !important;
    }
    .progress-status {
        font-size: 1.25rem !important;
    }
}


/* ==========================================================================
   📟 2. [탭의 세로 UI]
   ========================================================================== */
@media (orientation: portrait) and (min-aspect-ratio: 9/15.999) {
    body {
        padding-bottom: 56px;
    }
    .app-header {
        padding: 8px 14px;
        gap: 6px;
    }
    .app-title { font-size: 1.1rem; }
    
    .desktop-only-tools {
        display: none !important;
    }
    .toolbar-scroll-container {
        gap: 6px;
        padding-bottom: 2px;
    }
    .btn {
        padding: 7px 12px;
        font-size: 0.85rem;
        border-radius: 6px;
        font-weight: 600;
    }
    .btn span { font-size: 0.85rem; }
    .btn-export { padding: 7px 14px; font-size: 0.88rem; }

    .main-workspace {
        padding: 10px;
        height: calc(100vh - 95px - 56px);
        height: calc(100dvh - 95px - 56px);
    }
    .workspace-panel {
        display: none;
        width: 100%;
        height: 100%;
    }
    .workspace-panel.active {
        display: flex !important;
    }
    .editor-textarea {
        font-size: 1.02rem;
        line-height: 1.8;
        padding: 14px;
    }

    .toc-sub-toolbar {
        display: flex !important;
        justify-content: flex-start;
        padding: 8px 12px;
        background: #f8fafc;
        gap: 8px;
    }
    .toc-sub-toolbar .btn {
        padding: 6px 10px;
        font-size: 0.82rem;
        border-radius: 6px;
    }

    .toc-item {
        padding: 8px 10px;
        font-size: 0.86rem;
        border-radius: 6px;
    }
    .toc-line { font-size: 0.8rem; }

    .mobile-bottom-nav {
        display: flex !important;
        height: 56px;
    }
    .nav-tab { gap: 3px; font-size: 0.75rem; }
    .nav-tab i { font-size: 1.2rem; }
    .nav-badge { right: calc(50% - 18px); font-size: 0.68rem; }
}


/* ==========================================================================
   📟 3. [탭의 가로 UI]
   ========================================================================== */
@media (orientation: landscape) and (max-width: 1399px) {
    body {
        padding-bottom: 0;
    }
    .main-workspace {
        display: grid;
        grid-template-columns: 62% 38%;
        grid-template-rows: 1.1fr 0.9fr;
        gap: 10px;
        height: calc(100vh - 90px);
        height: calc(100dvh - 90px);
    }
    .panel-editor {
        grid-column: 1 / 2;
        grid-row: 1 / 3;
        display: flex !important;
    }
    .panel-toc {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        display: flex !important;
    }
    .panel-img {
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        display: flex !important;
    }
    .desktop-only-tools {
        display: flex !important;
    }
    .toc-sub-toolbar {
        display: none !important;
    }
    .mobile-bottom-nav {
        display: none !important;
    }
}


/* ==========================================================================
   💻 4. [PC의 가로 UI]
   ========================================================================== */
@media (orientation: landscape) and (min-width: 1400px) {
    body {
        padding-bottom: 0;
    }
    .main-workspace {
        display: flex;
        flex-direction: row;
        height: calc(100vh - 90px);
        height: calc(100dvh - 90px);
    }
    .panel-toc {
        width: 270px;
        flex-shrink: 0;
        display: flex !important;
    }
    .panel-editor {
        flex: 1;
        display: flex !important;
    }
    .panel-img {
        width: 290px;
        flex-shrink: 0;
        display: flex !important;
    }
    .desktop-only-tools {
        display: flex !important;
    }
    .toc-sub-toolbar {
        display: none !important;
    }
    .mobile-bottom-nav {
        display: none !important;
    }
}
''')

# 5. js/worker.js (Clean Indent 0)
with open('js/worker.js', 'w', encoding='utf-8') as f:
    f.write('''importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

self.addEventListener('message', async (e) => {
    const { type, payload } = e.data;
    try {
        if (type === 'ANALYZE_TOC') {
            handleAnalyzeToc(payload);
        } else if (type === 'BUILD_EPUB') {
            await handleBuildEpub(payload);
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', error: err.message || err.toString() });
    }
});

function handleAnalyzeToc(payload) {
    const { text, sample } = payload;
    if (!text || !sample) {
        self.postMessage({ type: 'ANALYZE_TOC_DONE', chapters: [] });
        return;
    }
    const escaped = sample.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const patternStr = escaped.replace(/\\d+/g, '\\\\d+');
    const regex = new RegExp(`^\\\\s*${patternStr}`, 'i');
    const lines = text.split(/\\r?\\n/);
    const totalLines = lines.length;
    const matchedChapters = [];
    const notifyInterval = Math.max(1000, Math.floor(totalLines / 20));
    for (let i = 0; i < totalLines; i++) {
        const line = lines[i].trim();
        if (regex.test(line)) {
            matchedChapters.push({ lineNum: i + 1, title: line });
        }
        if (i % notifyInterval === 0 || i === totalLines - 1) {
            self.postMessage({ type: 'PROGRESS', percent: Math.floor(((i + 1) / totalLines) * 100), text: `${i + 1} / ${totalLines} 줄 분석 완료` });
        }
    }
    matchedChapters.sort((a, b) => a.lineNum - b.lineNum);
    self.postMessage({ type: 'ANALYZE_TOC_DONE', chapters: matchedChapters });
}

async function handleBuildEpub(payload) {
    const { metadata, chapters, images } = payload;
    const zip = new JSZip();
    self.postMessage({ type: 'PROGRESS', percent: 10, text: 'EPUB 구조 초기화 중...' });
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
    zip.folder("META-INF").file("container.xml", containerXml);
    const oebps = zip.folder("OEBPS");
    const imagesFolder = oebps.folder("images");
    const manifestItems = [];
    const spineItems = [];
    const hasCover = !!(metadata.coverBuffer);
    let coverFileName = "cover.jpg";
    if (hasCover) {
        const coverExt = metadata.coverExt || 'jpg';
        const coverMime = metadata.coverMime || (coverExt === 'png' ? 'image/png' : 'image/jpeg');
        coverFileName = `cover.${coverExt}`;
        oebps.file(coverFileName, metadata.coverBuffer);
        manifestItems.push(`<item id="cover-image" href="${coverFileName}" media-type="${coverMime}" properties="cover-image"/>`);
        const coverXhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko"><head><title>표지</title><style>body { margin: 0; padding: 0; text-align: center; background-color: #ffffff; } img { max-width: 100%; max-height: 100vh; height: auto; object-fit: contain; }</style></head><body><div><img src="${coverFileName}" alt="표지 이미지"/></div></body></html>`;
        oebps.file("cover.xhtml", coverXhtml);
        manifestItems.push(`<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
        spineItems.push(`<itemref idref="cover-page"/>`);
    }
    if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const ext = img.name.split('.').pop().toLowerCase();
            let mime = img.mime || 'image/jpeg';
            if (ext === 'png') mime = 'image/png';
            else if (ext === 'gif') mime = 'image/gif';
            else if (ext === 'webp') mime = 'image/webp';
            else if (ext === 'svg') mime = 'image/svg+xml';
            imagesFolder.file(img.name, img.buffer);
            manifestItems.push(`<item id="img_${i + 1}" href="images/${escapeHtml(img.name)}" media-type="${mime}"/>`);
        }
    }
    
    const baseCss = `@charset "utf-8"; body { font-family: "KoPubWorldBatang", serif; line-height: 1.8; margin: 5%; } h2 { text-align: center; margin-bottom: 1.5em; } p { margin-bottom: 0.8em; text-indent: 0; } p img { max-width: 100%; display: block; margin: 1em auto; }`;
    oebps.file("style.css", baseCss);
    manifestItems.push(`<item id="style" href="style.css" media-type="text/css"/>`);
    
    const navMapNcx = [];
    const navListHtml = [];
    let playOrder = 1;
    for (let i = 0; i < chapters.length; i++) {
        const chap = chapters[i];
        const fileName = chap.isPrologue ? "chap_0000.xhtml" : `chap_${String(i).padStart(4, "0")}.xhtml`;
        const chapId = `chap_${chap.isPrologue ? "0000" : String(i).padStart(4, "0")}`;
        const chapTitle = chap.title || (chap.isPrologue ? "프롤로그" : `제 ${i} 장`);
        const chapHtmlContent = processTextToHtml(chap.content);
        const xhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ko"><head><meta charset="utf-8"/><title>${escapeHtml(chapTitle)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><h2>${escapeHtml(chapTitle)}</h2>${chapHtmlContent}</body></html>`;
        oebps.file(fileName, xhtml);
        manifestItems.push(`<item id="${chapId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
        spineItems.push(`<itemref idref="${chapId}"/>`);
        navMapNcx.push(`    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}"><navLabel><text>${escapeHtml(chapTitle)}</text></navLabel><content src="${fileName}"/></navPoint>`);
        navListHtml.push(`      <li><a href="${fileName}">${escapeHtml(chapTitle)}</a></li>`);
        playOrder++;
    }
    const navXhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko"><head><title>목차</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><nav epub:type="toc" id="toc"><h2>목차</h2><ol>${navListHtml.join("\\n")}</ol></nav></body></html>`;
    oebps.file("nav.xhtml", navXhtml);
    manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);
    const bookUuid = "urn:uuid:" + Math.random().toString(36).substring(2);
    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/\" version="2005-1"><head><meta name="dtb:uid" content="${bookUuid}"/></head><docTitle><text>${escapeHtml(metadata.title || "제목 없음")}</text></docTitle><docAuthor><text>${escapeHtml(metadata.author || "작자 미상")}</text></docAuthor><navMap>${navMapNcx.join("\\n")}</navMap></ncx>`;
    oebps.file("toc.ncx", tocNcx);
    manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);
    const dateStr = metadata.date || new Date().toISOString().split('T')[0];
    const contentOpf = `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" xml:lang="ko"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:identifier id="BookId">${bookUuid}</dc:identifier><dc:title>${escapeHtml(metadata.title || "제목 없음")}</dc:title><dc:language>ko</dc:language><dc:creator id="creator">${escapeHtml(metadata.author || "작자 미상")}</dc:creator><dc:publisher>${escapeHtml(metadata.publisher || "")}</dc:publisher><dc:date>${dateStr}</dc:date><meta property="dcterms:modified">${new Date().toISOString().replace(/\\.\\d+Z$/, 'Z')}</meta>${hasCover ? '<meta name="cover" content="cover-image"/>' : ''}</metadata><manifest>${manifestItems.join("\\n")}</manifest><spine toc="ncx">${spineItems.join("\\n")}</spine></package>`;
    oebps.file("content.opf", contentOpf);
    self.postMessage({ type: 'PROGRESS', percent: 85, text: '백그라운드 EPUB 압축 중...' });
    const epubArrayBuffer = await zip.generateAsync({ type: "arraybuffer", mimeType: "application/epub+zip", compression: "DEFLATE", compressionOptions: { level: 6 } }, (meta) => {
        self.postMessage({ type: 'PROGRESS', percent: 85 + Math.floor(meta.percent * 0.15), text: `압축 중... (${Math.floor(meta.percent)}%)` });
    });
    self.postMessage({ type: 'BUILD_EPUB_DONE', buffer: epubArrayBuffer }, [epubArrayBuffer]);
}

function escapeHtml(text) { if (!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
function processTextToHtml(rawText) {
    if (!rawText) return "";
    const lines = rawText.split(/\\r?\\n/);
    const output = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("[IMAGE:") && trimmed.endsWith("]")) {
            const imgName = trimmed.substring(7, trimmed.length - 1).trim();
            output.push(`<p style="text-align:center;"><img src="images/${escapeHtml(imgName)}" style="max-width:100%; height:auto;" /></p>`);
        } else if (trimmed.length > 0) {
            output.push(`<p>${escapeHtml(line)}</p>`);
        }
    }
    return output.join("\\n");
}''')

# 6. js/epub_generator.js
with open('js/epub_generator.js', 'w', encoding='utf-8') as f:
    f.write('''class EpubGenerator {
    constructor() {
        this.mimeType = "application/epub+zip";
        this.worker = null;
        this.initWorker();
    }
    initWorker() {
        try {
            if (window.Worker) {
                this.worker = new Worker('js/worker.js');
            }
        } catch (e) {
            this.worker = null;
        }
    }
    async buildEpub(metadata, chapters, images, onProgress = () => {}) {
        if (this.worker) {
            return new Promise((resolve, reject) => {
                const onMessage = (e) => {
                    const { type, percent, text, buffer, error } = e.data;
                    if (type === 'PROGRESS') {
                        onProgress(percent, text);
                    } else if (type === 'BUILD_EPUB_DONE') {
                        this.worker.removeEventListener('message', onMessage);
                        resolve(new Blob([buffer], { type: 'application/epub+zip' }));
                    } else if (type === 'ERROR') {
                        this.worker.removeEventListener('message', onMessage);
                        reject(new Error(error));
                    }
                };
                this.worker.addEventListener('message', onMessage);
                this.worker.postMessage({
                    type: 'BUILD_EPUB',
                    payload: { metadata, chapters, images }
                });
            });
        }
    }
}
window.EpubGenerator = new EpubGenerator();''')

# 7. js/app.js
with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write('''class EpubApp {
    constructor() {
        this.fullText = "";
        this.totalLines = 0;
        this.lines = [];
        this.currentViewStart = 0;
        this.currentViewEnd = 0;
        this.VIEWPORT_SIZE = 2500;

        this.chapters = [];
        this.images = [];
        this.metaData = {
            title: "",
            author: "",
            publisher: "",
            date: new Date().toISOString().split('T')[0],
            coverBuffer: null,
            coverMime: "image/jpeg",
            coverExt: "jpg",
            coverName: "",
            coverDataUrl: ""
        };

        this.viewMode = "detail";
        this.worker = null;
        this.initWorker();
        this.initDOMElements();
        this.bindEvents();
        this.initMobileTabs();
        this.updateTocCount();
        this.refreshTocList();
        this.refreshImageView();
        this.updateUIModeBadge();
    }

    initWorker() {
        try {
            if (window.Worker) {
                this.worker = new Worker('js/worker.js');
                this.worker.onerror = (e) => console.warn('[App] Worker error:', e);
            }
        } catch (e) {
            this.worker = null;
        }
    }

    initDOMElements() {
        this.textArea = document.getElementById("textArea");
        this.fileInput = document.getElementById("fileInput");
        this.imageInput = document.getElementById("imageInput");
        this.coverInput = document.getElementById("coverInput");
        this.editorStats = document.getElementById("editorStats");
        this.uiModeBadge = document.getElementById("uiModeBadge");

        this.tocList = document.getElementById("tocList");
        this.tocCountBadge = document.getElementById("tocCountBadge");
        this.mobileTocBadge = document.getElementById("mobileTocBadge");

        this.imgContainer = document.getElementById("imgContainer");
        this.imgCountBadge = document.getElementById("imgCountBadge");
        this.mobileImgBadge = document.getElementById("mobileImgBadge");

        this.btnLoadFile = document.getElementById("btnLoadFile");
        this.btnLearnPattern = document.getElementById("btnLearnPattern");
        this.btnAddManualToc = document.getElementById("btnAddManualToc");
        
        this.btnUpdateToc = document.getElementById("btnUpdateToc");
        this.btnRemoveToc = document.getElementById("btnRemoveToc");
        this.btnClearAllToc = document.getElementById("btnClearAllToc");

        this.btnUpdateTocSub = document.getElementById("btnUpdateTocSub");
        this.btnRemoveTocSub = document.getElementById("btnRemoveTocSub");
        this.btnClearAllTocSub = document.getElementById("btnClearAllTocSub");

        this.btnOpenPublishModal = document.getElementById("btnOpenPublishModal");

        this.publishModal = document.getElementById("publishModal");
        this.progressModal = document.getElementById("progressModal");
        this.progressBar = document.getElementById("progressBar");
        this.progressText = document.getElementById("progressText");
        this.progressPercent = document.getElementById("progressPercent");

        this.inputTitle = document.getElementById("inputTitle");
        this.inputAuthor = document.getElementById("inputAuthor");
        this.inputPublisher = document.getElementById("inputPublisher");
        this.inputDate = document.getElementById("inputDate");
        this.coverPreviewName = document.getElementById("coverPreviewName");
        this.coverPreviewImg = document.getElementById("coverPreviewImg");

        if (this.inputDate) this.inputDate.value = this.metaData.date;
    }

    bindEvents() {
        this.btnLoadFile.addEventListener("click", () => this.fileInput.click());
        this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));

        this.btnLearnPattern.addEventListener("click", () => this.learnPattern());
        this.btnAddManualToc.addEventListener("click", () => this.addManualToc());

        if (this.btnUpdateToc) this.btnUpdateToc.addEventListener("click", () => this.updateTocPositions());
        if (this.btnRemoveToc) this.btnRemoveToc.addEventListener("click", () => this.removeSelectedToc());
        if (this.btnClearAllToc) this.btnClearAllToc.addEventListener("click", () => this.clearAllToc());

        if (this.btnUpdateTocSub) this.btnUpdateTocSub.addEventListener("click", () => this.updateTocPositions());
        if (this.btnRemoveTocSub) this.btnRemoveTocSub.addEventListener("click", () => this.removeSelectedToc());
        if (this.btnClearAllTocSub) this.btnClearAllTocSub.addEventListener("click", () => this.clearAllToc());

        this.btnOpenPublishModal.addEventListener("click", () => this.openSetupWindow());
        document.getElementById("btnConfirmExport").addEventListener("click", () => this.exportEpub());
        document.getElementById("btnClosePublishModal").addEventListener("click", () => this.closePublishModal());

        document.getElementById("btnAddImages").addEventListener("click", () => this.imageInput.click());
        this.imageInput.addEventListener("change", (e) => this.handleAddImages(e));
        document.getElementById("btnSelectCover").addEventListener("click", () => this.coverInput.click());
        this.coverInput.addEventListener("change", (e) => this.handleCoverSelect(e));

        document.querySelectorAll("input[name='imageViewMode']").forEach(radio => {
            radio.addEventListener("change", (e) => {
                this.viewMode = e.target.value;
                this.refreshImageView();
            });
        });

        this.setupEditorDrop();

        window.addEventListener("resize", () => this.updateUIModeBadge());
        window.addEventListener("orientationchange", () => this.updateUIModeBadge());

        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                this.openSetupWindow();
            }
        });
    }

    updateUIModeBadge() {
        if (!this.uiModeBadge) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isPortrait = (h >= w);
        const aspect = (w / h);

        let modeText = "";

        if (isPortrait) {
            if (aspect <= (9 / 16)) {
                modeText = "[폰의 세로 UI]";
            } else {
                modeText = "[탭의 세로 UI]";
            }
        } else {
            if (w >= 1400) {
                modeText = "[PC의 가로 UI]";
            } else {
                modeText = "[탭의 가로 UI]";
            }
        }

        this.uiModeBadge.textContent = modeText;
    }

    initMobileTabs() {
        const tabs = document.querySelectorAll(".nav-tab");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const targetId = tab.dataset.target;
                this.switchMobileTab(targetId);
            });
        });
    }

    switchMobileTab(targetPanelId) {
        document.querySelectorAll(".workspace-panel").forEach(p => p.classList.remove("active"));
        document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));

        const targetPanel = document.getElementById(targetPanelId);
        if (targetPanel) targetPanel.classList.add("active");

        const activeTab = document.querySelector(`.nav-tab[data-target="${targetPanelId}"]`);
        if (activeTab) activeTab.classList.add("active");
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        this.showProgress(`파일 읽는 중... (${fileSizeMB} MB)`, 100);
        this.updateProgress(20, "초고속 인코딩 분석 중...");

        try {
            await new Promise(r => setTimeout(r, 20));
            const buffer = await file.arrayBuffer();
            this.updateProgress(50, "텍스트 파싱 중...");
            const decoded = this.detectAndDecodeText(buffer);

            this.fullText = decoded.text;
            this.lines = this.fullText.split(/\\r?\\n/);
            this.totalLines = this.lines.length;

            this.clearAllToc();
            
            const defaultTitle = file.name.replace(/\\.[^/.]+$/, "");
            this.metaData.title = defaultTitle;
            if (this.inputTitle) this.inputTitle.value = defaultTitle;

            this.renderViewport(0, Math.min(this.VIEWPORT_SIZE, this.totalLines));
            this.switchMobileTab("panelEditor");

            this.hideProgress();
            this.autoMsg(`파일 로드 완료 (${decoded.encoding.toUpperCase()} / ${fileSizeMB} MB / 총 ${this.totalLines.toLocaleString()}줄)`);
        } catch (err) {
            this.hideProgress();
            console.error(err);
            alert(`파일을 읽는 중 오류가 발생했습니다: ${err.message}`);
        } finally {
            this.fileInput.value = "";
        }
    }

    renderViewport(startLine, endLine, focusLocalLine = 0) {
        this.currentViewStart = Math.max(0, startLine);
        this.currentViewEnd = Math.min(this.totalLines, endLine);

        const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
        this.textArea.value = viewportLines.join("\\n");

        if (this.editorStats) {
            this.editorStats.innerHTML = `총 <b>${this.totalLines.toLocaleString()}</b>줄 중 <b>${(this.currentViewStart + 1).toLocaleString()} ~ ${this.currentViewEnd.toLocaleString()}</b>줄 표시 중`;
        }

        if (focusLocalLine > 0) {
            let charPos = 0;
            for (let i = 0; i < Math.min(focusLocalLine, viewportLines.length); i++) {
                charPos += viewportLines[i].length + 1;
            }
            this.textArea.focus();
            this.textArea.setSelectionRange(charPos, charPos);
            this.textArea.scrollTop = Math.max(0, (focusLocalLine - 5) * 24);
        } else {
            this.textArea.scrollTop = 0;
        }
    }

    detectAndDecodeText(buffer) {
        const uint8 = new Uint8Array(buffer);
        if (uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) {
            return { text: new TextDecoder('utf-8').decode(uint8.subarray(3)), encoding: 'utf-8 (BOM)' };
        }
        if (uint8.length >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) {
            return { text: new TextDecoder('utf-16le').decode(uint8.subarray(2)), encoding: 'utf-16le' };
        }
        if (uint8.length >= 2 && uint8[0] === 0xFE && uint8[1] === 0xFF) {
            return { text: new TextDecoder('utf-16be').decode(uint8.subarray(2)), encoding: 'utf-16be' };
        }
        try {
            return { text: new TextDecoder('utf-8', { fatal: true }).decode(uint8), encoding: 'utf-8' };
        } catch (e) {
            try {
                return { text: new TextDecoder('euc-kr').decode(uint8), encoding: 'cp949 / euc-kr' };
            } catch (err2) {
                return { text: new TextDecoder('utf-8').decode(uint8), encoding: 'utf-8' };
            }
        }
    }

    async learnPattern() {
        const textInEditor = this.textArea.value;
        if (!this.fullText && !textInEditor) {
            alert("본문 내용이 비어있습니다. 먼저 파일을 불러와주세요.");
            return;
        }

        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        let sample = textInEditor.substring(selStart, selEnd).trim();

        if (!sample) {
            alert("목차 패턴으로 사용할 텍스트를 본문에서 드래그하여 선택해주세요.\\n(예: '제1장 프롤로그' 또는 '1화', 'Chapter 01')");
            return;
        }

        this.showProgress("전체 목차 분석 중...", 100);
        const targetText = this.fullText || textInEditor;

        if (this.worker) {
            const onMessage = (e) => {
                const { type, percent, text: msgText, chapters, error } = e.data;
                if (type === 'PROGRESS') {
                    this.updateProgress(percent, msgText);
                } else if (type === 'ANALYZE_TOC_DONE') {
                    this.worker.removeEventListener('message', onMessage);
                    this.hideProgress();
                    this.chapters = chapters;
                    this.refreshTocList();
                    this.autoMsg(`${this.chapters.length}개의 목차가 전체 본문에서 자동 생성되었습니다.`);
                } else if (type === 'ERROR') {
                    this.worker.removeEventListener('message', onMessage);
                    this.hideProgress();
                    alert(`목차 분석 중 오류: ${error}`);
                }
            };
            this.worker.addEventListener('message', onMessage);
            this.worker.postMessage({ type: 'ANALYZE_TOC', payload: { text: targetText, sample } });
        }
    }

    addManualToc() {
        const textInEditor = this.textArea.value;
        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        const title = textInEditor.substring(selStart, selEnd).trim();

        if (!title) {
            alert("목차로 등록할 텍스트를 본문에서 드래그하여 선택하세요.");
            return;
        }

        const textBefore = textInEditor.substring(0, selStart);
        const localLine = (textBefore.match(/\\n/g) || []).length;
        const globalLineNum = this.currentViewStart + localLine + 1;

        this.chapters.push({ lineNum: globalLineNum, title });
        this.chapters.sort((a, b) => a.lineNum - b.lineNum);
        this.refreshTocList();
        this.autoMsg(`목차 '${title}' (Line ${globalLineNum}) 추가 완료`);
    }

    goToChapterLine(targetLine, title) {
        const targetIndex = targetLine - 1;

        if (targetIndex < this.currentViewStart || targetIndex >= this.currentViewEnd) {
            const newStart = Math.max(0, targetIndex - 200);
            const newEnd = Math.min(this.totalLines, newStart + this.VIEWPORT_SIZE);
            const localLine = targetIndex - newStart;
            this.renderViewport(newStart, newEnd, localLine);
        } else {
            const localLine = targetIndex - this.currentViewStart;
            const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
            let charPos = 0;
            for (let i = 0; i < Math.min(localLine, viewportLines.length); i++) {
                charPos += viewportLines[i].length + 1;
            }
            this.textArea.focus();
            this.textArea.setSelectionRange(charPos, charPos + (title ? title.length : 0));
            this.textArea.scrollTop = Math.max(0, (localLine - 5) * 24);
        }

        if (window.innerHeight >= window.innerWidth) {
            this.switchMobileTab("panelEditor");
        }
    }

    updateTocPositions() {
        if (!this.chapters || this.chapters.length === 0) {
            this.autoMsg("등록된 목차가 없습니다.");
            return;
        }

        const newChapters = [];
        for (const ch of this.chapters) {
            const title = ch.title;
            let foundLine = -1;

            for (let i = 0; i < this.lines.length; i++) {
                if (this.lines[i].trim() === title || this.lines[i].includes(title)) {
                    foundLine = i + 1;
                    break;
                }
            }
            if (foundLine !== -1) {
                newChapters.push({ lineNum: foundLine, title });
            }
        }
        this.chapters = newChapters.sort((a, b) => a.lineNum - b.lineNum);
        this.refreshTocList();
        this.autoMsg("전체 본문에 맞춰 목차 목록이 동기화되었습니다.");
    }

    removeSelectedToc() {
        const selectedOption = this.tocList.querySelector(".toc-item.active");
        if (!selectedOption) {
            alert("삭제할 목차 항목을 목록에서 선택하세요.");
            return;
        }

        const idx = parseInt(selectedOption.dataset.index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < this.chapters.length) {
            const removed = this.chapters.splice(idx, 1);
            this.refreshTocList();
            this.autoMsg(`목차 '${removed[0]?.title}' 삭제 완료`);
        }
    }

    clearAllToc() {
        this.chapters = [];
        this.refreshTocList();
        this.autoMsg("목차가 전체 삭제되었습니다.");
    }

    refreshTocList() {
        this.tocList.innerHTML = "";
        this.updateTocCount();

        if (this.chapters.length === 0) {
            this.tocList.innerHTML = `
                <div class="empty-placeholder">
                    <i class="fa-solid fa-list-ol"></i>
                    <p>등록된 목차가 없습니다.<br>본문에서 텍스트를 선택 후<br>'목차 형식 분석' 또는 '선택영역 추가'를 클릭하세요.</p>
                </div>
            `;
            return;
        }

        this.chapters.forEach((ch, idx) => {
            const item = document.createElement("div");
            item.className = "toc-item";
            item.dataset.index = idx;
            item.dataset.line = ch.lineNum;

            item.innerHTML = `
                <span class="toc-line">[L.${ch.lineNum}]</span>
                <span class="toc-title" title="${this.escapeHtml(ch.title)}">${this.escapeHtml(ch.title)}</span>
                <button class="btn-del-toc" title="이 목차만 삭제"><i class="fa-solid fa-times"></i></button>
            `;

            item.addEventListener("click", (e) => {
                if (e.target.closest(".btn-del-toc")) {
                    this.chapters.splice(idx, 1);
                    this.refreshTocList();
                    return;
                }
                this.tocList.querySelectorAll(".toc-item").forEach(el => el.classList.remove("active"));
                item.classList.add("active");
                this.goToChapterLine(ch.lineNum, ch.title);
            });

            item.addEventListener("dblclick", () => {
                this.goToChapterLine(ch.lineNum, ch.title);
            });

            this.tocList.appendChild(item);
        });
    }

    updateTocCount() {
        const countText = `${this.chapters.length}개`;
        if (this.tocCountBadge) this.tocCountBadge.textContent = countText;
        if (this.mobileTocBadge) this.mobileTocBadge.textContent = this.chapters.length;
    }

    async handleAddImages(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        for (const file of files) {
            if (this.images.some(img => img.name === file.name)) continue;

            try {
                const buffer = await file.arrayBuffer();
                const dataUrl = URL.createObjectURL(file);
                
                let cleanName = file.name || `image_${Date.now()}.jpg`;
                if (!cleanName.includes('.')) {
                    cleanName += file.type === 'image/png' ? '.png' : '.jpg';
                }

                this.images.push({
                    id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    name: cleanName,
                    buffer: buffer,
                    mime: file.type || 'image/jpeg',
                    dataUrl: dataUrl
                });
            } catch (err) {
                console.error("이미지 읽기 오류:", err);
            }
        }
        this.refreshImageView();
        this.autoMsg(`${files.length}개의 삽화가 추가되었습니다.`);
        this.imageInput.value = "";
    }

    refreshImageView() {
        this.imgContainer.innerHTML = "";
        const countText = `${this.images.length}개`;
        if (this.imgCountBadge) this.imgCountBadge.textContent = countText;
        if (this.mobileImgBadge) this.mobileImgBadge.textContent = this.images.length;

        if (this.images.length === 0) {
            this.imgContainer.innerHTML = `
                <div class="empty-placeholder">
                    <i class="fa-regular fa-image"></i>
                    <p>등록된 삽화가 없습니다.<br>'추가' 버튼을 눌러 이미지를 등록하세요.</p>
                </div>
            `;
            return;
        }

        this.imgContainer.className = `img-gallery ${this.viewMode}-view`;

        this.images.forEach((img, idx) => {
            const card = document.createElement("div");
            card.className = "img-card";
            card.draggable = true;
            card.dataset.imgName = img.name;

            if (this.viewMode === "detail") {
                card.innerHTML = `
                    <div class="img-thumb-mini" style="background-image: url('${img.dataUrl}')"></div>
                    <span class="img-name" title="${this.escapeHtml(img.name)}">${this.escapeHtml(img.name)}</span>
                    <button class="btn-insert-tag" title="본문 커서 위치에 태그 삽입"><i class="fa-solid fa-plus"></i></button>
                    <button class="btn-del-img" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
                `;
            } else {
                card.innerHTML = `
                    <div class="img-thumb-large">
                        <img src="${img.dataUrl}" alt="${this.escapeHtml(img.name)}" loading="lazy" />
                    </div>
                    <div class="img-meta">
                        <span class="img-name" title="${this.escapeHtml(img.name)}">${this.escapeHtml(img.name)}</span>
                        <div class="img-actions">
                            <button class="btn-insert-tag btn-sm"><i class="fa-solid fa-plus"></i> 본문 삽입</button>
                            <button class="btn-del-img btn-sm"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                `;
            }

            card.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", `\\n[IMAGE:${img.name}]\\n`);
                card.classList.add("dragging");
            });
            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
            });

            card.querySelector(".btn-insert-tag").addEventListener("click", () => {
                this.insertImageTagAtCursor(img.name);
            });

            card.querySelector(".btn-del-img").addEventListener("click", () => {
                this.images.splice(idx, 1);
                this.refreshImageView();
            });

            this.imgContainer.appendChild(card);
        });
    }

    insertImageTagAtCursor(imageName) {
        const text = this.textArea.value;
        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        const tag = `\\n[IMAGE:${imageName}]\\n`;

        this.textArea.value = text.substring(0, selStart) + tag + text.substring(selEnd);
        this.textArea.focus();
        this.textArea.setSelectionRange(selStart + tag.length, selStart + tag.length);
        this.autoMsg(`삽화 태그 [IMAGE:${imageName}] 삽입 완료`);

        if (window.innerHeight >= window.innerWidth) {
            this.switchMobileTab("panelEditor");
        }
    }

    setupEditorDrop() {
        this.textArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            this.textArea.classList.add("drag-over");
        });
        this.textArea.addEventListener("dragleave", () => {
            this.textArea.classList.remove("drag-over");
        });
        this.textArea.addEventListener("drop", (e) => {
            e.preventDefault();
            this.textArea.classList.remove("drag-over");
            const data = e.dataTransfer.getData("text/plain");
            if (data && data.includes("[IMAGE:")) {
                const insertPos = this.textArea.selectionStart;
                const text = this.textArea.value;
                this.textArea.value = text.substring(0, insertPos) + data + text.substring(insertPos);
                this.autoMsg("삽화 태그가 본문에 삽입되었습니다.");
            }
        });
    }

    openSetupWindow() {
        if (!this.chapters || this.chapters.length === 0) {
            alert("등록된 목차가 없습니다.\\n'목차 형식 분석' 또는 '선택영역 목차 추가'로 목차를 먼저 생성해주세요.");
            return;
        }

        if (this.inputTitle && !this.inputTitle.value) {
            this.inputTitle.value = this.metaData.title || "전자책";
        }
        if (this.inputAuthor) this.inputAuthor.value = this.metaData.author;
        if (this.inputPublisher) this.inputPublisher.value = this.metaData.publisher;
        if (this.inputDate) this.inputDate.value = this.metaData.date;

        this.publishModal.classList.add("active");
    }

    closePublishModal() {
        this.publishModal.classList.remove("active");
    }

    async handleCoverSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const dataUrl = URL.createObjectURL(file);

            const mime = file.type || 'image/jpeg';
            const ext = mime === 'image/png' ? 'png' : 'jpg';

            this.metaData.coverBuffer = buffer;
            this.metaData.coverMime = mime;
            this.metaData.coverExt = ext;
            this.metaData.coverName = file.name || `cover.${ext}`;
            this.metaData.coverDataUrl = dataUrl;

            if (this.coverPreviewName) this.coverPreviewName.textContent = this.metaData.coverName;
            if (this.coverPreviewImg) {
                this.coverPreviewImg.src = dataUrl;
                this.coverPreviewImg.style.display = "block";
            }
            this.autoMsg("표지 이미지가 등록되었습니다.");
        } catch (err) {
            console.error("표지 읽기 오류:", err);
            alert("표지 이미지를 불러오는 데 실패했습니다: " + (err.message || err));
        } finally {
            this.coverInput.value = "";
        }
    }

    async exportEpub() {
        this.metaData.title = this.inputTitle.value.trim() || "제목 없음";
        this.metaData.author = this.inputAuthor.value.trim() || "작자 미상";
        this.metaData.publisher = this.inputPublisher.value.trim();
        this.metaData.date = this.inputDate.value.trim() || new Date().toISOString().split('T')[0];

        const allLines = this.lines.length > 0 ? this.lines : this.textArea.value.split(/\\r?\\n/);
        const totalLinesCount = allLines.length;

        const epubChapters = [];

        const firstChapLine = this.chapters[0].lineNum;
        if (firstChapLine > 1) {
            const prologueLines = allLines.slice(0, firstChapLine - 1);
            const prologueText = prologueLines.join("\\n").trim();
            if (prologueText.length > 0) {
                epubChapters.push({
                    title: "프롤로그",
                    content: prologueText,
                    isPrologue: true
                });
            }
        }

        for (let i = 0; i < this.chapters.length; i++) {
            const ch = this.chapters[i];
            const startLine = ch.lineNum - 1;
            const nextStartLine = (i + 1 < this.chapters.length) ? (this.chapters[i + 1].lineNum - 1) : totalLinesCount;
            
            const chapLines = allLines.slice(startLine, nextStartLine);
            let rawContent = chapLines.join("\\n").trim();

            const splitLines = rawContent.split(/\\r?\\n/);
            if (splitLines.length > 0 && splitLines[0].trim() === ch.title.trim()) {
                rawContent = splitLines.slice(1).join("\\n").trim();
            }

            epubChapters.push({
                title: ch.title,
                content: rawContent,
                isPrologue: false
            });
        }

        this.closePublishModal();
        this.showProgress("전자책(EPUB) 전체 백그라운드 생성 중...", 100);

        try {
            const epubBlob = await window.EpubGenerator.buildEpub(
                this.metaData,
                epubChapters,
                this.images,
                (percent, text) => this.updateProgress(percent, text)
            );

            const fileName = `${this.metaData.title || 'ebook'}.epub`;
            this.downloadBlob(epubBlob, fileName);

            setTimeout(() => {
                this.hideProgress();
                this.autoMsg("전자책 생성이 완료되었습니다! (들여쓰기 없는 깔끔한 정렬)", 3);
            }, 500);

        } catch (err) {
            this.hideProgress();
            console.error("EPUB 생성 오류:", err);
            alert(`전자책 생성 중 오류: ${err.message || err}`);
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    autoMsg(message, seconds = 3) {
        const toast = document.getElementById("toastMsg");
        const toastContent = document.getElementById("toastContent");
        const toastTime = document.getElementById("toastTime");

        toastContent.textContent = message;
        toast.classList.add("show");

        let remaining = seconds;
        toastTime.textContent = `(${remaining}s)`;

        if (this.toastInterval) clearInterval(this.toastInterval);

        this.toastInterval = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this.toastInterval);
                toast.classList.remove("show");
            } else {
                toastTime.textContent = `(${remaining}s)`;
            }
        }, 1000);
    }

    showProgress(title, max) {
        this.progressText.textContent = title;
        this.progressBar.style.width = "0%";
        this.progressPercent.textContent = "0%";
        this.progressModal.classList.add("active");
    }

    updateProgress(percent, text) {
        this.progressBar.style.width = `${percent}%`;
        this.progressPercent.textContent = `${percent}%`;
        if (text) this.progressText.textContent = text;
    }

    hideProgress() {
        this.progressModal.classList.remove("active");
    }

    escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.app = new EpubApp();
});
''')

# 8. sw.js
with open('sw.js', 'w', encoding='utf-8') as f:
    f.write('''const CACHE_NAME = 'epub-studio-v2.1.7';
const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/epub_generator.js',
    './js/worker.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null))).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then((cached) => {
            if (cached) {
                fetch(e.request).then((res) => {
                    if (res && res.status === 200) {
                        caches.open(CACHE_NAME).then((c) => c.put(e.request, res.clone()));
                    }
                }).catch(() => {});
                return cached;
            }
            return fetch(e.request).then((res) => {
                if (!res || res.status !== 200 || res.type !== 'basic') return res;
                const clone = res.clone();
                caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
                return res;
            });
        }).catch(() => caches.match('./index.html'))
    );
});
''')

# 9. app.py, bat, README
with open('app.py', 'w', encoding='utf-8') as f:
    f.write('''import http.server, socketserver, webbrowser, os, sys
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
def run():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        url = f'http://localhost:{PORT}'
        print(f'Server running at {url}')
        webbrowser.open(url)
        try: httpd.serve_forever()
        except KeyboardInterrupt: sys.exit(0)
if __name__ == '__main__': run()''')

with open('실행하기.bat', 'w', encoding='utf-8') as f:
    f.write('''@echo off\nchcp 65001 > nul\npython app.py\npause''')

with open('README.md', 'w', encoding='utf-8') as f:
    f.write('''# EPUB 전자책 제작 스튜디오 v2.1.7 (Grand Modal Touch)''')

print('v2.1.7 Grand Modal Touch Build Complete!')
