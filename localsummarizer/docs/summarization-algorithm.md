# Hierarchical Tree Summarization for Long Transcripts

An algorithm for summarizing transcripts that exceed LLM context windows, producing topic-organized output with 2-5 bullet points per topic.

---

## 1. Core Data Structure

The transcript is represented as a tree where:

- **Leaf nodes** contain raw text chunks that fit within the LLM's context window
- **Internal nodes** contain summaries synthesized from their children
- **Root node** contains the final output

Each node stores:
```
Node {
    text: string           // Raw text (leaves only)
    summary: string        // LLM-generated summary
    topics: string[]       // Extracted topic tags
    children: Node[]       // Child nodes (empty for leaves)
    
    // Boundary context
    first_line: string     // First meaningful line of this subtree's source text
    last_line: string      // Last meaningful line of this subtree's source text
    
    // Position metadata
    char_start: int        // Start position in original transcript
    char_end: int          // End position in original transcript
}
```

---

## 2. Algorithm Overview

```
TREE_SUMMARIZE(transcript, context_window_size):
    1. BUILD tree by recursive splitting until leaves fit in context
    2. SUMMARIZE leaves (bottom-up, parallelizable)
    3. MERGE summaries upward with sibling boundary context
    4. SYNTHESIZE final topic-organized output at root
```

---

## 3. Phase 1: Tree Construction

### 3.1 Recursive Splitting

```
BUILD_TREE(text, depth=0):
    IF estimate_tokens(text) <= LEAF_TOKEN_LIMIT:
        RETURN create_leaf_node(text, depth)
    
    chunks = SPLIT_WITH_OVERLAP(text, target_chunks=BRANCHING_FACTOR)
    children = [BUILD_TREE(chunk, depth+1) FOR chunk IN chunks]
    
    RETURN create_internal_node(children, depth)
```

### 3.2 Key Parameters

| Parameter | Recommended Value | Purpose |
|-----------|------------------|---------|
| `LEAF_TOKEN_LIMIT` | 60-70% of context window | Leave room for prompt + output |
| `BRANCHING_FACTOR` | 3-5 | Children per internal node |
| `OVERLAP_RATIO` | 5-10% of chunk size | Redundancy at boundaries |

### 3.3 Splitting Strategy: Natural Breaks

Never split mid-sentence or mid-speaker-turn. Priority order for break points:

1. **Paragraph breaks** (`\n\n`)
2. **Speaker turns** (line starting with `Name:` pattern)
3. **Sentence boundaries** (`. ` or `? ` or `! `)
4. **Clause boundaries** (`, ` or `; `)
5. **Word boundaries** (whitespace) — last resort

```
FIND_BREAK_POINT(text, target_position, search_window=500):
    search_region = text[target - window : target + window]
    
    FOR pattern IN [paragraph, speaker_turn, sentence, clause, word]:
        matches = find_all(pattern, search_region)
        IF matches:
            RETURN closest_match_to(target_position)
    
    RETURN target_position  // fallback
```

### 3.4 Overlap Handling

Overlapping chunks share text at boundaries. This is intentional—it provides redundancy so information at boundaries isn't lost.

```
SPLIT_WITH_OVERLAP(text, target_chunks):
    chunk_size = len(text) / target_chunks
    overlap = chunk_size * OVERLAP_RATIO
    
    chunks = []
    position = 0
    
    WHILE position < len(text):
        end = position + chunk_size + overlap
        break_point = FIND_BREAK_POINT(text, end)
        
        chunks.append(text[position : break_point])
        position = break_point - overlap  // Start next chunk with overlap
    
    RETURN chunks
```

**Deduplication:** Overlapping content may produce duplicate information in summaries. This is resolved in the merge phase (Section 5).

---

## 4. Phase 2: Leaf Summarization

Each leaf node is summarized independently. This phase is fully parallelizable.

### 4.1 Leaf Summary Prompt

```
SUMMARIZE_LEAF(node):
    prompt = """
    Summarize this transcript excerpt. Extract:
    
    1. KEY_POINTS: The most important information (3-7 bullets)
    2. TOPICS: Tag each point with a topic label (e.g., "Product Launch", "Q3 Revenue")
    3. ENTITIES: Named people, companies, products mentioned
    4. OPEN_THREADS: Topics that seem incomplete (might continue in adjacent chunks)
    
    Transcript:
    ---
    {node.text}
    ---
    """
    
    response = LLM(prompt)
    node.summary = response.key_points
    node.topics = response.topics
    node.first_line = extract_first_meaningful_line(node.text)
    node.last_line = extract_last_meaningful_line(node.text)
```

### 4.2 Extracting Boundary Lines

"Meaningful" means non-empty, non-boilerplate (skip timestamps, "[inaudible]", etc.)

```
EXTRACT_FIRST_MEANINGFUL_LINE(text):
    FOR line IN text.split('\n'):
        line = line.strip()
        IF line AND NOT is_boilerplate(line):
            RETURN line[:200]  // Truncate for context window efficiency
    RETURN ""
```

---

## 5. Phase 3: Hierarchical Merging

Summaries propagate upward. Each internal node sees only its children's summaries plus boundary context from siblings.

### 5.1 Sibling Boundary Context

When merging children into a parent summary, provide context about what comes before/after each child:

```
         [Parent Node]
              |
    +---------+---------+
    |         |         |
 [Child A] [Child B] [Child C]
 
For Child B, sibling context is:
  - BEFORE: Child A's last_line
  - AFTER: Child C's first_line
```

### 5.2 Merge Algorithm

```
MERGE_CHILDREN(parent_node):
    children = parent_node.children
    
    context_blocks = []
    FOR i, child IN enumerate(children):
        before_context = children[i-1].last_line IF i > 0 ELSE "[START OF TRANSCRIPT]"
        after_context = children[i+1].first_line IF i < len-1 ELSE "[END OF TRANSCRIPT]"
        
        context_blocks.append({
            "summary": child.summary,
            "topics": child.topics,
            "before": before_context,
            "after": after_context,
            "open_threads": child.open_threads
        })
    
    prompt = """
    You are merging summaries of consecutive transcript sections.
    
    For each section, I've provided:
    - The summary from that section
    - The last line of the PREVIOUS section (for continuity)
    - The first line of the NEXT section (for continuity)
    - Any topics that seemed incomplete
    
    Your tasks:
    1. MERGE summaries, removing redundancy from overlapping sections
    2. RESOLVE continuity: if an "open thread" from section N is completed in section N+1, combine them
    3. CONSOLIDATE topics: group related points under consistent topic labels
    4. PRESERVE boundary context: update first_line/last_line to span the full range
    
    Sections:
    {format_context_blocks(context_blocks)}
    """
    
    response = LLM(prompt)
    parent_node.summary = response.merged_summary
    parent_node.topics = response.consolidated_topics
    parent_node.first_line = children[0].first_line
    parent_node.last_line = children[-1].last_line
```

### 5.3 Handling Boundary Conditions

#### Condition 1: Topic spans chunk boundary

**Problem:** A topic starts in Chunk A and concludes in Chunk B.

**Detection:** The leaf summary for Chunk A marks it as an "open thread."

**Resolution:** The merge prompt explicitly instructs the LLM to look for completion of open threads in subsequent summaries and combine them.

```
Example:
  Chunk A summary: "CEO mentioned upcoming product... [INCOMPLETE: product details]"
  Chunk B summary: "...the new AI assistant will launch in Q2 with pricing at $20/mo"
  
  Merged: "CEO announced new AI assistant launching Q2 at $20/mo"
```

#### Condition 2: Duplicate information from overlap

**Problem:** The same information appears in both Chunk A and Chunk B due to intentional overlap.

**Detection:** The merge prompt includes both summaries; LLM naturally deduplicates.

**Resolution:** Explicit instruction to "remove redundancy from overlapping sections."

#### Condition 3: Contradictory information

**Problem:** Due to summarization errors or transcript ambiguity, children contain conflicting claims.

**Detection:** Rare, but can happen with numbers, names, dates.

**Resolution:** The merge prompt should include: "If you find contradictory information, prefer the version with more context or flag the uncertainty."

#### Condition 4: Unbalanced tree (uneven chunk sizes)

**Problem:** Natural break points may produce chunks of varying sizes.

**Detection:** One child has significantly more content than siblings.

**Resolution:** Accept the imbalance. The token budget is per-node, not per-level. Alternatively, rebalance by further splitting oversized chunks.

#### Condition 5: Very short transcript (fits in one chunk)

**Problem:** No tree needed.

**Detection:** `estimate_tokens(transcript) <= LEAF_TOKEN_LIMIT`

**Resolution:** Skip tree construction; directly apply the final synthesis prompt (Section 6).

#### Condition 6: Context window exceeded during merge

**Problem:** Children's summaries + boundary context exceed context window.

**Detection:** `sum(child.summary tokens) + overhead > context_window`

**Resolution:** Either increase branching factor (more, smaller children) or add an intermediate summarization step for oversized children before merging.

---

## 6. Phase 4: Final Synthesis

The root node's summary is transformed into the final topic-organized format.

```
SYNTHESIZE_FINAL(root_node):
    prompt = """
    You have a comprehensive summary of a transcript with topic tags.
    
    Produce the final output as:
    - 3-7 major topics (based on the topic tags, consolidated)
    - 2-5 bullet points per topic
    - Bullets should be concise but information-dense
    - Order topics by importance or chronology (whichever fits better)
    
    Summary:
    {root_node.summary}
    
    Topic tags found:
    {root_node.topics}
    """
    
    RETURN LLM(prompt)
```

---

## 7. Complexity Analysis

| Metric | Value |
|--------|-------|
| Tree depth | O(log_b(N)) where b = branching factor, N = transcript tokens |
| LLM calls | O(N / leaf_size) for leaves + O(N / (leaf_size × b)) for each internal level |
| Total LLM calls | O(N / leaf_size) — dominated by leaf summarization |
| Parallelism | All nodes at same depth can run concurrently |

**Example:** 500k token transcript, 8k leaf size, branching factor 4
- Leaves: ~63 calls (parallelizable)
- Level 1: ~16 calls
- Level 2: ~4 calls
- Level 3: 1 call
- Total: ~84 calls, 4 sequential rounds if fully parallelized

---

## 8. Parameter Tuning Guidelines

### Choosing LEAF_TOKEN_LIMIT

```
LEAF_TOKEN_LIMIT = CONTEXT_WINDOW × 0.65
```

The 65% factor accounts for:
- System prompt (~5%)
- Structured output format (~10%)
- Safety margin (~20%)

### Choosing BRANCHING_FACTOR

| Transcript Length | Recommended Branching Factor |
|-------------------|------------------------------|
| < 100k tokens | 3 |
| 100k - 500k tokens | 4 |
| 500k+ tokens | 5 |

Higher branching = shallower tree = fewer merge rounds = less information loss.

But: higher branching = more children per merge = larger merge prompts.

### Choosing OVERLAP_RATIO

| Content Type | Recommended Overlap |
|--------------|---------------------|
| Structured (clear sections) | 5% |
| Conversational (interviews, meetings) | 10% |
| Dense technical content | 10-15% |

---

## 9. Failure Modes and Mitigations

| Failure Mode | Cause | Mitigation |
|--------------|-------|------------|
| Information loss | Over-aggressive summarization | Increase leaf size; use "preserve specifics" in prompts |
| Incoherent final output | Poor boundary handling | Ensure overlap; add "open threads" tracking |
| Topic fragmentation | Same topic split across chunks | Aggressive topic consolidation in merge phase |
| Hallucinated details | LLM confabulation | Add "only include information explicitly stated" to prompts |
| Excessive cost | Too many LLM calls | Increase leaf size; reduce branching factor |

---

## 10. Extensions

### 10.1 Speaker-Aware Chunking

For multi-speaker transcripts, prefer breaks between speaker turns:
```
FIND_SPEAKER_BREAK(text, target):
    // Pattern: newline followed by "Name:" or "[Name]" or "SPEAKER:"
    speaker_pattern = r'\n(?:[A-Z][a-z]+:|[A-Z]+:|\[[^\]]+\]:?)'
    // Find nearest speaker turn to target
```

### 10.2 Timestamp Preservation

If timestamps matter (e.g., meeting minutes), extract and propagate:
```
Node {
    ...
    time_start: string  // e.g., "00:14:32"
    time_end: string
}
```

### 10.3 Importance Weighting

Not all parts of a transcript are equally important. Add relevance scoring:
```
SUMMARIZE_LEAF(node):
    ...
    // Also extract importance signals
    importance = detect_importance(node.text)  // decisions, action items, conclusions
    node.weight = importance
```

Then during merge, allocate more summary budget to higher-weight children.