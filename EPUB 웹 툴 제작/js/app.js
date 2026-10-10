class EpubApp {
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
        this.tocConfig = this.loadTocConfig();
        this.worker = null;
        this.initWorker();
        this.initDOMElements();
        this.bindEvents();
        this.initMobileTabs();
        this.updateTocCount();
        this.refreshTocList();
        this.refreshImageView();
        this.updateUIModeBadge();
        this.updateTocConfigBadge();
    }

    initWorker() {
        try {
            if (window.Worker) {
                this.worker = new Worker('js/worker.js?v=2.4.0');
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

        // In-Editor Search elements
        this.btnOpenSearch = document.getElementById("btnOpenSearch");
        this.editorSearchBar = document.getElementById("editorSearchBar");
        this.searchInput = document.getElementById("searchInput");
        this.searchMatchCount = document.getElementById("searchMatchCount");
        this.btnExecuteSearch = document.getElementById("btnExecuteSearch");
        this.btnSearchPrev = document.getElementById("btnSearchPrev");
        this.btnSearchNext = document.getElementById("btnSearchNext");
        this.btnSearchClose = document.getElementById("btnSearchClose");

        this.searchMatches = [];
        this.currentSearchIndex = -1;
        this.currentSearchQuery = "";

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

        // TOC Config Modal Elements
        this.btnOpenTocConfig = document.getElementById("btnOpenTocConfig");
        this.tocConfigModal = document.getElementById("tocConfigModal");
        this.btnCloseTocConfigModal = document.getElementById("btnCloseTocConfigModal");
        this.btnSaveTocConfig = document.getElementById("btnSaveTocConfig");
        this.btnResetTocConfig = document.getElementById("btnResetTocConfig");
        this.cfgAppendMode = document.getElementById("cfgAppendMode");
        this.cfgMaxLength = document.getElementById("cfgMaxLength");
        this.btnSpinDown = document.getElementById("btnSpinDown");
        this.btnSpinUp = document.getElementById("btnSpinUp");
        this.cfgFullLineOnly = document.getElementById("cfgFullLineOnly");
        this.cfgRequireDelimiter = document.getElementById("cfgRequireDelimiter");
        this.cfgAllowPrefix = document.getElementById("cfgAllowPrefix");

        if (this.inputDate) this.inputDate.value = this.metaData.date;
    }

    bindEvents() {
        this.btnLoadFile.addEventListener("click", () => {
            this.fileInput.value = "";
            this.fileInput.click();
        });
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

        this.inputDebounceTimer = null;
        this.textArea.addEventListener("input", () => {
            if (this.inputDebounceTimer) clearTimeout(this.inputDebounceTimer);
            this.inputDebounceTimer = setTimeout(() => {
                this.syncViewportToLines();
            }, 300);
        });
        this.textArea.addEventListener("blur", () => {
            if (this.inputDebounceTimer) clearTimeout(this.inputDebounceTimer);
            this.syncViewportToLines();
        });

        window.addEventListener("resize", () => this.updateUIModeBadge());
        window.addEventListener("orientationchange", () => this.updateUIModeBadge());

        // In-Editor Search Events
        if (this.btnOpenSearch) {
            this.btnOpenSearch.addEventListener("click", () => this.toggleSearchBar());
        }
        if (this.btnSearchClose) {
            this.btnSearchClose.addEventListener("click", () => this.closeSearchBar());
        }
        if (this.btnExecuteSearch) {
            this.btnExecuteSearch.addEventListener("click", () => this.executeSearch());
        }
        if (this.btnSearchNext) {
            this.btnSearchNext.addEventListener("click", () => {
                const query = this.searchInput.value.trim();
                if (query && (query !== this.currentSearchQuery || this.searchMatches.length === 0)) {
                    this.executeSearch();
                } else {
                    this.goToNextSearchMatch();
                }
            });
        }
        if (this.btnSearchPrev) {
            this.btnSearchPrev.addEventListener("click", () => {
                const query = this.searchInput.value.trim();
                if (query && (query !== this.currentSearchQuery || this.searchMatches.length === 0)) {
                    this.executeSearch();
                } else {
                    this.goToPrevSearchMatch();
                }
            });
        }
        if (this.searchInput) {
            this.searchInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const query = this.searchInput.value.trim();
                    if (!query) return;
                    if (query !== this.currentSearchQuery || this.searchMatches.length === 0) {
                        this.executeSearch();
                    } else {
                        if (e.shiftKey) {
                            this.goToPrevSearchMatch();
                        } else {
                            this.goToNextSearchMatch();
                        }
                    }
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    this.closeSearchBar();
                }
            });
        }

        // TOC Config Modal Events
        if (this.btnOpenTocConfig) {
            this.btnOpenTocConfig.addEventListener("click", () => this.openTocConfigModal());
        }
        if (this.btnCloseTocConfigModal) {
            this.btnCloseTocConfigModal.addEventListener("click", () => this.closeTocConfigModal());
        }
        if (this.tocConfigModal) {
            this.tocConfigModal.addEventListener("click", (e) => {
                if (e.target === this.tocConfigModal) this.closeTocConfigModal();
            });
        }
        if (this.btnSaveTocConfig) {
            this.btnSaveTocConfig.addEventListener("click", () => this.saveTocConfigFromModal());
        }
        if (this.btnResetTocConfig) {
            this.btnResetTocConfig.addEventListener("click", () => this.resetTocConfig());
        }
        if (this.btnSpinDown && this.cfgMaxLength) {
            this.btnSpinDown.addEventListener("click", () => {
                const cur = parseInt(this.cfgMaxLength.value, 10) || 40;
                this.cfgMaxLength.value = Math.max(2, cur - 1);
            });
        }
        if (this.btnSpinUp && this.cfgMaxLength) {
            this.btnSpinUp.addEventListener("click", () => {
                const cur = parseInt(this.cfgMaxLength.value, 10) || 40;
                this.cfgMaxLength.value = Math.min(500, cur + 1);
            });
        }

        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                this.openSearchBar();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                this.openSetupWindow();
            } else if (e.key === "Escape") {
                if (this.tocConfigModal && this.tocConfigModal.classList.contains("active")) {
                    this.closeTocConfigModal();
                } else if (this.publishModal && this.publishModal.classList.contains("active")) {
                    this.closePublishModal();
                } else if (this.editorSearchBar && this.editorSearchBar.style.display !== "none") {
                    this.closeSearchBar();
                }
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

    switchMobileTab(targetPanelId, skipSync = false) {
        if (!skipSync) this.syncViewportToLines();
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

        if (this.inputDebounceTimer) {
            clearTimeout(this.inputDebounceTimer);
            this.inputDebounceTimer = null;
        }

        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        this.showProgress(`파일 읽는 중... (${fileSizeMB} MB)`, 100);
        this.updateProgress(20, "초고속 인코딩 분석 중...");

        try {
            await new Promise(r => setTimeout(r, 20));
            const buffer = await file.arrayBuffer();
            this.updateProgress(50, "텍스트 파싱 중...");
            const decoded = this.detectAndDecodeText(buffer);

            this.fullText = decoded.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            this.lines = this.fullText.split('\n');
            this.totalLines = this.lines.length;
            this.currentViewStart = 0;
            this.currentViewEnd = 0;
            this.textArea.value = "";

            this.clearAllToc();
            
            const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
            this.metaData.title = defaultTitle;
            if (this.inputTitle) this.inputTitle.value = defaultTitle;

            this.renderViewport(0, Math.min(this.VIEWPORT_SIZE, this.totalLines), 0, true);
            this.switchMobileTab("panelEditor", true);

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

    syncViewportToLines() {
        if (!this.lines || this.lines.length === 0) return;
        const currentViewportText = this.textArea.value;
        const updatedViewportLines = currentViewportText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const deleteCount = Math.max(0, this.currentViewEnd - this.currentViewStart);

        this.lines.splice(this.currentViewStart, deleteCount, ...updatedViewportLines);
        this.totalLines = this.lines.length;
        this.currentViewEnd = this.currentViewStart + updatedViewportLines.length;

        if (this.editorStats) {
            this.editorStats.innerHTML = `총 <b>${this.totalLines.toLocaleString()}</b>줄 중 <b>${(this.currentViewStart + 1).toLocaleString()} ~ ${this.currentViewEnd.toLocaleString()}</b>줄 표시 중`;
        }

        if (this.chapters && this.chapters.length > 0) {
            this.updateTocPositions(true);
        }
    }

    scrollToCharPosition(charPos, length = 0) {
        if (!this.textArea) return;

        if (window.innerHeight >= window.innerWidth || window.innerWidth <= 900) {
            this.switchMobileTab("panelEditor");
        }

        const textVal = this.textArea.value;
        const safeCharPos = Math.max(0, Math.min(textVal.length, charPos));
        const safeLen = Math.max(0, Math.min(textVal.length - safeCharPos, length));

        const performScroll = () => {
            this.textArea.focus();
            this.textArea.setSelectionRange(safeCharPos, safeCharPos + safeLen);

            const computed = window.getComputedStyle(this.textArea);
            const lineHeight = parseFloat(computed.lineHeight) || 28.8;
            const paddingLeft = parseFloat(computed.paddingLeft) || 14;
            const paddingRight = parseFloat(computed.paddingRight) || 14;
            const clientW = this.textArea.clientWidth || 300;
            const contentWidth = Math.max(80, clientW - paddingLeft - paddingRight);
            const fontSize = parseFloat(computed.fontSize) || 16;
            const charsPerLine = Math.max(8, Math.floor(contentWidth / (fontSize * 0.82)));

            const textBefore = textVal.substring(0, safeCharPos);
            const linesBefore = textBefore.split('\n');
            let visualLinesBefore = 0;
            for (let i = 0; i < linesBefore.length; i++) {
                const lineLen = linesBefore[i].length;
                visualLinesBefore += Math.max(1, Math.ceil(lineLen / charsPerLine));
            }

            const clientH = this.textArea.clientHeight || 400;
            const targetScroll = Math.max(0, (visualLinesBefore * lineHeight) - (clientH / 2) + (lineHeight / 2));
            this.textArea.scrollTop = targetScroll;
        };

        performScroll();
        requestAnimationFrame(() => {
            performScroll();
        });
    }

    renderViewport(startLine, endLine, focusLocalLine = 0, forceNew = false, focusLength = 0) {
        if (!forceNew && this.lines && this.lines.length > 0 && this.currentViewEnd > this.currentViewStart && this.textArea.value) {
            this.syncViewportToLines();
        }

        this.currentViewStart = Math.max(0, startLine);
        this.currentViewEnd = Math.min(this.totalLines, endLine);

        const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
        this.textArea.value = viewportLines.join("\n");

        if (this.editorStats) {
            this.editorStats.innerHTML = `총 <b>${this.totalLines.toLocaleString()}</b>줄 중 <b>${(this.currentViewStart + 1).toLocaleString()} ~ ${this.currentViewEnd.toLocaleString()}</b>줄 표시 중`;
        }

        if (focusLocalLine > 0) {
            let charPos = 0;
            for (let i = 0; i < Math.min(focusLocalLine, viewportLines.length); i++) {
                charPos += viewportLines[i].length + 1;
            }
            this.scrollToCharPosition(charPos, focusLength);
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
        this.syncViewportToLines();
        const textInEditor = this.textArea.value;
        if ((!this.lines || this.lines.length === 0) && !textInEditor) {
            alert("본문 내용이 비어있습니다. 먼저 파일을 불러와주세요.");
            return;
        }

        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        let sample = textInEditor.substring(selStart, selEnd).trim();

        if (!sample) {
            alert("목차 패턴으로 사용할 텍스트를 본문에서 드래그하여 선택해주세요.\n(예: '제1장 프롤로그' 또는 '1화', 'Chapter 01')");
            return;
        }

        this.showProgress("전체 목차 분석 중...", 100);
        const targetText = (this.lines && this.lines.length > 0) ? this.lines.join("\n") : (textInEditor || this.fullText);

        if (this.worker) {
            const onMessage = (e) => {
                const { type, percent, text: msgText, chapters, error } = e.data;
                if (type === 'PROGRESS') {
                    this.updateProgress(percent, msgText);
                } else if (type === 'ANALYZE_TOC_DONE') {
                    this.worker.removeEventListener('message', onMessage);
                    this.hideProgress();

                    if (this.tocConfig.appendMode && this.chapters && this.chapters.length > 0) {
                        const map = new Map();
                        for (const c of this.chapters) {
                            map.set(c.lineNum, c.title);
                        }
                        for (const c of chapters) {
                            map.set(c.lineNum, c.title);
                        }
                        const merged = Array.from(map.entries()).map(([lineNum, title]) => ({ lineNum, title }));
                        merged.sort((a, b) => a.lineNum - b.lineNum);
                        const prevCount = this.chapters.length;
                        this.chapters = merged;
                        this.refreshTocList();
                        this.autoMsg(`새 패턴 목차 ${chapters.length}개 발견 (기존 ${prevCount}개 ➡️ 총 ${this.chapters.length}개 누적 병합 완료)`);
                    } else {
                        this.chapters = chapters;
                        this.refreshTocList();
                        this.autoMsg(`${this.chapters.length}개의 목차가 전체 본문에서 자동 생성되었습니다.`);
                    }
                } else if (type === 'ERROR') {
                    this.worker.removeEventListener('message', onMessage);
                    this.hideProgress();
                    alert(`목차 분석 중 오류: ${error}`);
                }
            };
            this.worker.addEventListener('message', onMessage);
            this.worker.postMessage({
                type: 'ANALYZE_TOC',
                payload: {
                    text: targetText,
                    sample,
                    config: this.tocConfig
                }
            });
        }
    }

    addManualToc() {
        this.syncViewportToLines();
        const textInEditor = this.textArea.value;
        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        const title = textInEditor.substring(selStart, selEnd).trim();

        if (!title) {
            alert("목차로 등록할 텍스트를 본문에서 드래그하여 선택하세요.");
            return;
        }

        const textBefore = textInEditor.substring(0, selStart);
        const localLine = (textBefore.match(/\n/g) || []).length;
        const globalLineNum = this.currentViewStart + localLine + 1;

        this.chapters.push({ lineNum: globalLineNum, title });
        this.chapters.sort((a, b) => a.lineNum - b.lineNum);
        this.refreshTocList();
        this.autoMsg(`목차 '${title}' (Line ${globalLineNum}) 추가 완료`);
    }

    goToChapterLine(targetLine, title) {
        const targetIndex = targetLine - 1;
        const titleLen = title ? title.length : 0;

        if (window.innerHeight >= window.innerWidth || window.innerWidth <= 900) {
            this.switchMobileTab("panelEditor");
        }

        if (targetIndex < this.currentViewStart || targetIndex >= this.currentViewEnd) {
            const newStart = Math.max(0, targetIndex - 200);
            const newEnd = Math.min(this.totalLines, newStart + this.VIEWPORT_SIZE);
            const localLine = targetIndex - newStart;
            this.renderViewport(newStart, newEnd, localLine, false, titleLen);
        } else {
            const localLine = targetIndex - this.currentViewStart;
            const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
            let charPos = 0;
            for (let i = 0; i < Math.min(localLine, viewportLines.length); i++) {
                charPos += viewportLines[i].length + 1;
            }
            this.scrollToCharPosition(charPos, titleLen);
        }
    }

    updateTocPositions(silent = false) {
        if (!this.chapters || this.chapters.length === 0) {
            if (!silent) this.autoMsg("등록된 목차가 없습니다.");
            return;
        }

        const newChapters = [];
        let searchCursor = 0;
        for (const ch of this.chapters) {
            const title = ch.title.trim();
            let foundLine = -1;

            for (let i = searchCursor; i < this.lines.length; i++) {
                if (this.lines[i].trim() === title || this.lines[i].includes(title)) {
                    foundLine = i + 1;
                    searchCursor = i + 1;
                    break;
                }
            }

            if (foundLine === -1) {
                for (let i = 0; i < this.lines.length; i++) {
                    if (this.lines[i].trim() === title || this.lines[i].includes(title)) {
                        foundLine = i + 1;
                        break;
                    }
                }
            }

            if (foundLine !== -1) {
                newChapters.push({ lineNum: foundLine, title: ch.title });
            } else {
                newChapters.push(ch);
            }
        }
        this.chapters = newChapters.sort((a, b) => a.lineNum - b.lineNum);
        this.refreshTocList();
        if (!silent) this.autoMsg("전체 본문에 맞춰 목차 목록이 동기화되었습니다.");
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
                <span class="toc-order">${idx + 1}.</span>
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

    async sanitizeImage(file) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                    const mime = isPng ? 'image/png' : 'image/jpeg';

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            file.arrayBuffer().then(buf => resolve({ buffer: buf, dataUrl: URL.createObjectURL(file), mime: file.type || 'image/jpeg' }));
                            return;
                        }
                        blob.arrayBuffer().then(buf => {
                            resolve({
                                buffer: buf,
                                dataUrl: URL.createObjectURL(blob),
                                mime: mime
                            });
                        });
                    }, mime, 0.95);
                } catch (e) {
                    file.arrayBuffer().then(buf => resolve({ buffer: buf, dataUrl: URL.createObjectURL(file), mime: file.type || 'image/jpeg' }));
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                file.arrayBuffer().then(buf => resolve({ buffer: buf, dataUrl: URL.createObjectURL(file), mime: file.type || 'image/jpeg' }));
            };
            img.src = url;
        });
    }

    async handleAddImages(event) {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        for (const file of files) {
            if (this.images.some(img => img.name === file.name)) continue;

            try {
                const sanitized = await this.sanitizeImage(file);
                let cleanName = file.name || `image_${Date.now()}.jpg`;
                if (!cleanName.includes('.')) {
                    cleanName += sanitized.mime === 'image/png' ? '.png' : '.jpg';
                }

                this.images.push({
                    id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    name: cleanName,
                    buffer: sanitized.buffer,
                    mime: sanitized.mime,
                    dataUrl: sanitized.dataUrl
                });
            } catch (err) {
                console.error("이미지 읽기 오류:", err);
            }
        }
        this.refreshImageView();
        this.autoMsg(`${files.length}개의 삽화가 추가되었습니다. (EXIF/위치정보 세탁 완료)`);
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
                e.dataTransfer.setData("text/plain", `\n[IMAGE:${img.name}]\n`);
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
        const tag = `\n[IMAGE:${imageName}]\n`;

        this.textArea.value = text.substring(0, selStart) + tag + text.substring(selEnd);
        this.syncViewportToLines();
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
                this.syncViewportToLines();
                this.autoMsg("삽화 태그가 본문에 삽입되었습니다.");
            }
        });
    }

    openSetupWindow() {
        if (!this.chapters || this.chapters.length === 0) {
            alert("등록된 목차가 없습니다.\n'목차 형식 분석' 또는 '선택영역 목차 추가'로 목차를 먼저 생성해주세요.");
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

    openTocConfigModal() {
        this.syncTocConfigModalInputs();
        if (this.tocConfigModal) {
            this.tocConfigModal.classList.add("active");
        }
    }

    closeTocConfigModal() {
        if (this.tocConfigModal) {
            this.tocConfigModal.classList.remove("active");
        }
    }

    loadTocConfig() {
        const DEFAULT_CONFIG = {
            appendMode: false,
            maxLength: 40,
            fullLineOnly: false,
            requireDelimiter: true,
            allowPrefix: false
        };
        try {
            const saved = localStorage.getItem('epub_studio_toc_config');
            if (saved) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('[App] Failed to load toc config from localStorage:', e);
        }
        return { ...DEFAULT_CONFIG };
    }

    syncTocConfigModalInputs() {
        if (this.cfgAppendMode) this.cfgAppendMode.checked = !!this.tocConfig.appendMode;
        if (this.cfgMaxLength) this.cfgMaxLength.value = this.tocConfig.maxLength || 40;
        if (this.cfgFullLineOnly) this.cfgFullLineOnly.checked = !!this.tocConfig.fullLineOnly;
        if (this.cfgRequireDelimiter) this.cfgRequireDelimiter.checked = (this.tocConfig.requireDelimiter !== false);
        if (this.cfgAllowPrefix) this.cfgAllowPrefix.checked = !!this.tocConfig.allowPrefix;
    }

    saveTocConfigFromModal() {
        if (this.cfgAppendMode) this.tocConfig.appendMode = this.cfgAppendMode.checked;
        if (this.cfgMaxLength) {
            const val = parseInt(this.cfgMaxLength.value, 10);
            this.tocConfig.maxLength = isNaN(val) ? 40 : Math.max(2, Math.min(500, val));
        }
        if (this.cfgFullLineOnly) this.tocConfig.fullLineOnly = this.cfgFullLineOnly.checked;
        if (this.cfgRequireDelimiter) this.tocConfig.requireDelimiter = this.cfgRequireDelimiter.checked;
        if (this.cfgAllowPrefix) this.tocConfig.allowPrefix = this.cfgAllowPrefix.checked;

        this.saveTocConfig(true);
        this.closeTocConfigModal();
    }

    saveTocConfig(notify = true) {
        try {
            localStorage.setItem('epub_studio_toc_config', JSON.stringify(this.tocConfig));
            if (notify) {
                this.autoMsg("목차 분석 고급 설정이 저장되었습니다.");
            }
        } catch (e) {
            console.warn('[App] Failed to save toc config:', e);
        }
        this.updateTocConfigBadge();
    }

    resetTocConfig() {
        this.tocConfig = {
            appendMode: false,
            maxLength: 40,
            fullLineOnly: false,
            requireDelimiter: true,
            allowPrefix: false
        };
        this.syncTocConfigModalInputs();
        this.saveTocConfig(false);
        this.autoMsg("목차 분석 설정이 기본값으로 초기화되었습니다.");
    }

    updateTocConfigBadge() {
        if (!this.btnOpenTocConfig) return;
        const isCustom = (
            !!this.tocConfig.appendMode ||
            Number(this.tocConfig.maxLength) !== 40 ||
            !!this.tocConfig.fullLineOnly ||
            this.tocConfig.requireDelimiter === false ||
            !!this.tocConfig.allowPrefix
        );

        if (isCustom) {
            this.btnOpenTocConfig.classList.add("active-config");
            const tags = [];
            if (this.tocConfig.appendMode) tags.push("누적병합");
            if (Number(this.tocConfig.maxLength) !== 40) tags.push(`최대${this.tocConfig.maxLength}자`);
            if (this.tocConfig.fullLineOnly) tags.push("단독줄");
            if (this.tocConfig.requireDelimiter === false) tags.push("구분자해제");
            if (this.tocConfig.allowPrefix) tags.push("접두사허용");
            this.btnOpenTocConfig.title = `목차 분석 설정 (맞춤 설정 적용 중: ${tags.join(', ')})`;
        } else {
            this.btnOpenTocConfig.classList.remove("active-config");
            this.btnOpenTocConfig.title = "목차 분석 고급 패턴 및 오탐 방지 설정 (기본값)";
        }
    }

    async handleCoverSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const sanitized = await this.sanitizeImage(file);
            const mime = sanitized.mime;
            const ext = mime === 'image/png' ? 'png' : 'jpg';

            this.metaData.coverBuffer = sanitized.buffer;
            this.metaData.coverMime = mime;
            this.metaData.coverExt = ext;
            this.metaData.coverName = file.name || `cover.${ext}`;
            this.metaData.coverDataUrl = sanitized.dataUrl;

            if (this.coverPreviewName) this.coverPreviewName.textContent = this.metaData.coverName;
            if (this.coverPreviewImg) {
                this.coverPreviewImg.src = sanitized.dataUrl;
                this.coverPreviewImg.style.display = "block";
            }
            this.autoMsg("표지 이미지가 등록되었습니다. (EXIF/위치정보 세탁 완료)");
        } catch (err) {
            console.error("표지 읽기 오류:", err);
            alert("표지 이미지를 불러오는 데 실패했습니다: " + (err.message || err));
        } finally {
            this.coverInput.value = "";
        }
    }

    async exportEpub() {
        this.syncViewportToLines();
        this.updateTocPositions(true);
        this.metaData.title = this.inputTitle.value.trim() || "제목 없음";
        this.metaData.author = this.inputAuthor.value.trim() || "작자 미상";
        this.metaData.publisher = this.inputPublisher.value.trim();
        this.metaData.date = this.inputDate.value.trim() || new Date().toISOString().split('T')[0];

        const allLines = this.lines.length > 0 ? this.lines : this.textArea.value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const totalLinesCount = allLines.length;

        const epubChapters = [];

        const firstChapLine = this.chapters[0].lineNum;
        if (firstChapLine > 1) {
            const prologueLines = allLines.slice(0, firstChapLine - 1);
            const prologueText = prologueLines.join("\n").trim();
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
            let rawContent = chapLines.join("\n").trim();

            const splitLines = rawContent.split(/\r?\n/);
            if (splitLines.length > 0 && splitLines[0].trim() === ch.title.trim()) {
                rawContent = splitLines.slice(1).join("\n").trim();
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

    // In-Editor Search Methods (Ctrl+F)
    toggleSearchBar() {
        if (!this.editorSearchBar) return;
        if (this.editorSearchBar.style.display === "none") {
            this.openSearchBar();
        } else {
            this.closeSearchBar();
        }
    }

    openSearchBar() {
        if (!this.editorSearchBar) return;
        this.editorSearchBar.style.display = "flex";
        
        // If text is selected in textarea, use it as query
        const selStart = this.textArea.selectionStart;
        const selEnd = this.textArea.selectionEnd;
        if (selEnd > selStart) {
            const selected = this.textArea.value.substring(selStart, selEnd).trim();
            if (selected && selected.length < 50) {
                this.searchInput.value = selected;
            }
        }
        
        this.searchInput.focus();
        this.searchInput.select();
    }

    closeSearchBar() {
        if (!this.editorSearchBar) return;
        this.editorSearchBar.style.display = "none";
        this.searchMatches = [];
        this.currentSearchIndex = -1;
        this.currentSearchQuery = "";
        if (this.searchMatchCount) this.searchMatchCount.textContent = "0 / 0";
        this.textArea.focus();
    }

    executeSearch() {
        const query = this.searchInput.value.trim();
        this.searchMatches = [];
        this.currentSearchIndex = -1;
        this.currentSearchQuery = query;

        if (!query) {
            if (this.searchMatchCount) this.searchMatchCount.textContent = "0 / 0";
            return;
        }

        if (!this.lines || this.lines.length === 0) {
            if (this.searchMatchCount) this.searchMatchCount.textContent = "0 / 0";
            this.autoMsg("검색할 본문 텍스트가 없습니다.");
            return;
        }

        const lowerQuery = query.toLowerCase();
        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];
            const lowerLine = line.toLowerCase();
            let col = lowerLine.indexOf(lowerQuery);
            while (col !== -1) {
                this.searchMatches.push({
                    globalLine: i + 1,
                    lineIndex: i,
                    col: col,
                    length: query.length
                });
                col = lowerLine.indexOf(lowerQuery, col + query.length);
            }
        }

        const total = this.searchMatches.length;
        if (total === 0) {
            if (this.searchMatchCount) this.searchMatchCount.textContent = "0 / 0";
            this.autoMsg(`'${query}' 검색 결과가 없습니다.`);
            return;
        }

        // Find match closest to current viewport
        let bestIndex = 0;
        for (let i = 0; i < total; i++) {
            if (this.searchMatches[i].lineIndex >= this.currentViewStart) {
                bestIndex = i;
                break;
            }
        }

        this.currentSearchIndex = bestIndex;
        this.updateSearchMatchUI();
        this.goToCurrentSearchMatch();
    }

    goToNextSearchMatch() {
        if (!this.searchMatches || this.searchMatches.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchMatches.length;
        this.updateSearchMatchUI();
        this.goToCurrentSearchMatch();
    }

    goToPrevSearchMatch() {
        if (!this.searchMatches || this.searchMatches.length === 0) return;
        this.currentSearchIndex = (this.currentSearchIndex - 1 + this.searchMatches.length) % this.searchMatches.length;
        this.updateSearchMatchUI();
        this.goToCurrentSearchMatch();
    }

    updateSearchMatchUI() {
        if (!this.searchMatchCount) return;
        const total = this.searchMatches.length;
        if (total === 0 || this.currentSearchIndex === -1) {
            this.searchMatchCount.textContent = "0 / 0";
        } else {
            this.searchMatchCount.textContent = `${this.currentSearchIndex + 1} / ${total.toLocaleString()}`;
        }
    }

    goToCurrentSearchMatch() {
        if (this.currentSearchIndex < 0 || this.currentSearchIndex >= this.searchMatches.length) return;
        const match = this.searchMatches[this.currentSearchIndex];
        const targetLineIndex = match.lineIndex;

        // Check if target is inside current viewport
        if (targetLineIndex < this.currentViewStart || targetLineIndex >= this.currentViewEnd) {
            const newStart = Math.max(0, targetLineIndex - 200);
            const newEnd = Math.min(this.totalLines, newStart + this.VIEWPORT_SIZE);
            const localLine = targetLineIndex - newStart;
            this.renderViewport(newStart, newEnd, 0);
            
            const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
            let charPos = 0;
            for (let i = 0; i < localLine; i++) {
                charPos += viewportLines[i].length + 1;
            }
            charPos += match.col;
            this.scrollToCharPosition(charPos, match.length);
        } else {
            const localLine = targetLineIndex - this.currentViewStart;
            const viewportLines = this.lines.slice(this.currentViewStart, this.currentViewEnd);
            let charPos = 0;
            for (let i = 0; i < localLine; i++) {
                charPos += viewportLines[i].length + 1;
            }
            charPos += match.col;
            this.scrollToCharPosition(charPos, match.length);
        }
    }

    escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.app = new EpubApp();
});
