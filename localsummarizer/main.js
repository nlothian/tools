// =========================================================================
// Configuration
// =========================================================================
const CONFIG = {
  // Context window management (Qwen3-0.6B has ~32K context)
  // WebGPU logits tensor: [1, seq_len, 151936] must fit in GPU memory
  // At ~13K tokens, tensor is ~4GB which exceeds WebGPU limits
  CONTEXT_WINDOW: 32000,
  MAX_INPUT_TOKENS: 8000,       // Safe limit for WebGPU memory constraints
  CHARS_PER_TOKEN: 4,           // Estimation heuristic

  // Generation
  MAX_NEW_TOKENS: 10000,
  TEMPERATURE: 0.7,
  TOP_K: 20,
};

// Derived value
CONFIG.MAX_INPUT_CHARS = CONFIG.MAX_INPUT_TOKENS * CONFIG.CHARS_PER_TOKEN;

// =========================================================================
// State
// =========================================================================
let state = {
  status: 'initializing', // initializing, webgpu-error, ready-to-load, loading, ready, processing, complete
  worker: null,
  finalOutput: '',
  tokenizer: null,
  tokenizerReady: false,
  // Thinking state (for Qwen's <think>...</think> blocks)
  thinkingContent: '',
  summaryContent: '',
  isInsideThinkBlock: false,
  // WebGPU preference (persisted to localStorage)
  useWebGPU: localStorage.getItem('useWebGPU') !== 'false', // default true
};

// =========================================================================
// Tokenizer Initialization
// =========================================================================
async function initTokenizer() {
  try {
    const { Tiktoken } = await import("https://esm.sh/js-tiktoken@1.0.12/lite");
    const res = await fetch("https://tiktoken.pages.dev/js/o200k_base.json");
    const o200k_base = await res.json();
    state.tokenizer = new Tiktoken(o200k_base);
    state.tokenizerReady = true;
  } catch (e) {
    console.warn("Failed to load tiktoken, using character estimation:", e);
    state.tokenizerReady = false;
  }
}

function countTokens(text) {
  if (state.tokenizerReady && state.tokenizer) {
    return { count: state.tokenizer.encode(text).length, estimated: false };
  }
  return { count: Math.ceil(text.length / CONFIG.CHARS_PER_TOKEN), estimated: true };
}

// =========================================================================
// DOM Elements
// =========================================================================
const elements = {
  statusBadge: document.getElementById('status-badge'),
  statusText: document.getElementById('status-text'),
  webgpuError: document.getElementById('webgpu-error'),
  contextError: document.getElementById('context-error'),
  contextErrorMessage: document.getElementById('context-error-message'),
  transcriptInput: document.getElementById('transcript-input'),
  tokenCount: document.getElementById('token-count'),
  fileUpload: document.getElementById('file-upload'),
  summarizeBtn: document.getElementById('summarize-btn'),
  stopBtn: document.getElementById('stop-btn'),
  outputSection: document.getElementById('output-section'),
  summaryOutput: document.getElementById('summary-output'),
  streamingSection: document.getElementById('streaming-section'),
  streamingOutput: document.getElementById('streaming-output'),
  tpsDisplay: document.getElementById('tps-display'),
  loadingSection: document.getElementById('loading-section'),
  loadingMessage: document.getElementById('loading-message'),
  progressContainer: document.getElementById('progress-container'),
  loadModelBtn: document.getElementById('load-model-btn'),
  statsSection: document.getElementById('stats-section'),
  copyBtn: document.getElementById('copy-btn'),
  downloadBtn: document.getElementById('download-btn'),
  // Thinking section elements
  thinkingSection: document.getElementById('thinking-section'),
  thinkingToggle: document.getElementById('thinking-toggle'),
  thinkingChevron: document.getElementById('thinking-chevron'),
  thinkingStatus: document.getElementById('thinking-status'),
  thinkingContent: document.getElementById('thinking-content'),
  thinkingOutput: document.getElementById('thinking-output'),
  // WebGPU toggle
  webgpuToggle: document.getElementById('webgpu-toggle'),
};

// =========================================================================
// UI Updates
// =========================================================================
function updateStatus(status, text) {
  state.status = status;
  elements.statusText.textContent = text;

  // Update status dot color
  const dot = elements.statusBadge.querySelector('span:first-child');
  dot.className = 'w-2 h-2 rounded-full';

  switch (status) {
    case 'ready':
      dot.classList.add('bg-sol-green');
      break;
    case 'processing':
      dot.classList.add('bg-sol-cyan', 'animate-[pulse-glow_2s_infinite]');
      break;
    case 'loading':
      dot.classList.add('bg-sol-yellow');
      break;
    case 'webgpu-error':
      dot.classList.add('bg-sol-red');
      break;
    default:
      dot.classList.add('bg-base-1');
  }

  // Disable WebGPU toggle while loading or processing
  elements.webgpuToggle.disabled = status === 'loading' || status === 'processing';

  // Update button states
  elements.summarizeBtn.disabled = status !== 'ready' || !elements.transcriptInput.value.trim();
}

let tokenCountTimeout = null;

function updateTokenCount() {
  clearTimeout(tokenCountTimeout);

  tokenCountTimeout = setTimeout(() => {
    const text = elements.transcriptInput.value;
    const { count, estimated } = countTokens(text);

    // Update display
    const limitText = `${count.toLocaleString()} / ${CONFIG.MAX_INPUT_TOKENS.toLocaleString()} tokens`;
    const estimateIndicator = estimated ? ' (est.)' : '';
    elements.tokenCount.textContent = limitText + estimateIndicator;

    // Color coding based on usage
    elements.tokenCount.classList.remove('text-base-1', 'text-sol-yellow', 'text-sol-red');

    if (count > CONFIG.MAX_INPUT_TOKENS) {
      elements.tokenCount.classList.add('text-sol-red');
    } else if (count > CONFIG.MAX_INPUT_TOKENS * 0.8) {
      elements.tokenCount.classList.add('text-sol-yellow');
    } else {
      elements.tokenCount.classList.add('text-base-1');
    }

    // Update button state
    elements.summarizeBtn.disabled = state.status !== 'ready' || count === 0 || count > CONFIG.MAX_INPUT_TOKENS;

    // Show/hide context error
    if (count > CONFIG.MAX_INPUT_TOKENS) {
      elements.contextError.classList.remove('hidden');
      elements.contextErrorMessage.textContent =
        `Your transcript has ${count.toLocaleString()} tokens, which exceeds the ${CONFIG.MAX_INPUT_TOKENS.toLocaleString()} token limit. Please shorten it or split into smaller sections.`;
    } else {
      elements.contextError.classList.add('hidden');
    }
  }, 300); // Debounce 300ms
}

// =========================================================================
// Prompt Builder
// =========================================================================
function buildPrompt(text) {
  // Note: token validation happens before this function is called
  return `Summarize the following transcript into a comprehensive summary of the conversation. It should be divided into a number of high level topics, with important points as bullet points under each one.

Carefully look for tasks to be completed and be sure to summarize them into a "Next Steps" section

Transcript:
---
${text}
---`;
}

function countTopicsInOutput(text) {
  const matches = text.match(/^## /gm);
  return matches ? matches.length : 0;
}

// =========================================================================
// Think Tag Parser (for Qwen's <think>...</think> blocks)
// =========================================================================
function parseThinkContent(fullText) {
  // Check if it starts with <think>
  if (!fullText.startsWith('<think>')) {
    return { thinking: '', summary: fullText, isInsideThink: false };
  }

  // Remove the opening <think> tag
  const afterOpen = fullText.slice('<think>'.length);

  // Check for closing </think> tag
  const closeIndex = afterOpen.indexOf('</think>');

  if (closeIndex === -1) {
    // No closing tag yet - still inside think block
    return {
      thinking: afterOpen.trim(),
      summary: '',
      isInsideThink: true
    };
  }

  // Has closing tag - split into thinking and summary
  return {
    thinking: afterOpen.slice(0, closeIndex).trim(),
    summary: afterOpen.slice(closeIndex + '</think>'.length).trim(),
    isInsideThink: false
  };
}

// =========================================================================
// Thinking Section UI
// =========================================================================
function updateThinkingUI(thinking, isComplete) {
  if (thinking) {
    elements.thinkingSection.classList.remove('hidden');
    elements.thinkingOutput.textContent = thinking;

    if (isComplete) {
      elements.thinkingStatus.textContent = '(complete)';
      collapseThinking();
    } else {
      elements.thinkingStatus.textContent = '(reasoning...)';
      expandThinking();
    }
  }
}

function expandThinking() {
  elements.thinkingContent.classList.remove('hidden');
  elements.thinkingChevron.classList.add('expanded');
}

function collapseThinking() {
  elements.thinkingContent.classList.add('hidden');
  elements.thinkingChevron.classList.remove('expanded');
}

function toggleThinking() {
  elements.thinkingContent.classList.toggle('hidden');
  elements.thinkingChevron.classList.toggle('expanded');
}

// =========================================================================
// Worker Communication
// =========================================================================
let generateResolve = null;

function initWorker() {
  state.worker = new Worker('./summary-worker.js?v=' + Date.now(), { type: 'module' });

  // Initialize checkbox from state
  elements.webgpuToggle.checked = state.useWebGPU;

  state.worker.addEventListener('message', (e) => {
    const { status, nodeId, output, tps, numTokens, data, file, name, loaded, total } = e.data;

    switch (status) {
      case 'webgpu-ok':
        updateStatus('loading', 'Loading model (WebGPU)...');
        elements.loadModelBtn.classList.add('hidden');
        loadModel();
        break;

      case 'wasm-ok':
        updateStatus('loading', 'Loading model (CPU/WASM)...');
        elements.loadModelBtn.classList.add('hidden');
        loadModel();
        break;

      case 'loading':
        updateStatus('loading', data);
        elements.loadingMessage.textContent = data;
        elements.loadModelBtn.classList.add('hidden');
        break;

      case 'initiate':
      case 'progress':
        // Track download progress
        const fileName = file || name;
        const existing = Array.from(elements.progressContainer.children).find(
          el => el.dataset.file === fileName
        );

        // Check if loaded from cache (loads instantly with loaded === total)
        const isCached = status === 'progress' && loaded === total && total > 0;

        if (!existing) {
          const div = document.createElement('div');
          div.dataset.file = fileName;
          div.className = 'text-xs';
          div.innerHTML = `
            <div class="flex justify-between mb-1">
              <span class="truncate max-w-[200px]">${fileName}</span>
              <span class="progress-pct">${isCached ? 'cached' : '0%'}</span>
            </div>
            <div class="h-1 bg-base-3 rounded overflow-hidden">
              <div class="progress-bar h-full ${isCached ? 'bg-sol-green' : 'bg-sol-cyan'} transition-all" style="width: ${isCached ? '100' : '0'}%"></div>
            </div>
          `;
          elements.progressContainer.appendChild(div);
        }

        const container = elements.progressContainer.querySelector(`[data-file="${fileName}"]`);
        if (container && loaded !== undefined && total !== undefined) {
          const pct = Math.round((loaded / total) * 100);
          const cachedNow = loaded === total && total > 0;
          container.querySelector('.progress-pct').textContent = cachedNow ? 'cached' : `${pct}%`;
          container.querySelector('.progress-bar').style.width = `${pct}%`;
          if (cachedNow) {
            container.querySelector('.progress-bar').classList.replace('bg-sol-cyan', 'bg-sol-green');
          }
        }
        break;

      case 'done':
        const doneEl = elements.progressContainer.querySelector(`[data-file="${file || name}"]`);
        if (doneEl) doneEl.remove();
        break;

      case 'ready':
        updateStatus('ready', 'Ready');
        const modeLabel = state.useWebGPU ? 'WebGPU' : 'CPU';
        elements.loadingMessage.textContent = `Model loaded (${modeLabel})`;
        elements.progressContainer.innerHTML = '';
        break;

      case 'start':
        elements.streamingOutput.textContent = '';
        break;

      case 'update':
        // Parse think tags from accumulated output
        const { thinking, summary, isInsideThink } = parseThinkContent(output);
        // Debug: log first 100 chars to see if think tags are present
        if (output.length < 50) console.log('Output start:', JSON.stringify(output));

        state.thinkingContent = thinking;
        state.summaryContent = summary;
        state.isInsideThinkBlock = isInsideThink;

        // Update thinking section
        const thinkingComplete = !isInsideThink && thinking.length > 0;
        updateThinkingUI(thinking, thinkingComplete);

        // Update streaming output - only show summary content, not thinking
        if (isInsideThink) {
          // Still in thinking phase - show placeholder in streaming area
          elements.streamingOutput.textContent = '';
        } else {
          // Show summary content only
          elements.streamingOutput.textContent = summary;
        }

        if (tps) {
          elements.tpsDisplay.textContent = `${tps.toFixed(1)} tokens/sec`;
        }
        break;

      case 'complete':
        if (generateResolve) {
          const finalParsed = parseThinkContent(output);
          state.thinkingContent = finalParsed.thinking;
          generateResolve(finalParsed.summary || output);
          generateResolve = null;
        }
        break;

      case 'error':
        console.error('Worker error:', data, 'Type:', e.data.errorType);
        const errorType = e.data.errorType;

        if (errorType === 'context-limit') {
          // Show context-specific error, not WebGPU error
          elements.contextError.classList.remove('hidden');
          elements.contextErrorMessage.textContent = data;
          updateStatus('ready', 'Ready');
        } else if (data.includes('WebGPU is not supported')) {
          // Only show WebGPU error for actual browser compatibility issues
          elements.webgpuError.classList.remove('hidden');
          updateStatus('webgpu-error', 'WebGPU Error');
        } else {
          elements.loadingMessage.textContent = `Error: ${data}`;
        }

        if (generateResolve) {
          generateResolve(null);
          generateResolve = null;
        }
        break;
    }
  });

  // Check WebGPU availability or skip if disabled
  if (state.useWebGPU) {
    state.worker.postMessage({ type: 'check' });
  } else {
    elements.loadingMessage.textContent = 'WebGPU disabled, using CPU...';
    state.worker.postMessage({ type: 'check-wasm' });
  }
}

function loadModel() {
  const device = state.useWebGPU ? 'webgpu' : 'wasm';
  state.worker.postMessage({ type: 'load', data: { device } });
}

async function generateSummary(nodeId, prompt) {
  return new Promise((resolve) => {
    generateResolve = resolve;
    state.worker.postMessage({
      type: 'generate',
      data: { nodeId, prompt, maxNewTokens: CONFIG.MAX_NEW_TOKENS },
    });
  });
}

// =========================================================================
// Summarization Pipeline
// =========================================================================
async function processPipeline() {
  const text = elements.transcriptInput.value.trim();
  if (!text) return;

  // Pre-submit token validation
  const { count: tokenCount } = countTokens(text);
  if (tokenCount > CONFIG.MAX_INPUT_TOKENS) {
    elements.contextError.classList.remove('hidden');
    elements.contextErrorMessage.textContent =
      `Cannot summarize: ${tokenCount.toLocaleString()} tokens exceeds the ${CONFIG.MAX_INPUT_TOKENS.toLocaleString()} token limit.`;
    return;
  }

  // Hide any previous context errors
  elements.contextError.classList.add('hidden');

  // Reset thinking state
  elements.thinkingSection.classList.add('hidden');
  state.thinkingContent = '';
  state.summaryContent = '';
  state.isInsideThinkBlock = false;

  // Update UI
  updateStatus('processing', 'Processing...');
  elements.summarizeBtn.classList.add('hidden');
  elements.stopBtn.classList.remove('hidden');
  elements.outputSection.classList.add('hidden');
  elements.streamingSection.classList.remove('hidden');
  elements.statsSection.classList.add('hidden');
  elements.loadingSection.classList.remove('hidden');

  const prompt = buildPrompt(text);
  const output = await generateSummary('summary', prompt);

  if (state.status !== 'processing') {
    resetUI();
    return;
  }

  state.finalOutput = output || '(No summary generated)';

  // Finalize thinking UI
  if (state.thinkingContent) {
    updateThinkingUI(state.thinkingContent, true);
  }

  // Show results
  elements.summaryOutput.innerHTML = marked.parse(state.finalOutput);
  elements.outputSection.classList.remove('hidden');
  elements.streamingSection.classList.add('hidden');
  elements.loadingSection.classList.add('hidden');
  elements.statsSection.classList.remove('hidden');

  const { count: inputTokens } = countTokens(text);
  document.getElementById('stat-tokens').textContent = inputTokens.toLocaleString();
  document.getElementById('stat-chars').textContent = text.length.toLocaleString();
  document.getElementById('stat-topics').textContent = countTopicsInOutput(state.finalOutput);

  // Reset
  updateStatus('ready', 'Ready');
  elements.summarizeBtn.classList.remove('hidden');
  elements.stopBtn.classList.add('hidden');
}

function resetUI() {
  updateStatus('ready', 'Ready');
  elements.summarizeBtn.classList.remove('hidden');
  elements.stopBtn.classList.add('hidden');
  elements.streamingSection.classList.add('hidden');
  // Reset thinking state
  elements.thinkingSection.classList.add('hidden');
  state.thinkingContent = '';
  state.summaryContent = '';
  state.isInsideThinkBlock = false;
  // Show loading section, hide stats
  elements.loadingSection.classList.remove('hidden');
  elements.statsSection.classList.add('hidden');
}

function stopProcessing() {
  state.status = 'ready';
  state.worker.postMessage({ type: 'interrupt' });
  resetUI();
}

// =========================================================================
// Event Handlers
// =========================================================================
elements.transcriptInput.addEventListener('input', updateTokenCount);

elements.fileUpload.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  elements.transcriptInput.value = text;
  updateTokenCount();
});

elements.loadModelBtn.addEventListener('click', loadModel);
elements.summarizeBtn.addEventListener('click', processPipeline);
elements.stopBtn.addEventListener('click', stopProcessing);
elements.thinkingToggle.addEventListener('click', toggleThinking);

// WebGPU toggle - requires page reload to take effect after model is loaded
elements.webgpuToggle.addEventListener('change', (e) => {
  state.useWebGPU = e.target.checked;
  localStorage.setItem('useWebGPU', state.useWebGPU);

  // If model is already loaded/loading, inform user they need to reload
  if (state.status !== 'initializing') {
    if (confirm('Changing this setting requires reloading the page. Reload now?')) {
      window.location.reload();
    } else {
      // Revert checkbox
      e.target.checked = !state.useWebGPU;
      state.useWebGPU = !state.useWebGPU;
      localStorage.setItem('useWebGPU', state.useWebGPU);
    }
  }
});

elements.copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(state.finalOutput);
  elements.copyBtn.textContent = 'Copied!';
  setTimeout(() => elements.copyBtn.textContent = 'Copy', 2000);
});

elements.downloadBtn.addEventListener('click', () => {
  const blob = new Blob([state.finalOutput], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'summary.md';
  a.click();
  URL.revokeObjectURL(url);
});

// =========================================================================
// Initialize
// =========================================================================
initTokenizer().then(() => updateTokenCount());
initWorker();
