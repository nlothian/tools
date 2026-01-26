/**
 * ner-worker.js - Web Worker for NER model loading and inference
 * Runs transformers.js model operations off the main thread
 */

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0';
import { splitIntoChunks, PIPELINE_OPTIONS } from './NER.js';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL_ID = 'Xenova/bert-base-NER';
let nerPipeline = null;
let isModelLoading = false;
let shouldStop = false;

/**
 * Handle messages from the main thread
 */
self.onmessage = async (e) => {
    const { type, text, chunks, workerId } = e.data;

    if (type === 'load') {
        await loadModel();
    } else if (type === 'process') {
        // Legacy single-worker mode (backward compatible)
        shouldStop = false;
        await processText(text);
    } else if (type === 'process_chunks') {
        // Parallel mode: process pre-split chunks
        shouldStop = false;
        await processChunks(chunks, workerId);
    } else if (type === 'stop') {
        shouldStop = true;
    }
};

/**
 * Load the NER model with progress reporting
 */
async function loadModel() {
    if (nerPipeline) {
        self.postMessage({ type: 'loaded' });
        return;
    }

    if (isModelLoading) {
        return;
    }

    isModelLoading = true;

    try {
        nerPipeline = await pipeline('token-classification', MODEL_ID, {
            progress_callback: (progress) => {
                self.postMessage({ type: 'progress', data: progress });
            }
        });

        self.postMessage({ type: 'loaded' });
    } catch (err) {
        self.postMessage({ type: 'error', message: err.message });
    } finally {
        isModelLoading = false;
    }
}

/**
 * Process text through the NER model
 * @param {string} text - Text to analyze
 */
async function processText(text) {
    // Ensure model is loaded
    if (!nerPipeline) {
        await loadModel();
        if (!nerPipeline) {
            self.postMessage({ type: 'error', message: 'Model failed to load' });
            return;
        }
    }

    try {
        // Split text into chunks for long documents
        const chunks = splitIntoChunks(text);
        let allResults = [];

        for (let i = 0; i < chunks.length; i++) {
            // Check if stop was requested
            if (shouldStop) {
                self.postMessage({ type: 'stopped' });
                return;
            }

            const chunk = chunks[i];

            // Report progress
            self.postMessage({
                type: 'chunk_progress',
                current: i + 1,
                total: chunks.length
            });

            // Run inference on this chunk
            const chunkResults = await nerPipeline(chunk.text, PIPELINE_OPTIONS);

            // Check again after inference (which can be slow)
            if (shouldStop) {
                self.postMessage({ type: 'stopped' });
                return;
            }

            // Adjust positions by chunk offset and add to results
            for (const entity of chunkResults) {
                allResults.push({
                    ...entity,
                    _chunkOffset: chunk.offset,
                    _chunkText: chunk.text
                });
            }
        }

        self.postMessage({
            type: 'result',
            entities: allResults,
            chunkCount: chunks.length
        });
    } catch (err) {
        if (!shouldStop) {
            self.postMessage({ type: 'error', message: err.message });
        }
    }
}

/**
 * Process pre-split chunks (for parallel worker mode)
 * @param {Array<{text: string, offset: number, originalIndex: number}>} chunks - Chunks to process
 * @param {number} workerId - ID of this worker
 */
async function processChunks(chunks, workerId) {
    // Ensure model is loaded
    if (!nerPipeline) {
        await loadModel();
        if (!nerPipeline) {
            self.postMessage({ type: 'error', message: 'Model failed to load' });
            return;
        }
    }

    try {
        let allResults = [];

        for (const chunk of chunks) {
            // Check if stop was requested
            if (shouldStop) {
                self.postMessage({ type: 'stopped' });
                return;
            }

            // Run inference on this chunk
            const chunkResults = await nerPipeline(chunk.text, PIPELINE_OPTIONS);

            // Check again after inference (which can be slow)
            if (shouldStop) {
                self.postMessage({ type: 'stopped' });
                return;
            }

            // Report individual chunk completion for progress tracking
            self.postMessage({
                type: 'chunk_complete',
                originalIndex: chunk.originalIndex,
                workerId
            });

            // Adjust positions by chunk offset and add to results
            for (const entity of chunkResults) {
                allResults.push({
                    ...entity,
                    _chunkOffset: chunk.offset,
                    _chunkText: chunk.text,
                    _originalIndex: chunk.originalIndex
                });
            }
        }

        self.postMessage({
            type: 'result',
            entities: allResults,
            chunkCount: chunks.length,
            workerId
        });
    } catch (err) {
        if (!shouldStop) {
            self.postMessage({ type: 'error', message: err.message });
        }
    }
}
