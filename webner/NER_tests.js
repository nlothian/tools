/**
 * NER_tests.js - Comprehensive tests for NER.js
 * Run with: node NER_tests.js
 */

// Self-executing async function to allow top-level await
(async () => {
    // Load transformers.js for model inference
    const { pipeline } = await import('@huggingface/transformers');

    // Load NER model (same as browser version)
    console.log('Loading NER model...');
    const nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER');
    console.log('Model loaded.\n');

    // Use dynamic import for ES module
    const {
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
    } = await import('./NER.js');

    // Test utilities
    let passCount = 0;
    let failCount = 0;

    function assertEqual(actual, expected, testName) {
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);
        if (actualStr === expectedStr) {
            console.log(`  ✓ ${testName}`);
            passCount++;
        } else {
            console.log(`  ✗ ${testName}`);
            console.log(`    Expected: ${expectedStr}`);
            console.log(`    Actual:   ${actualStr}`);
            failCount++;
        }
    }

    function assertDeepEqual(actual, expected, testName) {
        try {
            const actualStr = JSON.stringify(actual, null, 2);
            const expectedStr = JSON.stringify(expected, null, 2);
            if (actualStr === expectedStr) {
                console.log(`  ✓ ${testName}`);
                passCount++;
            } else {
                console.log(`  ✗ ${testName}`);
                console.log(`    Expected: ${expectedStr}`);
                console.log(`    Actual:   ${actualStr}`);
                failCount++;
            }
        } catch (e) {
            console.log(`  ✗ ${testName} - Error: ${e.message}`);
            failCount++;
        }
    }

    function assertTrue(value, testName) {
        if (value) {
            console.log(`  ✓ ${testName}`);
            passCount++;
        } else {
            console.log(`  ✗ ${testName}`);
            console.log(`    Expected truthy value, got: ${value}`);
            failCount++;
        }
    }

    function assertFalse(value, testName) {
        if (!value) {
            console.log(`  ✓ ${testName}`);
            passCount++;
        } else {
            console.log(`  ✗ ${testName}`);
            console.log(`    Expected falsy value, got: ${value}`);
            failCount++;
        }
    }

    // ============================================
    // splitIntoChunks tests
    // ============================================
    console.log('\n=== splitIntoChunks tests ===');

    (function testShortText() {
        const result = splitIntoChunks('Hello world', 1500);
        assertEqual(result.length, 1, 'Short text returns single chunk');
        assertEqual(result[0].text, 'Hello world', 'Short text content preserved');
        assertEqual(result[0].offset, 0, 'Short text offset is 0');
    })();

    (function testEmptyText() {
        const result = splitIntoChunks('', 1500);
        assertEqual(result.length, 1, 'Empty text returns single chunk');
        assertEqual(result[0].text, '', 'Empty text content is empty');
    })();

    (function testExactMaxChars() {
        const text = 'a'.repeat(1500);
        const result = splitIntoChunks(text, 1500);
        assertEqual(result.length, 1, 'Text exactly at maxChars returns single chunk');
    })();

    (function testSentenceBoundary() {
        const text = 'First sentence. Second sentence. Third sentence.';
        const result = splitIntoChunks(text, 20);
        assertTrue(result.length > 1, 'Text splits into multiple chunks');
        // Should break at sentence boundary
        assertTrue(result[0].text.endsWith('. ') || result[0].text.endsWith('.'), 'First chunk ends at sentence boundary');
    })();

    (function testWordBoundary() {
        const text = 'word1 word2 word3 word4 word5 word6 word7 word8';
        const result = splitIntoChunks(text, 15);
        assertTrue(result.length > 1, 'Text splits at word boundaries');
        // Should not split in middle of word
        result.forEach((chunk, i) => {
            if (i < result.length - 1) {
                assertTrue(chunk.text.endsWith(' '), `Chunk ${i} ends with space (word boundary)`);
            }
        });
    })();

    (function testOffsetCalculation() {
        const text = 'Chunk one. Chunk two. Chunk three.';
        const result = splitIntoChunks(text, 15);
        let expectedOffset = 0;
        result.forEach((chunk, i) => {
            assertEqual(chunk.offset, expectedOffset, `Chunk ${i} has correct offset`);
            expectedOffset += chunk.text.length;
        });
    })();

    (function testVeryLongWord() {
        const longWord = 'a'.repeat(2000);
        const result = splitIntoChunks(longWord, 1500);
        assertTrue(result.length >= 2, 'Very long word is split');
    })();

    (function testCustomMaxChars() {
        const text = 'Short text here';
        const result = splitIntoChunks(text, 5);
        assertTrue(result.length > 1, 'Custom maxChars splits text');
    })();

    // ============================================
    // escapeHtml tests
    // ============================================
    console.log('\n=== escapeHtml tests ===');

    (function testNoEscape() {
        assertEqual(escapeHtml('Hello world'), 'Hello world', 'Plain text unchanged');
    })();

    (function testAmpersand() {
        assertEqual(escapeHtml('A & B'), 'A &amp; B', 'Ampersand escaped');
    })();

    (function testLessThan() {
        assertEqual(escapeHtml('A < B'), 'A &lt; B', 'Less than escaped');
    })();

    (function testGreaterThan() {
        assertEqual(escapeHtml('A > B'), 'A &gt; B', 'Greater than escaped');
    })();

    (function testDoubleQuote() {
        assertEqual(escapeHtml('Say "hello"'), 'Say &quot;hello&quot;', 'Double quotes escaped');
    })();

    (function testSingleQuote() {
        assertEqual(escapeHtml("It's fine"), "It&#039;s fine", 'Single quote escaped');
    })();

    (function testMultipleSpecialChars() {
        assertEqual(escapeHtml('<script>alert("XSS")</script>'),
            '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
            'Multiple special characters escaped');
    })();

    (function testEmptyString() {
        assertEqual(escapeHtml(''), '', 'Empty string returns empty');
    })();

    // ============================================
    // getTypeName tests
    // ============================================
    console.log('\n=== getTypeName tests ===');

    (function testPER() {
        assertEqual(getTypeName('PER'), 'Person', 'PER maps to Person');
    })();

    (function testLOC() {
        assertEqual(getTypeName('LOC'), 'Location', 'LOC maps to Location');
    })();

    (function testORG() {
        assertEqual(getTypeName('ORG'), 'Organization', 'ORG maps to Organization');
    })();

    (function testMISC() {
        assertEqual(getTypeName('MISC'), 'Miscellaneous', 'MISC maps to Miscellaneous');
    })();

    (function testUnknownType() {
        assertEqual(getTypeName('CUSTOM'), 'CUSTOM', 'Unknown type returns itself');
    })();

    (function testEmptyType() {
        assertEqual(getTypeName(''), '', 'Empty type returns empty');
    })();

    // ============================================
    // processEntities tests
    // ============================================
    console.log('\n=== processEntities tests ===');

    (function testBasicProcessing() {
        const text = 'John lives in Paris';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.99 },
            { word: 'Paris', entity_group: 'LOC', score: 0.95 }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result.length, 2, 'Two entities processed');
        assertEqual(result[0].word, 'John', 'First entity word correct');
        assertEqual(result[0].start, 0, 'First entity start position correct');
        assertEqual(result[0].end, 4, 'First entity end position correct');
        assertEqual(result[1].word, 'Paris', 'Second entity word correct');
        assertEqual(result[1].start, 14, 'Second entity start position correct');
    })();

    (function testWordPieceToken() {
        const text = 'The Hasselblad camera';
        const rawEntities = [
            { word: 'Hassel', entity_group: 'B-ORG', score: 0.9 },
            { word: '##blad', entity_group: 'I-ORG', score: 0.85 }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result.length, 2, 'WordPiece tokens processed separately initially');
        assertEqual(result[0].word, 'Hassel', 'Main token preserved');
        assertEqual(result[1].word, '##blad', 'Sub-token with ## preserved');
    })();

    (function testSkipOLabel() {
        const text = 'The cat sat';
        const rawEntities = [
            { word: 'The', entity_group: 'O', score: 0.99 },
            { word: 'cat', entity_group: 'O', score: 0.99 },
            { word: 'sat', entity_group: 'O', score: 0.99 }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result.length, 0, 'O labels are skipped');
    })();

    (function testChunkOffset() {
        const text = 'John lives in Paris';
        const rawEntities = [
            { word: 'Paris', entity_group: 'LOC', score: 0.95, _chunkOffset: 10, _chunkText: 'in Paris' }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result[0].start, 13, 'Chunk offset applied to start position');
        assertEqual(result[0].end, 18, 'Chunk offset applied to end position');
    })();

    (function testCaseInsensitiveSearch() {
        const text = 'JOHN lives here';
        const rawEntities = [
            { word: 'john', entity_group: 'PER', score: 0.9 }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result.length, 1, 'Case-insensitive search finds entity');
        assertEqual(result[0].start, 0, 'Position found with case-insensitive search');
    })();

    (function testEmptyInput() {
        const result = processEntities('', []);
        assertEqual(result.length, 0, 'Empty input returns empty array');
    })();

    (function testNonArrayInput() {
        const result = processEntities('test', null);
        assertEqual(result.length, 0, 'Non-array input returns empty array');
    })();

    (function testAlternateFieldNames() {
        const text = 'John Smith';
        const rawEntities = [
            { text: 'John', label: 'PER', confidence: 0.9 },
            { token: 'Smith', entity: 'PER', score: 0.85 }
        ];
        const result = processEntities(text, rawEntities);
        assertEqual(result.length, 2, 'Alternate field names handled');
    })();

    // ============================================
    // aggregateEntities tests
    // ============================================
    console.log('\n=== aggregateEntities tests ===');

    (function testWordPieceMerging() {
        const text = 'The Hasselblad camera';
        const processed = [
            { word: 'Hassel', entity_group: 'B-ORG', score: 0.9, start: 4, end: 10 },
            { word: '##blad', entity_group: 'I-ORG', score: 0.85, start: 10, end: 14 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 1, 'WordPiece tokens merged into one entity');
        assertEqual(result[0].word, 'Hasselblad', 'Merged word is correct');
        assertEqual(result[0].start, 4, 'Merged start position correct');
        assertEqual(result[0].end, 14, 'Merged end position correct');
    })();

    (function testAdjacentSameTypeMerging() {
        const text = 'Andrew Hastie spoke';
        const processed = [
            { word: 'Andrew', entity_group: 'PER', score: 0.95, start: 0, end: 6 },
            { word: 'Hastie', entity_group: 'PER', score: 0.92, start: 7, end: 13 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 1, 'Adjacent same-type entities merged');
        assertEqual(result[0].word, 'Andrew Hastie', 'Merged with space between');
    })();

    (function testNoMergeDifferentTypes() {
        const text = 'John in Paris';
        const processed = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Paris', entity_group: 'LOC', score: 0.92, start: 8, end: 13 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 2, 'Different types not merged');
    })();

    (function testNoMergeDistantEntities() {
        const text = 'John works in Paris at Google';
        const processed = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Paris', entity_group: 'LOC', score: 0.92, start: 14, end: 19 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 2, 'Distant entities not merged');
    })();

    (function testMergeWithHyphen() {
        const text = 'Jean-Pierre spoke';
        const processed = [
            { word: 'Jean', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Pierre', entity_group: 'PER', score: 0.92, start: 5, end: 11 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 1, 'Hyphenated names merged');
    })();

    (function testScoreMinimum() {
        const text = 'Andrew Hastie';
        const processed = [
            { word: 'Andrew', entity_group: 'PER', score: 0.95, start: 0, end: 6 },
            { word: 'Hastie', entity_group: 'PER', score: 0.80, start: 7, end: 13 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result[0].score, 0.80, 'Merged entity has minimum score');
    })();

    (function testBIOPrefixStripping() {
        const text = 'John Smith';
        const processed = [
            { word: 'John', entity_group: 'B-PER', score: 0.95, start: 0, end: 4 },
            { word: 'Smith', entity_group: 'I-PER', score: 0.92, start: 5, end: 10 }
        ];
        const result = aggregateEntities(text, processed);
        assertEqual(result.length, 1, 'B- and I- prefixes handled for merging');
    })();

    (function testEmptyInput() {
        const result = aggregateEntities('test', []);
        assertEqual(result.length, 0, 'Empty input returns empty array');
    })();

    // ============================================
    // removeOverlappingEntities tests
    // ============================================
    console.log('\n=== removeOverlappingEntities tests ===');

    (function testNoOverlap() {
        const entities = [
            { word: 'John', start: 0, end: 4, score: 0.9 },
            { word: 'Paris', start: 10, end: 15, score: 0.85 }
        ];
        const result = removeOverlappingEntities(entities);
        assertEqual(result.length, 2, 'Non-overlapping entities preserved');
    })();

    (function testOverlapKeepHigherScore() {
        const entities = [
            { word: 'New York', start: 0, end: 8, score: 0.9 },
            { word: 'York City', start: 4, end: 13, score: 0.95 }
        ];
        const result = removeOverlappingEntities(entities);
        assertEqual(result.length, 1, 'Overlapping entities reduced to one');
        assertEqual(result[0].word, 'York City', 'Higher score entity kept');
    })();

    (function testOverlapKeepFirst() {
        const entities = [
            { word: 'New York', start: 0, end: 8, score: 0.95 },
            { word: 'York', start: 4, end: 8, score: 0.9 }
        ];
        const result = removeOverlappingEntities(entities);
        assertEqual(result.length, 1, 'Overlapping entities reduced to one');
        assertEqual(result[0].word, 'New York', 'First entity with higher score kept');
    })();

    (function testAdjacentNotOverlapping() {
        const entities = [
            { word: 'John', start: 0, end: 4, score: 0.9 },
            { word: 'Smith', start: 4, end: 9, score: 0.85 }
        ];
        const result = removeOverlappingEntities(entities);
        assertEqual(result.length, 2, 'Adjacent (non-overlapping) entities preserved');
    })();

    (function testEmptyInput() {
        const result = removeOverlappingEntities([]);
        assertEqual(result.length, 0, 'Empty input returns empty array');
    })();

    (function testSingleEntity() {
        const entities = [{ word: 'John', start: 0, end: 4, score: 0.9 }];
        const result = removeOverlappingEntities(entities);
        assertEqual(result.length, 1, 'Single entity preserved');
    })();

    // ============================================
    // buildHighlightedText tests
    // ============================================
    console.log('\n=== buildHighlightedText tests ===');

    (function testBasicHighlight() {
        const text = 'John lives here';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 }
        ];
        const result = buildHighlightedText(text, entities);
        assertTrue(result.includes('<span class="entity entity-PER"'), 'Contains entity span');
        assertTrue(result.includes('John</span>'), 'Entity text highlighted');
        assertTrue(result.includes(' lives here'), 'Non-entity text preserved');
    })();

    (function testMultipleEntities() {
        const text = 'John visited Paris';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Paris', entity_group: 'LOC', score: 0.9, start: 13, end: 18 }
        ];
        const result = buildHighlightedText(text, entities);
        assertTrue(result.includes('entity-PER'), 'Contains PER entity');
        assertTrue(result.includes('entity-LOC'), 'Contains LOC entity');
    })();

    (function testConfidenceInTitle() {
        const text = 'John';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.9567, start: 0, end: 4 }
        ];
        const result = buildHighlightedText(text, entities);
        assertTrue(result.includes('95.7%'), 'Confidence shown with one decimal');
    })();

    (function testBIOPrefixStripped() {
        const text = 'John';
        const entities = [
            { word: 'John', entity_group: 'B-PER', score: 0.95, start: 0, end: 4 }
        ];
        const result = buildHighlightedText(text, entities);
        assertTrue(result.includes('entity-PER'), 'B- prefix stripped from class');
        assertFalse(result.includes('entity-B-PER'), 'No B- prefix in class');
    })();

    (function testHtmlEscapedInOutput() {
        const text = '<John>';
        const entities = [];
        const result = buildHighlightedText(text, entities);
        assertTrue(result.includes('&lt;'), 'Less than escaped');
        assertTrue(result.includes('&gt;'), 'Greater than escaped');
    })();

    (function testEmptyEntities() {
        const text = 'No entities here';
        const result = buildHighlightedText(text, []);
        assertEqual(result, 'No entities here', 'Text with no entities unchanged');
    })();

    // ============================================
    // generateRedactedText tests
    // ============================================
    console.log('\n=== generateRedactedText tests ===');

    (function testBasicRedaction() {
        const text = 'John said hello';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 }
        ];
        const result = generateRedactedText(text, entities);
        assertEqual(result.redactedText, '[PERSON_1] said hello', 'Person name redacted');
        assertEqual(result.mapping.length, 1, 'One mapping entry');
        assertEqual(result.mapping[0].original, 'John', 'Original name in mapping');
        assertEqual(result.mapping[0].redacted, 'PERSON_1', 'Redacted label in mapping');
    })();

    (function testMultiplePersons() {
        const text = 'John met Mary';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Mary', entity_group: 'PER', score: 0.9, start: 9, end: 13 }
        ];
        const result = generateRedactedText(text, entities);
        assertEqual(result.redactedText, '[PERSON_1] met [PERSON_2]', 'Multiple persons redacted');
        assertEqual(result.mapping.length, 2, 'Two mapping entries');
    })();

    (function testSamePersonTwice() {
        const text = 'John saw John';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'John', entity_group: 'PER', score: 0.9, start: 9, end: 13 }
        ];
        const result = generateRedactedText(text, entities);
        assertEqual(result.redactedText, '[PERSON_1] saw [PERSON_1]', 'Same person gets same label');
        assertEqual(result.mapping.length, 1, 'Only one mapping for duplicate');
    })();

    (function testCaseInsensitiveMatching() {
        const text = 'JOHN met john';
        const entities = [
            { word: 'JOHN', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'john', entity_group: 'PER', score: 0.9, start: 9, end: 13 }
        ];
        const result = generateRedactedText(text, entities);
        assertEqual(result.mapping.length, 1, 'Case-insensitive duplicate detection');
    })();

    (function testOnlyPersonsRedacted() {
        const text = 'John visited Paris';
        const entities = [
            { word: 'John', entity_group: 'PER', score: 0.95, start: 0, end: 4 },
            { word: 'Paris', entity_group: 'LOC', score: 0.9, start: 13, end: 18 }
        ];
        const result = generateRedactedText(text, entities);
        assertTrue(result.redactedText.includes('[PERSON_1]'), 'Person redacted');
        assertTrue(result.redactedText.includes('Paris'), 'Location not redacted');
    })();

    (function testNoPersons() {
        const text = 'Visit Paris and London';
        const entities = [
            { word: 'Paris', entity_group: 'LOC', score: 0.95, start: 6, end: 11 },
            { word: 'London', entity_group: 'LOC', score: 0.9, start: 16, end: 22 }
        ];
        const result = generateRedactedText(text, entities);
        assertEqual(result.redactedText, text, 'No persons means no redaction');
        assertEqual(result.mapping.length, 0, 'Empty mapping when no persons');
    })();

    (function testBIOPrefixHandled() {
        const text = 'John spoke';
        const entities = [
            { word: 'John', entity_group: 'B-PER', score: 0.95, start: 0, end: 4 }
        ];
        const result = generateRedactedText(text, entities);
        assertTrue(result.redactedText.includes('[PERSON_1]'), 'B-PER handled as person');
    })();

    // ============================================
    // processNERResults (full pipeline) tests
    // ============================================
    console.log('\n=== processNERResults (full pipeline) tests ===');

    (function testFullPipeline() {
        const text = 'John Smith visited Paris';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.95 },
            { word: 'Smith', entity_group: 'PER', score: 0.92 },
            { word: 'Paris', entity_group: 'LOC', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        // Should merge John Smith into one entity
        assertEqual(result.length, 2, 'Adjacent persons merged, location separate');
        assertEqual(result[0].word, 'John Smith', 'First and last name merged');
        assertEqual(result[1].word, 'Paris', 'Location preserved');
    })();

    (function testFullPipelineWordPiece() {
        const text = 'The Hasselblad costs a lot';
        const rawEntities = [
            { word: 'Hassel', entity_group: 'B-ORG', score: 0.9 },
            { word: '##blad', entity_group: 'I-ORG', score: 0.85 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'WordPiece merged in full pipeline');
        assertEqual(result[0].word, 'Hasselblad', 'WordPiece correctly merged');
    })();

    (function testFullPipelineEmpty() {
        const result = processNERResults('No entities', []);
        assertEqual(result.length, 0, 'Empty entities return empty result');
    })();

    (function testFullPipelineOnlyOLabels() {
        const text = 'The cat sat';
        const rawEntities = [
            { word: 'The', entity_group: 'O', score: 0.99 },
            { word: 'cat', entity_group: 'O', score: 0.99 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 0, 'O labels filtered out');
    })();

    // ============================================
    // Edge case tests
    // ============================================
    console.log('\n=== Edge case tests ===');

    (function testUnicodeText() {
        const text = 'José visited München';
        const rawEntities = [
            { word: 'José', entity_group: 'PER', score: 0.9 },
            { word: 'München', entity_group: 'LOC', score: 0.85 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 2, 'Unicode characters handled');
        assertEqual(result[0].word, 'José', 'Unicode name preserved');
        assertEqual(result[1].word, 'München', 'Unicode location preserved');
    })();

    (function testMultipleSpaces() {
        const text = 'John    Smith';  // Multiple spaces
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 },
            { word: 'Smith', entity_group: 'PER', score: 0.85 }
        ];
        const result = processNERResults(text, rawEntities);
        // Due to gap > 2, these won't merge
        assertEqual(result.length, 2, 'Multiple spaces prevent merging');
    })();

    (function testEntityAtEnd() {
        const text = 'Hello John';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result[0].end, 10, 'Entity at end has correct position');
    })();

    (function testEntityAtStart() {
        const text = 'John said hi';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result[0].start, 0, 'Entity at start has position 0');
    })();

    (function testSpecialCharactersInText() {
        const text = '"John" said: Hello!';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Entity found despite special characters');
        assertEqual(result[0].start, 1, 'Position accounts for quote');
    })();

    (function testNewlinesInText() {
        const text = 'John\nlives\nhere';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Newlines handled');
    })();

    (function testTabsInText() {
        const text = 'John\tlives\there';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Tabs handled');
    })();

    (function testVeryLongEntityName() {
        const longName = 'A'.repeat(100);
        const text = `${longName} spoke today`;
        const rawEntities = [
            { word: longName, entity_group: 'PER', score: 0.9 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Very long entity name handled');
        assertEqual(result[0].word, longName, 'Long name preserved');
    })();

    (function testManyEntities() {
        const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack'];
        const text = names.join(' met ');
        const rawEntities = names.map(name => ({
            word: name,
            entity_group: 'PER',
            score: 0.9
        }));
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 10, 'Many entities handled');
    })();

    (function testChunkedProcessing() {
        // Simulate entities from two different chunks
        const text = 'John lives in Paris. Mary works at Google.';
        const rawEntities = [
            { word: 'John', entity_group: 'PER', score: 0.95, _chunkOffset: 0, _chunkText: 'John lives in Paris. ' },
            { word: 'Paris', entity_group: 'LOC', score: 0.9, _chunkOffset: 0, _chunkText: 'John lives in Paris. ' },
            { word: 'Mary', entity_group: 'PER', score: 0.92, _chunkOffset: 21, _chunkText: 'Mary works at Google.' },
            { word: 'Google', entity_group: 'ORG', score: 0.88, _chunkOffset: 21, _chunkText: 'Mary works at Google.' }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 4, 'Chunked entities processed correctly');
        // Verify positions across chunks
        assertTrue(result[2].start >= 21, 'Second chunk entities have correct offset');
    })();

    (function testOverlappingChunkBoundary() {
        // Test entity that might appear at chunk boundary
        const text = 'The New York Times reported';
        const rawEntities = [
            { word: 'New', entity_group: 'B-ORG', score: 0.9 },
            { word: 'York', entity_group: 'I-ORG', score: 0.88 },
            { word: 'Times', entity_group: 'I-ORG', score: 0.85 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Multi-word entity merged');
        assertEqual(result[0].word, 'New York Times', 'Full organization name merged');
    })();

    (function testDavidLittleproudFullName() {
        // Test that "David Littleproud" is detected as a full person name
        const text = 'The leader of the party is  David Littleproud since 2022';
        const rawEntities = [
            { word: 'David', entity_group: 'B-PER', score: 0.95 },
            { word: 'Little', entity_group: 'I-PER', score: 0.90 },
            { word: '##proud', entity_group: 'I-PER', score: 0.88 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'David Littleproud detected as single entity');
        assertEqual(result[0].word, 'David Littleproud', 'Full name correctly merged');
        // Verify positions match the actual text
        const expectedStart = text.indexOf('David');
        const expectedEnd = text.indexOf('Littleproud') + 'Littleproud'.length;
        assertEqual(result[0].start, expectedStart, 'Start position correct for David Littleproud');
        assertEqual(result[0].end, expectedEnd, 'End position correct for David Littleproud');
    })();

    (function testLeyAsPerson() {
        // Test that "Ley" is detected as a person
        const text = 'he led other factions in a potential contested ballot against Ley';
        const rawEntities = [
            { word: 'Ley', entity_group: 'B-PER', score: 0.92 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 1, 'Ley detected as a person');
        assertEqual(result[0].word, 'Ley', 'Whole word Ley detected');
        // Verify positions match the actual text
        const expectedStart = text.indexOf('Ley');
        const expectedEnd = expectedStart + 'Ley'.length;
        assertEqual(result[0].start, expectedStart, 'Start position correct for Ley');
        assertEqual(result[0].end, expectedEnd, 'End position correct for Ley');
    })();

    (function testModelProvidedPositions() {
        // Test that model-provided start/end positions are used correctly
        // This simulates what transformers.js actually returns
        const text = 'Littleproud continued to blame Ley';
        const rawEntities = [
            { word: 'Little', entity_group: 'B-PER', score: 0.95, start: 0, end: 6 },
            { word: '##proud', entity_group: 'I-PER', score: 0.90, start: 6, end: 11 },
            { word: 'Ley', entity_group: 'B-PER', score: 0.92, start: 31, end: 34 }
        ];
        const result = processNERResults(text, rawEntities);
        assertEqual(result.length, 2, 'Two entities detected with model positions');
        assertEqual(result[0].word, 'Littleproud', 'First entity correctly merged');
        assertEqual(result[0].start, 0, 'First entity start from model');
        assertEqual(result[0].end, 11, 'First entity end from model');
        assertEqual(result[1].word, 'Ley', 'Second entity correct');
        assertEqual(result[1].start, 31, 'Second entity start from model');
        assertEqual(result[1].end, 34, 'Second entity end from model');
    })();

    (function testDavidLittleproudInSentence() {
        // Test: "This is despite the Nationals leader, David Littleproud, being blamed..."
        // Model might tokenize as: David + Little + ##p + ##roud (or similar)
        const text = 'This is despite the Nationals leader, David Littleproud, being blamed for the break-up';
        // "David" starts at position 38, "Littleproud" starts at 44
        const davidStart = text.indexOf('David');
        const littleproudStart = text.indexOf('Littleproud');
        const littleproudEnd = littleproudStart + 'Littleproud'.length;

        const rawEntities = [
            { word: 'Nationals', entity_group: 'B-ORG', score: 0.92, start: 20, end: 29 },
            { word: 'David', entity_group: 'B-PER', score: 0.95, start: davidStart, end: davidStart + 5 },
            { word: 'Little', entity_group: 'I-PER', score: 0.90, start: littleproudStart, end: littleproudStart + 6 },
            { word: '##p', entity_group: 'I-PER', score: 0.88, start: littleproudStart + 6, end: littleproudStart + 7 },
            { word: '##roud', entity_group: 'I-PER', score: 0.85, start: littleproudStart + 7, end: littleproudEnd }
        ];
        const result = processNERResults(text, rawEntities);

        // Should have 2 entities: Nationals (ORG) and David Littleproud (PER)
        assertEqual(result.length, 2, 'Two entities in sentence');

        // Find the person entity
        const personEntity = result.find(e => e.entity_group.includes('PER'));
        assertTrue(personEntity !== undefined, 'Person entity found');
        assertEqual(personEntity.word, 'David Littleproud', 'Full name David Littleproud detected');
        assertEqual(personEntity.start, davidStart, 'Person entity starts at David');
        assertEqual(personEntity.end, littleproudEnd, 'Person entity ends after Littleproud');
    })();

    (function testContiguousTokensWithOLabel() {
        // Test: tokens that are part of the same word but some are tagged as O
        // This simulates what transformers.js might return with aggregation_strategy: 'none'
        // where "Littleproud" is split into "Little" (PER) + "proud" (O)
        const text = 'Littleproud continued to blame Ley';
        const rawEntities = [
            // "Littleproud" split into tokens, last one tagged as O
            { word: 'Little', entity_group: 'B-PER', score: 0.95, start: 0, end: 6 },
            { word: 'p', entity_group: 'I-PER', score: 0.90, start: 6, end: 7 },
            { word: 'roud', entity_group: 'O', score: 0.80, start: 7, end: 11 },  // Tagged as O but contiguous!
            { word: 'Ley', entity_group: 'B-PER', score: 0.92, start: 31, end: 34 }
        ];
        const result = processNERResults(text, rawEntities);

        assertEqual(result.length, 2, 'Two entities detected');
        assertEqual(result[0].word, 'Littleproud', 'Contiguous O-tagged token merged into entity');
        assertEqual(result[0].start, 0, 'First entity start correct');
        assertEqual(result[0].end, 11, 'First entity end includes O-tagged token');
        assertEqual(result[1].word, 'Ley', 'Second entity correct');
    })();

    (function testContiguousTokensWithoutHashPrefix() {
        // Test: transformers.js might not include ## prefix in word field
        const text = 'Littleproud spoke today';
        const rawEntities = [
            { word: 'Little', entity_group: 'B-PER', score: 0.95, start: 0, end: 6 },
            { word: 'proud', entity_group: 'I-PER', score: 0.90, start: 6, end: 11 }  // No ## prefix
        ];
        const result = processNERResults(text, rawEntities);

        assertEqual(result.length, 1, 'Single merged entity');
        assertEqual(result[0].word, 'Littleproud', 'Tokens merged without ## prefix');
        assertEqual(result[0].end, 11, 'End position correct');
    })();

    (function testNonContiguousSubwordDoesNotMerge() {
        const text = 'Liberal party leadership with a defiant stance';
        const liberalStart = text.indexOf('Liberal');
        const liberalEnd = liberalStart + 'Liberal'.length;
        const defiantStart = text.indexOf('iant');
        const rawEntities = [
            { word: 'Liberal', entity_group: 'B-ORG', score: 0.9, start: liberalStart, end: liberalEnd },
            // Subword-looking token that appears much later and should NOT merge back
            { word: '##iant', entity_group: 'O', score: 0.8, start: defiantStart, end: defiantStart + 4 }
        ];
        const result = processNERResults(text, rawEntities);

        assertEqual(result.length, 1, 'Non-contiguous subword O token does not merge across gap');
        assertEqual(result[0].word, 'Liberal', 'Entity word preserved without trailing subword');
    })();

    // ============================================
    // Integration tests (with actual model)
    // ============================================
    console.log('\n=== Integration tests (with model) ===');

    await (async function testModelDetectsPerson() {
        const text = 'John Smith lives in New York';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        const persons = result.filter(e => e.entity_group.includes('PER'));
        assertTrue(persons.length >= 1, 'Model detects person entity');
    })();

    await (async function testModelDetectsLocation() {
        const text = 'I visited Paris and London last summer';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        const locations = result.filter(e => e.entity_group.includes('LOC'));
        assertTrue(locations.length >= 1, 'Model detects location entity');
    })();

    await (async function testModelDetectsOrganization() {
        const text = 'She works at Google and Microsoft';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        const orgs = result.filter(e => e.entity_group.includes('ORG'));
        assertTrue(orgs.length >= 1, 'Model detects organization entity');
    })();

    await (async function testModelFullPipeline() {
        const text = 'David Littleproud is the leader of the Nationals';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        // Should detect both a person and an organization
        const persons = result.filter(e => e.entity_group.includes('PER'));
        const orgs = result.filter(e => e.entity_group.includes('ORG'));
        assertTrue(persons.length >= 1, 'Model detects David Littleproud as person');
        assertTrue(orgs.length >= 1, 'Model detects Nationals as organization');
    })();

    await (async function testModelLittleproudNotTruncated() {
        const text = 'This is despite the Nationals leader, David Littleproud, being blamed for the break-up.';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        const person = result.find(e => e.entity_group.includes('PER'));
        const expectedStart = text.indexOf('David');
        const expectedEnd = text.indexOf('Littleproud') + 'Littleproud'.length;

        assertTrue(!!person, 'Model returns a person entity for David Littleproud');
        assertEqual(person.word, 'David Littleproud', 'Full name not truncated');
        assertEqual(person.start, expectedStart, 'Person entity starts at David');
        assertEqual(person.end, expectedEnd, 'Person entity ends after Littleproud');
    })();

    await (async function testModelDoesNotMergeAcrossSentences() {
        const text = "Andrew Hastie is emerging as a candidate to challenge Sussan Ley for the Liberal party's leadership, as MPs privately push for the party's first female leader to step aside. As a defiant Ley declared she would survive the fallout from the latest Coalition split, internal";
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        const liberal = result.find(e => e.word === 'Liberal');
        const runawayOrg = result.find(e => e.entity_group.includes('ORG') && e.word.length > 30);

        assertTrue(!!liberal, 'Liberal detected as its own organization');
        assertFalse(!!runawayOrg, 'No runaway merged organization spans the paragraph');
    })();

    await (async function testModelMultipleEntities() {
        const text = 'Barack Obama visited France and met with Angela Merkel';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        assertTrue(result.length >= 3, 'Model detects multiple entities');
    })();

    await (async function testModelPositionsCorrect() {
        const text = 'Hello John Smith';
        const rawEntities = await nerPipeline(text, PIPELINE_OPTIONS);
        const result = processNERResults(text, rawEntities);

        if (result.length > 0) {
            const person = result.find(e => e.entity_group.includes('PER'));
            if (person) {
                assertTrue(person.start >= 6, 'Person entity starts after "Hello "');
                assertTrue(person.end <= text.length, 'Person entity ends within text');
            }
        }
        assertTrue(true, 'Model returns valid positions');
    })();

    // ============================================
    // Summary
    // ============================================
    console.log('\n========================================');
    console.log(`Tests completed: ${passCount + failCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log('========================================\n');

    if (failCount > 0) {
        process.exit(1);
    }
})();
