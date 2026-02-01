/**
 * summary-worker.js - Web Worker for Qwen model inference
 * Handles model loading and text generation for transcript summarization
 */

import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1";

const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";
const stopping_criteria = new InterruptableStoppingCriteria();

/**
 * Singleton pattern for model loading
 */
class SummarizationPipeline {
  static tokenizer = null;
  static model = null;
  static currentDevice = null;

  static async getInstance(progress_callback = null, device = "webgpu") {
    // If device changed, we need to reload
    if (this.currentDevice && this.currentDevice !== device) {
      this.tokenizer = null;
      this.model = null;
    }
    this.currentDevice = device;

    this.tokenizer ??= AutoTokenizer.from_pretrained(MODEL_ID, {
      progress_callback,
    });

    const modelOptions = {
      dtype: device === "webgpu" ? "q4f16" : "q4",
      progress_callback,
    };

    // Only set device for WebGPU, WASM is the default
    if (device === "webgpu") {
      modelOptions.device = "webgpu";
    }

    this.model ??= AutoModelForCausalLM.from_pretrained(MODEL_ID, modelOptions);

    return Promise.all([this.tokenizer, this.model]);
  }
}

/**
 * Check WebGPU availability
 */
async function check() {
  try {
    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported by this browser");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
    self.postMessage({ status: "webgpu-ok" });
  } catch (e) {
    self.postMessage({
      status: "error",
      data: e.toString(),
    });
  }
}

/**
 * Load the model with progress reporting
 * @param {string} device - 'webgpu' or 'wasm'
 */
async function load(device = "webgpu") {
  const deviceLabel = device === "webgpu" ? "WebGPU" : "CPU/WASM";
  self.postMessage({
    status: "loading",
    data: `Loading model (${deviceLabel})...`,
  });

  try {
    const [tokenizer, model] = await SummarizationPipeline.getInstance((x) => {
      // Forward progress events to main thread
      self.postMessage(x);
    }, device);

    self.postMessage({
      status: "loading",
      data: "Compiling shaders and warming up model...",
    });

    // Warm up with a short generation
    const inputs = tokenizer("Hello");
    await model.generate({ ...inputs, max_new_tokens: 1 });

    self.postMessage({ status: "ready" });
  } catch (e) {
    console.error('[load] Error:', e);
    console.error('[load] Stack:', e.stack);

    const errorStr = e.toString();
    let errorType = 'unknown';
    let userMessage = errorStr;

    if (errorStr.includes("[WebGPU]") && errorStr.includes("Failed to generate kernel")) {
      // This can be a cache error during loading - suggest clearing cache
      errorType = 'webgpu-cache';
      userMessage = "WebGPU cache error. Please clear site data: DevTools → Application → Storage → Clear site data, then reload.";
    } else if (errorStr.includes("out of memory") || errorStr.includes("OOM")) {
      errorType = 'context-limit';
      userMessage = "WebGPU ran out of memory. The input may be too large.";
    }

    self.postMessage({
      status: "error",
      errorType,
      data: userMessage,
    });
  }
}

/**
 * Generate a summary for a node
 * @param {Object} data - { nodeId, prompt }
 */
async function generate({ nodeId, prompt, maxNewTokens = 2048 }) {
  try {
    const [tokenizer, model] = await SummarizationPipeline.getInstance();

    // Build chat messages - use simple user message format
    const messages = [
      { role: "user", content: prompt }
    ];

    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
      enable_thinking: true,  // Enable Qwen's thinking mode to output <think>...</think>
    });

    // Performance tracking
    let startTime;
    let numTokens = 0;
    let tps;
    let fullOutput = "";

    const token_callback_function = () => {
      startTime ??= performance.now();
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };

    const callback_function = (output) => {
      fullOutput += output;
      self.postMessage({
        status: "update",
        nodeId,
        output: fullOutput,
        tps,
        numTokens,
      });
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    self.postMessage({ status: "start", nodeId });

    const { sequences } = await model.generate({
      ...inputs,
      do_sample: true,
      top_k: 20,
      temperature: 0.3,  // Lower temperature for more reliable extraction
      max_new_tokens: maxNewTokens,
      streamer,
      stopping_criteria,
      return_dict_in_generate: true,
    });

    const decoded = tokenizer.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    // Extract the assistant's response (after the user prompt)
    let output = decoded[0];
    // The decoded output includes the full conversation, extract just the response
    const assistantMarker = "assistant\n";
    const lastAssistantIndex = output.lastIndexOf(assistantMarker);
    if (lastAssistantIndex !== -1) {
      output = output.slice(lastAssistantIndex + assistantMarker.length).trim();
    }

    self.postMessage({
      status: "complete",
      nodeId,
      output,
      tps,
      numTokens,
    });
  } catch (e) {
    console.error('[generate] Error:', e);
    console.error('[generate] Stack:', e.stack);

    const errorStr = e.toString();
    let errorType = 'unknown';
    let userMessage = errorStr;

    if (errorStr.includes("[WebGPU]") && errorStr.includes("Failed to generate kernel")) {
      errorType = 'context-limit';
      userMessage = "The input is too long for WebGPU to process. Please reduce the transcript length.";
    } else if (errorStr.includes("out of memory") || errorStr.includes("OOM")) {
      errorType = 'context-limit';
      userMessage = "WebGPU ran out of memory. Please reduce the transcript length.";
    }

    self.postMessage({
      status: "error",
      errorType,
      nodeId,
      data: userMessage,
    });
  }
}

/**
 * Handle messages from main thread
 */
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "check":
      check();
      break;

    case "check-wasm":
      // WASM is always available, no check needed
      self.postMessage({ status: "wasm-ok" });
      break;

    case "load":
      load(data?.device || "webgpu");
      break;

    case "generate":
      stopping_criteria.reset();
      generate(data);
      break;

    case "interrupt":
      stopping_criteria.interrupt();
      break;

    case "reset":
      stopping_criteria.reset();
      break;
  }
});
