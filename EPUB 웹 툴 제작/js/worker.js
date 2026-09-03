importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');

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
    const escaped = sample.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patternStr = escaped.replace(/\d+/g, '\\d+');
    const regex = new RegExp(`^\\s*${patternStr}`, 'i');
    const lines = text.split(/\r?\n/);
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
        const chapNum = i + 1;
        const fileName = `chap_${String(chapNum).padStart(4, "0")}.xhtml`;
        const chapId = `chap_${String(chapNum).padStart(4, "0")}`;
        const chapTitle = chap.title || (chap.isPrologue ? "프롤로그" : `제 ${chapNum} 장`);
        const chapHtmlContent = processTextToHtml(chap.content);
        const xhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko"><head><meta charset="utf-8"/><title>${escapeHtml(chapTitle)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body epub:type="bodymatter"><section id="${chapId}" class="chapter-container" epub:type="chapter" role="doc-chapter"><div id="chapter-top" style="position:relative; top:0; height:1px;"></div><h2>${escapeHtml(chapTitle)}</h2>${chapHtmlContent}<div class="chapter-end-spacer" style="height: 60px; clear: both;"></div></section></body></html>`;
        oebps.file(fileName, xhtml);
        manifestItems.push(`<item id="${chapId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
        spineItems.push(`<itemref idref="${chapId}"/>`);
        navMapNcx.push(`    <navPoint id="navPoint-${playOrder}" playOrder="${playOrder}"><navLabel><text>${escapeHtml(chapTitle)}</text></navLabel><content src="${fileName}#chapter-top"/></navPoint>`);
        navListHtml.push(`      <li><a href="${fileName}#chapter-top">${escapeHtml(chapTitle)}</a></li>`);
        playOrder++;
    }
    const navXhtml = `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ko"><head><title>목차</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><nav epub:type="toc" id="toc"><h2>목차</h2><ol>${navListHtml.join("\n")}</ol></nav></body></html>`;
    oebps.file("nav.xhtml", navXhtml);
    manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);
    const bookUuid = "urn:uuid:" + Math.random().toString(36).substring(2);
    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${bookUuid}"/></head><docTitle><text>${escapeHtml(metadata.title || "제목 없음")}</text></docTitle><docAuthor><text>${escapeHtml(metadata.author || "작자 미상")}</text></docAuthor><navMap>${navMapNcx.join("\n")}</navMap></ncx>`;
    oebps.file("toc.ncx", tocNcx);
    manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);
    const dateStr = metadata.date || new Date().toISOString().split('T')[0];
    const contentOpf = `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" xml:lang="ko"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf"><dc:identifier id="BookId">${bookUuid}</dc:identifier><dc:title>${escapeHtml(metadata.title || "제목 없음")}</dc:title><dc:language>ko</dc:language><dc:creator id="creator">${escapeHtml(metadata.author || "작자 미상")}</dc:creator><dc:publisher>${escapeHtml(metadata.publisher || "")}</dc:publisher><dc:date>${dateStr}</dc:date><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>${hasCover ? '<meta name="cover" content="cover-image"/>' : ''}</metadata><manifest>${manifestItems.join("\n")}</manifest><spine toc="ncx" page-progression-direction="ltr">${spineItems.join("\n")}</spine></package>`;
    oebps.file("content.opf", contentOpf);
    self.postMessage({ type: 'PROGRESS', percent: 85, text: '백그라운드 EPUB 압축 중...' });
    const epubArrayBuffer = await zip.generateAsync({ type: "arraybuffer", mimeType: "application/epub+zip", compression: "DEFLATE", compressionOptions: { level: 6 } }, (meta) => {
        self.postMessage({ type: 'PROGRESS', percent: 85 + Math.floor(meta.percent * 0.15), text: `압축 중... (${Math.floor(meta.percent)}%)` });
    });
    self.postMessage({ type: 'BUILD_EPUB_DONE', buffer: epubArrayBuffer }, [epubArrayBuffer]);
}

function escapeHtml(text) { if (!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
function processTextToHtml(rawText) {
    if (!rawText) return "";
    const lines = rawText.split(/\r?\n/);
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
    return output.join("\n");
}