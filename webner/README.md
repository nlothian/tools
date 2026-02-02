# WebNER - Browser-Based Named Entity Recognition

A privacy-focused tool that identifies and redacts named entities (people, locations, organizations) in text. The NER model runs entirely in your browser using [Transformers.js](https://huggingface.co/docs/transformers.js) - no data ever leaves your computer.

## Features

- **Named Entity Recognition**: Identifies people, locations, organizations, and miscellaneous entities
- **Person Name Redaction**: Automatically replaces person names with `[PERSON_1]`, `[PERSON_2]`, etc.
- **Privacy-First**: All processing happens locally in your browser
- **File Upload**: Supports `.txt`, `.md`, `.csv`, and `.json` files
- **Export Options**: Copy to clipboard or download redacted text and name mappings
- **Model Caching**: The ~170MB model is cached in your browser after first download

## Usage

### Option 1: Open directly in browserUse my hosted version

[Download `index.html` and `NER.js`, then open `index.html` in your browser.](https://tools.nicklothian.com/webner/index.html)

### Option 2: Serve locally

Download this folder, then:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using Vite (for development)
npm install
npm run dev
```

Then visit `http://localhost:8000` (or the port shown by your server).

### Using the Tool

1. **Input**: Paste text or upload a file in the Input tab
2. **Run NER**: Click "Run NER" (or press Ctrl+Enter)
3. **Output**: View highlighted entities in the Output tab
4. **Redacted**: Get text with person names replaced in the Redacted tab

## Model

Uses [Xenova/bert-base-NER](https://huggingface.co/Xenova/bert-base-NER), a BERT model fine-tuned for Named Entity Recognition. The model recognizes four entity types:

| Type | Description | Color |
|------|-------------|-------|
| PER | Person names | Terracotta |
| LOC | Locations | Green |
| ORG | Organizations | Blue |
| MISC | Miscellaneous | Yellow |

## Project Structure

```
webner/
├── index.html      # Main application UI
├── NER.js          # NER processing utilities (works in browser & Node.js)
├── NER_tests.js    # Test suite
└── package.json    # Node.js configuration
```

## Development

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Run tests
npm test
```

## Technical Notes

- Text is automatically chunked for long documents (BERT has a 512 token limit)
- WordPiece tokenization is handled to reconstruct full names
- The model is cached using the browser's Cache API
- Works offline after the initial model download

## Privacy

This tool is designed with privacy as a core principle:

- The NER model runs entirely in your browser via WebAssembly
- No text is sent to any server
- No analytics or tracking
- Model weights are cached locally after download
