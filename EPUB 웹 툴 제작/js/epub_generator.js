class EpubGenerator {
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
window.EpubGenerator = new EpubGenerator();