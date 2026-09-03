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
            this.lines = this.fullText.split(/\r?\n/);
            this.totalLines = this.lines.length;

            this.clearAllToc();
            
            const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
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

    syncViewportToLines() {
        if (!this.lines || this.lines.length === 0) return;
        const currentViewportText = this.textArea.value;
        const updatedViewportLines = currentViewportText.split(/\r?\n/);
        const deleteCount = Math.max(0, this.currentViewEnd - this.currentViewStart);
        this.lines.splice(this.currentViewStart, deleteCount, ...updatedViewportLines);
        this.totalLines = this.lines.length;
        this.currentViewEnd = this.currentViewStart + updatedViewportLines.length;
        if (this.editorStats) {
            this.editorStats.innerHTML = `총 <b>${this.totalLines.toLocaleString()}</b>줄 중 <b>${(this.currentViewStart + 1).toLocaleString()} ~ ${this.currentViewEnd.toLocaleString()}</b>줄 표시 중`;
        }
    }

    renderViewport(startLine, endLine, focusLocalLine = 0) {
        if (this.lines && this.lines.length > 0 && this.currentViewEnd > this.currentViewStart && this.textArea.value) {
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
            alert("목차 패턴으로 사용할 텍스트를 본문에서 드래그하여 선택해주세요.\n(예: '제1장 프롤로그' 또는 '1화', 'Chapter 01')");
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
        const localLine = (textBefore.match(/\n/g) || []).length;
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
        this.syncViewportToLines();
        this.metaData.title = this.inputTitle.value.trim() || "제목 없음";
        this.metaData.author = this.inputAuthor.value.trim() || "작자 미상";
        this.metaData.publisher = this.inputPublisher.value.trim();
        this.metaData.date = this.inputDate.value.trim() || new Date().toISOString().split('T')[0];

        const allLines = this.lines.length > 0 ? this.lines : this.textArea.value.split(/\r?\n/);
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

    escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.app = new EpubApp();
});
