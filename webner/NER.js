/**
 * NER.js - Named Entity Recognition utility functions
 * Works in both browser and Node.js environments
 */

// Check if running in Node.js
const isNode = typeof window === 'undefined';

// Shared pipeline options so browser and tests stay in sync
const PIPELINE_OPTIONS = {
    aggregation_strategy: 'none',
    // Keep O-labeled subword tokens so names like "Littleproud" aren't truncated
    ignore_labels: []
};

/**
 * Split text into chunks that fit within BERT's token limit
 * ~1500 chars is conservative for 512 tokens with WordPiece
 * @param {string} text - The text to split
 * @param {number} maxChars - Maximum characters per chunk (default 1500)
 * @returns {Array<{text: string, offset: number}>} Array of chunks with text and offset
 */
function splitIntoChunks(text, maxChars = 1500) {
    const chunks = [];
    let remaining = text;
    let offset = 0;

    // Handle empty text
    if (remaining.length === 0) {
        return [{ text: '', offset: 0 }];
    }

    while (remaining.length > 0) {
        if (remaining.length <= maxChars) {
            chunks.push({ text: remaining, offset: offset });
            break;
        }

        // Find a good break point (sentence end, then word boundary)
        let breakPoint = maxChars;

        // Look for sentence boundary (.!?) followed by space
        const sentenceMatch = remaining.slice(0, maxChars).match(/.*[.!?]\s/);
        if (sentenceMatch) {
            breakPoint = sentenceMatch[0].length;
        } else {
            // Fall back to word boundary
            const lastSpace = remaining.lastIndexOf(' ', maxChars);
            if (lastSpace > maxChars * 0.5) {
                breakPoint = lastSpace + 1;
            }
        }

        chunks.push({ text: remaining.slice(0, breakPoint), offset: offset });
        offset += breakPoint;
        remaining = remaining.slice(breakPoint);
    }

    return chunks;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (isNode) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    } else {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Get human-readable name for entity type
 * @param {string} type - Entity type code (PER, LOC, ORG, MISC)
 * @returns {string} Human-readable type name
 */
function getTypeName(type) {
    const names = {
        'PER': 'Person',
        'LOC': 'Location',
        'ORG': 'Organization',
        'MISC': 'Miscellaneous'
    };
    return names[type] || type;
}

/**
 * Process raw NER results from transformers.js into normalized entities
 * Handles position calculation, WordPiece token aggregation, and entity merging
 * @param {string} text - The original input text
 * @param {Array} rawEntities - Raw entity results from the NER pipeline
 * @returns {Array} Processed and aggregated entities with accurate positions
 */
function processEntities(text, rawEntities) {
    let processedEntities = [];
    let currentChunkOffset = null;
    let searchPos = 0;

    if (!Array.isArray(rawEntities)) {
        return [];
    }

    for (const entity of rawEntities) {
        const word = entity.word || entity.text || entity.token || '';
        const entityGroup = entity.entity_group || entity.entity || entity.label || 'UNKNOWN';
        const isSubword = word.startsWith('##');
        const hasModelPositions = typeof entity.start === 'number' && typeof entity.end === 'number';

        // Get chunk info (for chunked processing)
        const chunkOffset = entity._chunkOffset || 0;
        const chunkText = entity._chunkText || text;

        // Reset search position when moving to a new chunk
        if (chunkOffset !== currentChunkOffset) {
            currentChunkOffset = chunkOffset;
            searchPos = 0;
        }

        // Calculate character positions
        // Prefer using start/end from the model if available (more accurate)
        let start, end;
        const cleanWord = word.replace(/^##/, '');

        if (hasModelPositions) {
            // Use model-provided positions (relative to chunk text)
            start = entity.start;
            end = entity.end;
        } else if (isSubword) {
            // Sub-word token: starts immediately at current searchPos (no space)
            start = searchPos;
            end = start + cleanWord.length;
        } else {
            // Regular token: find it in the chunk text from current position
            start = chunkText.indexOf(cleanWord, searchPos);
            if (start === -1) {
                // Fallback: try case-insensitive search
                const lowerChunkText = chunkText.toLowerCase();
                start = lowerChunkText.indexOf(cleanWord.toLowerCase(), searchPos);
            }
            if (start === -1) {
                // Could not find token in chunk text
                continue;
            }
            end = start + cleanWord.length;
        }

        // Always advance search position, even if this token gets filtered out
        searchPos = end;

        // Skip non-entity labels (O means "Outside" - not an entity)
        // BUT keep tokens that:
        // 1. Are subword tokens (##) - they should merge with previous entity
        // 2. Have model-provided positions - they might be contiguous with an entity
        const isNonEntityLabel = entityGroup === 'O' || entityGroup === 'UNKNOWN';
        if (isNonEntityLabel && !isSubword && !hasModelPositions) {
            continue;
        }

        // Add chunk offset to get position in full text
        const processed = {
            word: word,
            entity_group: entityGroup,
            score: entity.score || entity.confidence || 0,
            start: start + chunkOffset,
            end: end + chunkOffset
        };

        processedEntities.push(processed);
    }

    // Sort by start position to ensure correct order for aggregation
    processedEntities.sort((a, b) => a.start - b.start);

    return processedEntities;
}

/**
 * Aggregate sub-word tokens (WordPiece ## tokens) and consecutive same-type entities
 * @param {string} text - The original input text
 * @param {Array} processedEntities - Entities from processEntities()
 * @returns {Array} Aggregated entities
 */
function aggregateEntities(text, processedEntities) {
    const aggregatedEntities = [];

    for (const entity of processedEntities) {
        const lastEntity = aggregatedEntities[aggregatedEntities.length - 1];
        const currentType = entity.entity_group.replace('B-', '').replace('I-', '');
        const lastType = lastEntity ? lastEntity.entity_group.replace('B-', '').replace('I-', '') : null;

        // Check if this should be merged with the previous entity
        const isSubwordToken = entity.word.startsWith('##');
        const sameType = currentType === lastType;
        const lastIsEntity = lastType && lastType !== 'O' && lastType !== 'UNKNOWN';

        // Check for contiguous tokens (no gap = same word)
        const isContiguous = lastEntity && entity.start === lastEntity.end;

        // Adjacent means small gap with only spaces/dashes between (no other punctuation)
        let isAdjacent = false;
        if (lastEntity && entity.start <= lastEntity.end + 2) {
            const textBetween = text.slice(lastEntity.end, entity.start);
            // Only merge if the gap contains only spaces and/or dashes
            isAdjacent = /^[\s\-]*$/.test(textBetween);
        }

        // Contiguous tokens (no gap) should merge if previous was an entity
        // This handles cases where "Littleproud" is tokenized as "Little" + "proud"
        // and "proud" is tagged as O but should still be part of the name
        if (isContiguous && lastIsEntity) {
            lastEntity.end = entity.end;
            // Update word from actual text to avoid tokenizer truncation issues
            lastEntity.word = text.slice(lastEntity.start, lastEntity.end);
            lastEntity.score = Math.min(lastEntity.score, entity.score);
        }
        // Merge adjacent same-type entities (e.g., "Andrew" + "Hastie" = "Andrew Hastie")
        else if (lastEntity && sameType && isAdjacent) {
            lastEntity.end = entity.end;
            // Update word from actual text to avoid tokenizer truncation issues
            lastEntity.word = text.slice(lastEntity.start, lastEntity.end);
            lastEntity.score = Math.min(lastEntity.score, entity.score);
        }
        // Otherwise start a new entity (but skip orphaned subword tokens tagged as non-entities)
        else {
            const isNonEntity = currentType === 'O' || currentType === 'UNKNOWN';
            // Skip non-entity tokens unless they merged into a previous entity
            if (isNonEntity) {
                continue;
            }
            aggregatedEntities.push({
                ...entity,
                // Use actual text from positions to avoid tokenizer truncation
                word: text.slice(entity.start, entity.end)
            });
        }
    }

    return aggregatedEntities;
}

/**
 * Remove overlapping entities, keeping the highest confidence one
 * @param {Array} entities - Sorted entities by start position
 * @returns {Array} Non-overlapping entities
 */
function removeOverlappingEntities(entities) {
    const sorted = [...entities].sort((a, b) => a.start - b.start);
    const nonOverlapping = [];

    for (const entity of sorted) {
        const lastEntity = nonOverlapping[nonOverlapping.length - 1];
        if (!lastEntity || entity.start >= lastEntity.end) {
            nonOverlapping.push(entity);
        } else if (entity.score > lastEntity.score) {
            // Replace with higher confidence entity if overlapping
            nonOverlapping[nonOverlapping.length - 1] = entity;
        }
    }

    return nonOverlapping;
}

/**
 * Build highlighted HTML text with entity spans
 * @param {string} text - Original text
 * @param {Array} entities - Non-overlapping entities
 * @returns {string} HTML string with highlighted entities
 */
function buildHighlightedText(text, entities) {
    const sorted = [...entities].sort((a, b) => a.start - b.start);
    let highlighted = '';
    let lastEnd = 0;

    for (const entity of sorted) {
        const entityType = entity.entity_group.replace('B-', '').replace('I-', '');

        // Add text before this entity
        highlighted += escapeHtml(text.slice(lastEnd, entity.start));

        // Add the entity span
        highlighted += `<span class="entity entity-${entityType}" title="${entityType}: ${(entity.score * 100).toFixed(1)}% confidence">${escapeHtml(text.slice(entity.start, entity.end))}</span>`;

        lastEnd = entity.end;
    }

    // Add remaining text after last entity
    highlighted += escapeHtml(text.slice(lastEnd));

    return highlighted;
}

/**
 * Generate redacted text with person names replaced by PERSON_X labels
 * @param {string} text - Original text
 * @param {Array} entities - Processed entities
 * @returns {{redactedText: string, mapping: Array<{original: string, redacted: string}>}} Redacted text and name mapping
 */
function generateRedactedText(text, entities) {
    // Filter to only PER (person) entities
    const personEntities = entities.filter(e => {
        const type = e.entity_group.replace('B-', '').replace('I-', '');
        return type === 'PER';
    });

    if (personEntities.length === 0) {
        return {
            redactedText: text,
            mapping: []
        };
    }

    // Sort by position for consistent processing
    const sorted = [...personEntities].sort((a, b) => a.start - b.start);

    // Build mapping of unique person names to PERSON_X labels (case-insensitive)
    const nameToRedaction = new Map();
    const normalizedToOriginal = new Map();
    let redactionCounter = 1;

    for (const entity of sorted) {
        const name = text.slice(entity.start, entity.end);
        const normalizedName = name.toLowerCase();
        if (!nameToRedaction.has(normalizedName)) {
            nameToRedaction.set(normalizedName, `PERSON_${redactionCounter}`);
            normalizedToOriginal.set(normalizedName, name);
            redactionCounter++;
        }
    }

    // Remove overlapping entities (keep first occurrence)
    const nonOverlapping = [];
    for (const entity of sorted) {
        const lastEntity = nonOverlapping[nonOverlapping.length - 1];
        if (!lastEntity || entity.start >= lastEntity.end) {
            nonOverlapping.push(entity);
        }
    }

    // Build redacted text
    let redactedText = '';
    let lastEnd = 0;

    for (const entity of nonOverlapping) {
        const name = text.slice(entity.start, entity.end);
        const normalizedName = name.toLowerCase();
        const redactionLabel = nameToRedaction.get(normalizedName);

        // Add text before this entity
        redactedText += text.slice(lastEnd, entity.start);

        // Add the redaction label
        redactedText += `[${redactionLabel}]`;

        lastEnd = entity.end;
    }

    // Add remaining text after last entity
    redactedText += text.slice(lastEnd);

    // Build mapping array
    const mapping = Array.from(nameToRedaction.entries()).map(([normalizedName, label]) => ({
        original: normalizedToOriginal.get(normalizedName),
        redacted: label
    }));

    return { redactedText, mapping };
}

/**
 * Full NER processing pipeline: process raw entities, aggregate, and remove overlaps
 * @param {string} text - Original input text
 * @param {Array} rawEntities - Raw entities from NER model
 * @returns {Array} Final processed entities
 */
function processNERResults(text, rawEntities) {
    const processed = processEntities(text, rawEntities);
    const aggregated = aggregateEntities(text, processed);
    return removeOverlappingEntities(aggregated);
}

// ES module exports (works in both browser and Node.js with ESM)
export {
    splitIntoChunks,
    escapeHtml,
    getTypeName,
    processEntities,
    aggregateEntities,
    removeOverlappingEntities,
    buildHighlightedText,
    generateRedactedText,
    processNERResults,
    PIPELINE_OPTIONS
};
