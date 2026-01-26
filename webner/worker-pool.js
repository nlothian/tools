/**
 * worker-pool.js - Manages a pool of web workers for parallel NER processing
 */

/**
 * Calculate optimal number of workers based on device capabilities
 * @returns {number} Recommended worker count (1-4)
 */
export function getOptimalWorkerCount() {
    const cores = navigator.hardwareConcurrency || 4;
    const memoryGB = navigator.deviceMemory || 4; // Chrome/Edge only, undefined in Firefox/Safari

    // Memory constraint: ~170MB model per worker + ~50MB overhead per worker
    // Conservative: use 80% of reported memory minus 200MB base overhead
    const memoryBasedLimit = Math.floor((memoryGB * 0.8 - 0.2) / 0.22);

    // CPU constraint: leave 1 core for main thread and browser
    const coreBasedLimit = Math.max(1, cores - 1);

    // Hard maximum: never use more than 2 workers (memory constraints)
    const practicalMax = 2;

    return Math.max(1, Math.min(memoryBasedLimit, coreBasedLimit, practicalMax));
}

/**
 * WorkerPool manages multiple web workers for parallel chunk processing
 */
export class WorkerPool {
    /**
     * @param {string} workerScript - Path to worker script
     * @param {number} poolSize - Number of workers to create
     */
    constructor(workerScript, poolSize) {
        this.workerScript = workerScript;
        this.poolSize = poolSize;
        this.workers = [];
        this.readyWorkers = new Set();
        this.isInitialized = false;
        this.isStopping = false;
    }

    /**
     * Initialize the worker pool and load model in all workers
     * @param {Function} onProgress - Progress callback for model download
     * @returns {Promise<void>}
     */
    async initialize(onProgress = null) {
        if (this.isInitialized) return;

        // Create all workers
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(this.workerScript, { type: 'module' });
            worker.workerId = i;
            this.workers.push(worker);
        }

        // Load model in all workers in parallel
        // Only the first worker reports download progress (others load from cache)
        const loadPromises = this.workers.map((worker, i) => {
            return new Promise((resolve, reject) => {
                const handler = (e) => {
                    if (e.data.type === 'loaded') {
                        this.readyWorkers.add(i);
                        worker.removeEventListener('message', handler);
                        resolve();
                    } else if (e.data.type === 'error') {
                        worker.removeEventListener('message', handler);
                        reject(new Error(e.data.message));
                    } else if (e.data.type === 'progress' && i === 0 && onProgress) {
                        // Only first worker reports download progress
                        onProgress(e.data.data);
                    }
                };
                worker.addEventListener('message', handler);
                worker.postMessage({ type: 'load' });
            });
        });

        await Promise.all(loadPromises);
        this.isInitialized = true;
    }

    /**
     * Distribute chunks among workers using round-robin
     * @param {Array<{text: string, offset: number}>} chunks
     * @returns {Array<Array>} Chunks assigned to each worker
     */
    distributeChunks(chunks) {
        const assignments = Array.from({ length: this.poolSize }, () => []);
        chunks.forEach((chunk, i) => {
            const workerIdx = i % this.poolSize;
            assignments[workerIdx].push({
                ...chunk,
                originalIndex: i
            });
        });
        return assignments;
    }

    /**
     * Process chunks across all workers in parallel
     * @param {Array<{text: string, offset: number}>} chunks - Pre-split text chunks
     * @param {Function} onProgress - Callback for progress updates (completed, total)
     * @returns {Promise<{entities: Array, chunkCount: number}>}
     */
    async processChunks(chunks, onProgress = null) {
        if (!this.isInitialized) {
            throw new Error('WorkerPool not initialized. Call initialize() first.');
        }

        this.isStopping = false;
        const assignments = this.distributeChunks(chunks);
        const results = new Array(this.poolSize);
        let completedChunks = 0;
        const totalChunks = chunks.length;

        // Determine how many workers we actually need
        const activeWorkerCount = Math.min(this.poolSize, chunks.length);

        const workerPromises = assignments.map((assignment, workerId) => {
            // Skip workers with no chunks assigned
            if (assignment.length === 0) {
                results[workerId] = { entities: [] };
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const worker = this.workers[workerId];

                const handler = (e) => {
                    if (this.isStopping) {
                        worker.removeEventListener('message', handler);
                        resolve();
                        return;
                    }

                    if (e.data.type === 'chunk_complete') {
                        completedChunks++;
                        if (onProgress) {
                            onProgress(completedChunks, totalChunks);
                        }
                    } else if (e.data.type === 'result') {
                        results[workerId] = e.data;
                        worker.removeEventListener('message', handler);
                        resolve();
                    } else if (e.data.type === 'error') {
                        worker.removeEventListener('message', handler);
                        reject(new Error(e.data.message));
                    } else if (e.data.type === 'stopped') {
                        worker.removeEventListener('message', handler);
                        resolve();
                    }
                };

                worker.addEventListener('message', handler);
                worker.postMessage({
                    type: 'process_chunks',
                    chunks: assignment,
                    workerId
                });
            });
        });

        await Promise.all(workerPromises);

        if (this.isStopping) {
            return { entities: [], chunkCount: 0, stopped: true };
        }

        // Aggregate results from all workers
        return this.aggregateResults(results, totalChunks);
    }

    /**
     * Aggregate results from all workers
     * @param {Array} workerResults - Results from each worker
     * @param {number} totalChunks - Total number of chunks processed
     * @returns {{entities: Array, chunkCount: number}}
     */
    aggregateResults(workerResults, totalChunks) {
        const allEntities = [];

        for (const result of workerResults) {
            if (result?.entities) {
                allEntities.push(...result.entities);
            }
        }

        return {
            entities: allEntities,
            chunkCount: totalChunks
        };
    }

    /**
     * Stop all workers currently processing
     */
    stopAll() {
        this.isStopping = true;
        this.workers.forEach(worker => {
            worker.postMessage({ type: 'stop' });
        });
    }

    /**
     * Terminate all workers and clean up
     */
    terminate() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.readyWorkers.clear();
        this.isInitialized = false;
    }

    /**
     * Get number of ready workers
     * @returns {number}
     */
    get readyCount() {
        return this.readyWorkers.size;
    }

    /**
     * Check if all workers are ready
     * @returns {boolean}
     */
    get isReady() {
        return this.isInitialized && this.readyWorkers.size === this.poolSize;
    }
}
