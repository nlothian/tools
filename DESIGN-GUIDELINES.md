
## Overview

This design system creates a refined, technical aesthetic for developer tools. It prioritizes clarity, restraint, and purposeful motion over visual noise. The foundation is Solarized Light with surgical accent colors, monospace typography, and animations that enhance rather than distract.

**Core Principles:**
1. Dominant colors with sharp accents outperform even palettes
2. Motion serves meaning — animate only what matters
3. Asymmetry creates visual hierarchy
4. Generous whitespace signals quality
5. Monospace everywhere builds consistency

**Tech Stack:** Tailwind CSS v4 (browser CDN) for utility-first styling.

---

## Setup

### Quick Start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM Probe</title>
  <link href="https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    @theme {
      /* Solarized Light Colors */
      --color-base-3: #fdf6e3;
      --color-base-2: #eee8d5;
      --color-base-1: #93a1a1;
      --color-base-00: #657b83;
      --color-base-01: #586e75;
      
      /* Accents */
      --color-sol-cyan: #2aa198;
      --color-sol-green: #859900;
      --color-sol-yellow: #b58900;
      --color-sol-orange: #cb4b16;
      --color-sol-red: #dc322f;
      --color-sol-magenta: #d33682;
      
      /* Typography */
      --font-mono: 'Cousine', 'Monaco', 'Consolas', monospace;
      
      /* Spacing */
      --spacing-xs: 8px;
      --spacing-sm: 16px;
      --spacing-md: 24px;
      --spacing-lg: 32px;
      --spacing-xl: 48px;
      --spacing-2xl: 64px;
      --spacing-3xl: 96px;
    }
  </style>
</head>
<body class="font-mono bg-base-3 text-base-00">
  <!-- Your content here -->
</body>
</html>
```

---

## Color System

### Tailwind Theme Configuration

The `@theme` directive defines custom colors that map to Tailwind utilities:

```html
<style type="text/tailwindcss">
  @theme {
    --color-base-3: #fdf6e3;   /* bg-base-3, text-base-3 */
    --color-base-2: #eee8d5;   /* bg-base-2, text-base-2 */
    --color-base-1: #93a1a1;   /* bg-base-1, text-base-1 */
    --color-base-00: #657b83;  /* bg-base-00, text-base-00 */
    --color-base-01: #586e75;  /* bg-base-01, text-base-01 */
    
    --color-sol-cyan: #2aa198;
    --color-sol-green: #859900;
    --color-sol-yellow: #b58900;
    --color-sol-orange: #cb4b16;
    --color-sol-red: #dc322f;
    --color-sol-magenta: #d33682;
  }
</style>
```

### Color Distribution Rule

**70% base tones, 30% accents** — and within that 30%, pick ONE dominant accent per section.

**Good:**
- Homepage: Cyan dominates (CTAs, links, active states)
- Settings page: Orange dominates (warning actions, toggles)
- Results view: Green/Magenta contrast (pass/fail)

**Bad:**
- Mixing cyan buttons, orange icons, magenta text on the same screen
- Even distribution across all accent colors

### Implementation Examples

```html
<!-- Primary action with cyan accent -->
<button class="bg-sol-cyan text-base-3 px-7 py-3 rounded hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all duration-150">
  Start Testing
</button>

<!-- Card with base tones -->
<div class="bg-base-2 border border-base-1/20 rounded shadow-sm">
  <!-- Card content -->
</div>

<!-- Secondary text -->
<p class="text-base-01 text-sm">
  Secondary information
</p>
```

---

## Typography

### Font Configuration

All text uses Cousine monospace. Set it as the default font family:

```html
<link href="https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap" rel="stylesheet">

<style type="text/tailwindcss">
  @theme {
    --font-mono: 'Cousine', 'Monaco', 'Consolas', monospace;
  }
</style>

<body class="font-mono">
```

**Why Cousine:**
- Clean, readable monospace designed for code
- Works at small sizes (13px) and large (48px)
- Free, open source, excellent web font support

### Type Scale with Tailwind

```html
<!-- H1: 48px, bold, tight leading, tight tracking -->
<h1 class="text-5xl font-bold leading-tight tracking-tight">
  Test language models with precision.
</h1>

<!-- H2: 32px, bold -->
<h2 class="text-3xl font-bold leading-snug">
  Key Features
</h2>

<!-- H3: 20px, semibold -->
<h3 class="text-xl font-semibold leading-normal">
  Parallel Execution
</h3>

<!-- Body Large: 18px -->
<p class="text-lg leading-relaxed">
  Run systematic tests across multiple LLMs.
</p>

<!-- Body: 14px -->
<p class="text-sm leading-relaxed">
  Compare outputs, measure latency, and validate behavior.
</p>

<!-- Label: 12px, uppercase, wide tracking -->
<label class="text-xs uppercase tracking-wider text-base-1">
  Model
</label>

<!-- Code: 13px, tight tracking -->
<code class="text-[13px] leading-snug tracking-tight">
  const result = await probe.test();
</code>
```

### Typography Rules

1. **Never mix fonts** — monospace everywhere (`font-mono` on body)
2. **Hierarchy through weight and size** — not font changes
3. **Tight tracking for headlines** (`tracking-tight`)
4. **Wide tracking for labels** (`tracking-wider`)
5. **Comfortable line height** — `leading-relaxed` for body, `leading-normal` for UI

---

## Motion Design

### Philosophy

Animate **one orchestrated moment** (page load) rather than scattered micro-interactions. Focus on high-impact transitions.

### Custom Animations in Tailwind

Define custom animations in your `@theme` block:

```html
<style type="text/tailwindcss">
  @theme {
    /* Custom keyframes */
    --animate-fade-in-down: fade-in-down 0.4s cubic-bezier(0.4, 0.0, 0.2, 1) backwards;
    --animate-fade-in-up: fade-in-up 0.6s cubic-bezier(0.4, 0.0, 0.2, 1) backwards;
    --animate-fade-in: fade-in 0.5s cubic-bezier(0.4, 0.0, 0.2, 1) backwards;
  }
  
  @keyframes fade-in-down {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
```

### Page Load Choreography

```html
<!-- Header animates down -->
<header class="animate-[fade-in-down_0.4s_cubic-bezier(0.4,0,0.2,1)_backwards]">
  <!-- Nav content -->
</header>

<!-- Hero animates up -->
<section class="animate-[fade-in-up_0.6s_cubic-bezier(0.4,0,0.2,1)_backwards]">
  <h1>Test language models with precision.</h1>
</section>

<!-- Cards cascade in with staggered delays -->
<div class="animate-[fade-in_0.5s_cubic-bezier(0.4,0,0.2,1)_0.3s_backwards]">
  <!-- Card 1 -->
</div>

<div class="animate-[fade-in_0.5s_cubic-bezier(0.4,0,0.2,1)_0.45s_backwards]">
  <!-- Card 2 -->
</div>

<div class="animate-[fade-in_0.5s_cubic-bezier(0.4,0,0.2,1)_0.6s_backwards]">
  <!-- Card 3 -->
</div>
```

**Pattern:** Increment delays by 0.1-0.15s for cascading effect.

### Micro-interactions (High-Impact Only)

```html
<!-- Button with hover lift and press feedback -->
<button class="bg-sol-cyan text-base-3 px-7 py-3 rounded font-semibold
               transition-all duration-150
               hover:shadow-[0_4px_12px_rgba(42,161,152,0.3)] hover:-translate-y-0.5
               active:scale-[0.98]">
  Start Testing
</button>

<!-- Input with focus glow -->
<input class="w-full px-3 py-2 bg-base-3 border border-base-1/20 rounded
              text-[13px] text-base-00 font-mono
              transition-all duration-200
              focus:outline-none focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20"
       type="text">

<!-- Card with hover lift -->
<div class="bg-base-2 border border-base-1/20 rounded p-8
            shadow-[0_2px_8px_rgba(101,123,131,0.08)]
            transition-all duration-300
            hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(101,123,131,0.12)]">
  <!-- Card content -->
</div>

<!-- Pulse glow for active states -->
<style type="text/tailwindcss">
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(42, 161, 152, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(42, 161, 152, 0); }
  }
</style>

<button class="animate-[pulse-glow_2s_infinite]">
  Running...
</button>
```

### Easing Function

Tailwind's `ease-out` and custom cubic-bezier via arbitrary values:

```html
<!-- Standard easing (Material Design) -->
<div class="transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">
```

This is Material Design's standard easing — familiar to developers and feels natural.

---

## Backgrounds & Depth

### Layered Gradients

```html
<!-- Hero section with radial accents -->
<div class="fixed inset-0 -z-10"
     style="background: 
       linear-gradient(135deg, #fdf6e3 0%, #eee8d5 100%),
       radial-gradient(circle at 20% 80%, rgba(42,161,152,0.08) 0%, transparent 50%),
       radial-gradient(circle at 80% 20%, rgba(42,161,152,0.05) 0%, transparent 50%);">
</div>

<!-- Or using Tailwind's gradient utilities for simpler cases -->
<div class="bg-gradient-to-br from-base-3 to-base-2">
</div>
```

### Geometric Patterns

```html
<!-- Subtle line pattern for code blocks -->
<style type="text/tailwindcss">
  .code-lines {
    background-image: 
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 19px,
        rgba(147, 161, 161, 0.05) 19px,
        rgba(147, 161, 161, 0.05) 20px
      );
  }
  
  .dot-grid {
    background-image: 
      radial-gradient(circle, rgba(147, 161, 161, 0.15) 1px, transparent 1px);
    background-size: 20px 20px;
  }
</style>

<div class="bg-base-2 code-lines">
  <!-- Code content -->
</div>

<div class="dot-grid">
  <!-- Documentation content -->
</div>
```

### Contextual Overlays

```html
<!-- Success state -->
<div class="relative">
  <div class="absolute inset-0 bg-gradient-to-b from-sol-green/5 to-transparent"></div>
  <!-- Content -->
</div>

<!-- Error state -->
<div class="relative">
  <div class="absolute inset-0 bg-gradient-to-b from-sol-red/5 to-transparent"></div>
  <!-- Content -->
</div>

<!-- Processing/shimmer state -->
<style type="text/tailwindcss">
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>

<div class="animate-[shimmer_2s_infinite]"
     style="background: linear-gradient(
       90deg,
       var(--color-base-2) 0%,
       rgba(42, 161, 152, 0.1) 50%,
       var(--color-base-2) 100%
     );
     background-size: 200% 100%;">
  Processing...
</div>
```

---

## Layout Principles

### Asymmetric Grid (60/40 or 70/30)

```html
<!-- Good: Dominant content area (70/30 split) -->
<div class="grid grid-cols-[1fr_400px] gap-12 max-w-[1400px] mx-auto px-12">
  <main>
    <!-- Primary content (70%) -->
  </main>
  <aside>
    <!-- Sidebar (30%) -->
  </aside>
</div>

<!-- Alternative: Using Tailwind's fraction utilities -->
<div class="grid lg:grid-cols-[2fr_1fr] gap-12">
  <!-- Roughly 66/33 split -->
</div>

<!-- Bad: Even split (avoid) -->
<div class="grid grid-cols-2 gap-6">
  <!-- Don't use 50/50 layouts -->
</div>

<!-- Responsive: Stack on mobile -->
<div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
  <!-- Single column on mobile, asymmetric on desktop -->
</div>
```

### Whitespace Scale

Tailwind provides a spacing scale. Use generous spacing for premium feel:

```html
<!-- Section spacing -->
<section class="py-24 px-12"> <!-- 96px top/bottom, 48px sides -->
  
  <!-- Card spacing -->
  <div class="p-8 mb-6"> <!-- 32px padding, 24px margin-bottom -->
    
    <!-- Element spacing -->
    <h3 class="mb-5">Title</h3> <!-- 20px margin-bottom -->
    <p class="mb-4">Content</p> <!-- 16px margin-bottom -->
    
  </div>
</section>

<!-- Custom spacing values -->
<style type="text/tailwindcss">
  @theme {
    --spacing-3xl: 96px;
  }
</style>

<div class="py-[96px]"> <!-- Using arbitrary value -->
</div>
```

### Container Widths

```html
<!-- Max width for readability -->
<div class="max-w-[1400px] mx-auto px-12">
  <!-- Content -->
</div>

<!-- Narrower for text-heavy content -->
<div class="max-w-[680px] mx-auto">
  <article class="prose prose-sm">
    <!-- Long-form text -->
  </article>
</div>

<!-- Full-width sections with constrained content -->
<section class="w-full bg-base-2">
  <div class="max-w-[1400px] mx-auto px-12">
    <!-- Content -->
  </div>
</section>
```

---

## Component Patterns

### Cards

```html
<div class="bg-base-2 border border-base-1/20 rounded p-8
            shadow-[0_2px_8px_rgba(101,123,131,0.08)]
            transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
            hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(101,123,131,0.12)]">
  
  <!-- Card icon -->
  <div class="w-12 h-12 bg-sol-cyan rounded flex items-center justify-center text-2xl text-base-3 mb-5">
    ⚡
  </div>
  
  <!-- Card title -->
  <h3 class="text-xl font-semibold mb-3 text-base-00">
    Parallel Execution
  </h3>
  
  <!-- Card description -->
  <p class="text-sm text-base-01 leading-relaxed">
    Run identical prompts across multiple models simultaneously.
  </p>
</div>
```

### Buttons

```html
<!-- Primary Button -->
<button class="bg-sol-cyan text-base-3 border-0 px-7 py-3 text-sm font-semibold rounded cursor-pointer
               transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]
               hover:shadow-[0_4px_12px_rgba(42,161,152,0.3)] hover:-translate-y-0.5
               active:scale-[0.98]">
  Start Testing
</button>

<!-- Secondary Button -->
<button class="bg-transparent text-base-00 border border-base-1/30 px-7 py-3 text-sm font-semibold rounded cursor-pointer
               transition-all duration-150
               hover:bg-base-2 hover:border-sol-cyan">
  View Documentation
</button>

<!-- Destructive Button -->
<button class="bg-sol-orange text-base-3 px-7 py-3 text-sm font-semibold rounded
               hover:shadow-[0_4px_12px_rgba(203,75,22,0.3)] hover:-translate-y-0.5
               transition-all duration-150">
  Delete
</button>
```

### Forms

```html
<!-- Form group -->
<div class="mb-4">
  <!-- Label -->
  <label class="block text-xs text-base-1 mb-1.5 uppercase tracking-wider">
    Model
  </label>
  
  <!-- Select -->
  <select class="w-full px-3 py-2 font-mono text-[13px] bg-base-3 border border-base-1/20 rounded text-base-00
                 transition-all duration-200
                 focus:outline-none focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20">
    <option>GPT-4 Turbo</option>
    <option>Claude Sonnet 4.5</option>
    <option>Gemini Pro</option>
  </select>
</div>

<div class="mb-4">
  <!-- Input -->
  <label class="block text-xs text-base-1 mb-1.5 uppercase tracking-wider">
    Temperature
  </label>
  <input type="number" value="0.7" step="0.1" min="0" max="2"
         class="w-full px-3 py-2 font-mono text-[13px] bg-base-3 border border-base-1/20 rounded text-base-00
                transition-all duration-200
                focus:outline-none focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20">
</div>

<div class="mb-4">
  <!-- Textarea -->
  <label class="block text-xs text-base-1 mb-1.5 uppercase tracking-wider">
    Prompt
  </label>
  <textarea rows="4"
            placeholder="Enter your test prompt..."
            class="w-full px-3 py-2 font-mono text-[13px] bg-base-3 border border-base-1/20 rounded text-base-00 resize-y
                   transition-all duration-200
                   focus:outline-none focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20">
  </textarea>
</div>
```

### Code Blocks

```html
<!-- Custom class for line pattern -->
<style type="text/tailwindcss">
  .code-lines {
    background-image: 
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 19px,
        rgba(147, 161, 161, 0.05) 19px,
        rgba(147, 161, 161, 0.05) 20px
      );
  }
</style>

<pre class="bg-base-2 border-l-[3px] border-sol-cyan p-5 text-[13px] text-base-00 overflow-x-auto rounded tracking-tight leading-snug code-lines">
<span class="text-sol-green font-semibold">const</span> result = <span class="text-sol-green font-semibold">await</span> probe.test({
  prompt: <span class="text-sol-cyan">"Explain quantum entanglement"</span>,
  models: [<span class="text-sol-cyan">"gpt-4"</span>, <span class="text-sol-cyan">"claude-3"</span>],
  temperature: 0.7
});

<span class="text-base-1">// Compare outputs</span>
result.compare({
  metric: <span class="text-sol-cyan">"coherence"</span>,
  threshold: 0.85
});
</pre>
```

### Navigation

```html
<!-- Sticky header with backdrop blur -->
<header class="sticky top-0 z-50 px-12 py-6 border-b border-base-1/20 bg-base-3/90 backdrop-blur-sm">
  <nav class="flex justify-between items-center max-w-[1400px] mx-auto">
    <!-- Logo -->
    <div class="text-lg font-bold text-sol-cyan tracking-tight">
      LLM Probe
    </div>
    
    <!-- Nav links -->
    <ul class="flex gap-8 list-none">
      <li>
        <a href="#features" class="text-base-00 no-underline text-sm transition-colors duration-200 hover:text-sol-cyan">
          Features
        </a>
      </li>
      <li>
        <a href="#docs" class="text-base-00 no-underline text-sm transition-colors duration-200 hover:text-sol-cyan">
          Documentation
        </a>
      </li>
      <li>
        <a href="#api" class="text-sol-cyan no-underline text-sm font-semibold">
          API
        </a>
      </li>
    </ul>
  </nav>
</header>
```

### Stats Display

```html
<div class="grid grid-cols-3 gap-6 my-15 py-10 border-t border-b border-base-1/20">
  <div class="text-center">
    <span class="block text-4xl font-bold text-sol-cyan mb-2">12ms</span>
    <span class="text-xs text-base-1 uppercase tracking-wider">Avg Response</span>
  </div>
  
  <div class="text-center">
    <span class="block text-4xl font-bold text-sol-cyan mb-2">99.9%</span>
    <span class="text-xs text-base-1 uppercase tracking-wider">Uptime</span>
  </div>
  
  <div class="text-center">
    <span class="block text-4xl font-bold text-sol-cyan mb-2">8</span>
    <span class="text-xs text-base-1 uppercase tracking-wider">LLM Providers</span>
  </div>
</div>
```

---

## Implementation Checklist

### Getting Started

1. **Load Tailwind CSS v4:**
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
   ```

2. **Install Cousine font:**
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap" rel="stylesheet">
   ```

3. **Set up theme configuration:**
   ```html
   <style type="text/tailwindcss">
     @theme {
       --color-base-3: #fdf6e3;
       --color-base-2: #eee8d5;
       --color-base-1: #93a1a1;
       --color-base-00: #657b83;
       --color-base-01: #586e75;
       
       --color-sol-cyan: #2aa198;
       --color-sol-green: #859900;
       --color-sol-orange: #cb4b16;
       --color-sol-red: #dc322f;
       
       --font-mono: 'Cousine', 'Monaco', 'Consolas', monospace;
     }
   </style>
   ```

4. **Apply base styles:**
   ```html
   <body class="font-mono bg-base-3 text-base-00">
   ```

### Page-Level Checklist

- [ ] Choose one dominant accent color for this page
- [ ] Add layered gradient background using fixed positioning
- [ ] Implement staggered page load animations with `animate-[...]`
- [ ] Use asymmetric grid layout (`grid-cols-[1fr_400px]`)
- [ ] Apply generous whitespace (`py-24 px-12` between sections)
- [ ] Ensure all text uses `font-mono`

### Component-Level Checklist

- [ ] Cards have `shadow-sm` and `hover:-translate-y-1 hover:shadow-lg`
- [ ] Buttons have `hover:-translate-y-0.5` and `active:scale-[0.98]`
- [ ] Inputs have `focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20`
- [ ] Code blocks have `border-l-[3px] border-sol-cyan`
- [ ] Forms use `text-xs uppercase tracking-wider` labels

---

## Design References

**Similar aesthetics to study:**
- GitHub's code editor interface
- Linear's application UI
- Stripe's developer documentation
- Vercel's dashboard
- Railway's platform

**Key similarities:**
- Restrained color palettes with surgical accents
- Monospace typography throughout
- Generous whitespace
- Subtle depth through shadows
- Purposeful animation

**What makes this different:**
- Solarized Light instead of dark mode
- Full commitment to monospace (no mixing)
- Warmer base tones (less stark than pure white)
- Single dominant accent per section rule

---

## Common Mistakes to Avoid

### Color
❌ Using all accent colors equally on one page  
✅ Pick ONE dominant accent per page/section with Tailwind classes

❌ Pure white backgrounds (`bg-white`)  
✅ Warm Solarized base (`bg-base-3`)

❌ High-saturation colors everywhere  
✅ Muted Solarized accents with strategic placement

### Typography
❌ Mixing font classes (`font-sans`, `font-serif`)  
✅ `font-mono` everywhere on body

❌ Too many text sizes (using arbitrary values excessively)  
✅ Limited scale: `text-xs`, `text-sm`, `text-lg`, `text-xl`, `text-5xl`

❌ Tight line height for body (`leading-tight`)  
✅ Comfortable line height (`leading-relaxed`) for readability

### Motion
❌ Animations on every element  
✅ One orchestrated page load + high-impact hovers only

❌ Long durations (`duration-1000`)  
✅ Quick, snappy (`duration-150` to `duration-300`)

❌ Using `ease-linear`  
✅ Use `ease-[cubic-bezier(0.4,0,0.2,1)]` for natural feel

### Layout
❌ 50/50 split layouts (`grid-cols-2`)  
✅ Asymmetric (`grid-cols-[1fr_400px]` or `grid-cols-[2fr_1fr]`)

❌ Cramped spacing (`gap-2`, `p-2`)  
✅ Generous whitespace (`gap-12`, `p-8`, `py-24`)

❌ No max-width containers  
✅ Constrained containers (`max-w-[1400px] mx-auto`)

### Tailwind-Specific
❌ Overusing arbitrary values `text-[14.5px]`
✅ Stick to Tailwind's scale when possible

❌ Inline styles instead of Tailwind utilities
✅ Use utilities: `bg-sol-cyan` not `style="background: #2aa198"`

❌ Not using responsive prefixes
✅ Mobile-first: `grid-cols-1 lg:grid-cols-[1fr_400px]`

❌ Forgetting to configure @theme
✅ Always define custom colors in `@theme` block

❌ **CRITICAL:** Using `@apply` in custom utility classes
✅ Write direct CSS properties - browser CDN doesn't support `@apply`

**Important:** Tailwind v4's browser CDN does not support `@apply` directives in custom utility classes. Always write CSS properties directly:

```css
/* ❌ This will NOT work with browser CDN */
.btn-primary {
  @apply bg-sol-cyan text-base-3 px-4 py-2;
}

/* ✅ This WILL work */
.btn-primary {
  background: var(--color-sol-cyan);
  color: var(--color-base-3);
  padding: 0.5rem 1rem;
}
```

---

## Advanced Techniques

### Sticky Sidebar Pattern

```html
<aside class="sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto">
  <!-- Sidebar content stays in view while scrolling -->
</aside>
```

### Backdrop Blur Header

```html
<header class="sticky top-0 bg-base-3/90 backdrop-blur-sm">
  <!-- Frosted glass effect on scroll -->
</header>
```

### Animated Gradient Shift

```html
<style type="text/tailwindcss">
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>

<div class="animate-[shimmer_2s_ease-in-out_infinite]"
     style="background: linear-gradient(
       90deg,
       var(--color-base-2) 0%,
       rgba(42, 161, 152, 0.1) 50%,
       var(--color-base-2) 100%
     );
     background-size: 200% 100%;">
  Processing...
</div>
```

### Custom Scrollbar

```html
<style>
  /* Webkit browsers */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--color-base-2);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--color-base-1);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-sol-cyan);
  }
</style>
```

### Reusable Components with @apply

While Tailwind v4 is utility-first, you can create reusable classes:

```html
<style type="text/tailwindcss">
  .btn-base {
    @apply px-7 py-3 text-sm font-semibold rounded cursor-pointer;
    @apply transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)];
  }
  
  .btn-primary {
    @apply btn-base bg-sol-cyan text-base-3;
    @apply hover:shadow-[0_4px_12px_rgba(42,161,152,0.3)] hover:-translate-y-0.5;
    @apply active:scale-[0.98];
  }
</style>

<button class="btn-primary">Start Testing</button>
```

---

## Responsive Adaptations

### Tailwind Breakpoints

Tailwind uses mobile-first breakpoints:

- `sm:` - 640px and up (small tablets)
- `md:` - 768px and up (tablets)
- `lg:` - 1024px and up (laptops)
- `xl:` - 1280px and up (desktops)
- `2xl:` - 1536px and up (large desktops)

### Responsive Patterns

```html
<!-- Stack on mobile, asymmetric on desktop -->
<div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-12">
  <main>Content</main>
  <aside>Sidebar</aside>
</div>

<!-- Adjust typography -->
<h1 class="text-3xl lg:text-5xl font-bold">
  Test language models
</h1>

<!-- Adjust spacing -->
<section class="py-12 px-6 lg:py-24 lg:px-12">
  <!-- 50% smaller spacing on mobile -->
</section>

<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">
  Desktop-only content
</div>

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">
  Mobile menu
</div>

<!-- Increase touch targets on mobile -->
<button class="px-6 py-4 lg:px-7 lg:py-3">
  <!-- 44x44px minimum on mobile -->
</button>
```

### Mobile-Specific Considerations

```html
<!-- Disable sticky positioning on mobile -->
<header class="lg:sticky top-0">
  <!-- Only sticky on desktop -->
</header>

<!-- Simplify animations on mobile -->
<div class="lg:animate-[fade-in_0.5s_cubic-bezier(0.4,0,0.2,1)_0.3s_backwards]">
  <!-- No animation on mobile, saves performance -->
</div>

<!-- Adjust grid columns -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- 1 column mobile, 2 tablet, 3 desktop -->
</div>
```

---

## File Structure Recommendation

With Tailwind CSS, you typically need fewer CSS files:

```
project/
├── index.html              # Main HTML with Tailwind utilities
├── styles/
│   └── custom.css          # Custom @keyframes and utility extensions
├── components/
│   ├── header.html         # Reusable HTML components
│   ├── card.html
│   └── button.html
└── js/
    └── main.js             # JavaScript interactions
```

**Alternative:** Single-file approach for simple projects:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    /* All custom config and keyframes here */
  </style>
</head>
<body>
  <!-- All content inline -->
</body>
</html>
```

---

## Accessibility Considerations

### Color Contrast

All Solarized Light combinations meet WCAG AA standards:
- `text-base-00` on `bg-base-3`: 5.5:1 (AA)
- `text-base-00` on `bg-base-2`: 6.8:1 (AAA)
- `text-sol-cyan` on `bg-base-3`: 3.1:1 (Large text only)

For small text on light backgrounds, always use `text-base-00` or darker.

### Focus States

```html
<!-- Visible focus for keyboard navigation -->
<style type="text/tailwindcss">
  *:focus-visible {
    @apply outline-2 outline-sol-cyan outline-offset-2;
  }

  *:focus:not(:focus-visible) {
    @apply outline-none;
  }
</style>

<!-- Or use Tailwind utilities directly -->
<button class="focus-visible:outline-2 focus-visible:outline-sol-cyan focus-visible:outline-offset-2">
  Click me
</button>
```

### Reduced Motion

```html
<style type="text/tailwindcss">
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>

<!-- Or use Tailwind's motion-safe/motion-reduce variants -->
<div class="motion-safe:animate-[fade-in_0.5s] motion-reduce:animate-none">
  Content
</div>
```

---

## Quick Start Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM Probe — Test Language Models</title>
  
  <!-- Cousine Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cousine:wght@400;700&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS v4 -->
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  
  <style type="text/tailwindcss">
    @theme {
      /* Solarized Light Colors */
      --color-base-3: #fdf6e3;
      --color-base-2: #eee8d5;
      --color-base-1: #93a1a1;
      --color-base-00: #657b83;
      --color-base-01: #586e75;
      
      /* Accents */
      --color-sol-cyan: #2aa198;
      --color-sol-green: #859900;
      --color-sol-orange: #cb4b16;
      
      /* Font */
      --font-mono: 'Cousine', 'Monaco', 'Consolas', monospace;
    }
    
    /* Custom animations */
    @keyframes fade-in-down {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>

<body class="font-mono bg-base-3 text-base-00">
  <!-- Fixed background gradient -->
  <div class="fixed inset-0 -z-10"
       style="background: 
         linear-gradient(135deg, #fdf6e3 0%, #eee8d5 100%),
         radial-gradient(circle at 20% 80%, rgba(42,161,152,0.08) 0%, transparent 50%);">
  </div>
  
  <!-- Header -->
  <header class="sticky top-0 z-50 px-12 py-6 border-b border-base-1/20 bg-base-3/90 backdrop-blur-sm
                 animate-[fade-in-down_0.4s_cubic-bezier(0.4,0,0.2,1)_backwards]">
    <nav class="flex justify-between items-center max-w-[1400px] mx-auto">
      <div class="text-lg font-bold text-sol-cyan tracking-tight">
        LLM Probe
      </div>
      <ul class="flex gap-8 list-none">
        <li><a href="#" class="text-base-00 no-underline text-sm transition-colors hover:text-sol-cyan">Features</a></li>
        <li><a href="#" class="text-base-00 no-underline text-sm transition-colors hover:text-sol-cyan">Docs</a></li>
      </ul>
    </nav>
  </header>
  
  <!-- Hero -->
  <section class="max-w-[1400px] mx-auto px-12 py-32
                  animate-[fade-in-up_0.6s_cubic-bezier(0.4,0,0.2,1)_backwards]">
    <h1 class="text-5xl font-bold leading-tight tracking-tight mb-6">
      Test language models<br>with precision.
    </h1>
    <p class="text-lg text-base-01 max-w-[600px] mb-10">
      Run systematic tests across multiple LLMs. Compare outputs, measure latency, 
      and validate behavior.
    </p>
    <div class="flex gap-4">
      <button class="bg-sol-cyan text-base-3 px-7 py-3 text-sm font-semibold rounded
                     transition-all duration-150
                     hover:shadow-[0_4px_12px_rgba(42,161,152,0.3)] hover:-translate-y-0.5
                     active:scale-[0.98]">
        Start Testing
      </button>
      <button class="bg-transparent text-base-00 border border-base-1/30 px-7 py-3 text-sm font-semibold rounded
                     transition-all duration-150
                     hover:bg-base-2 hover:border-sol-cyan">
        View Documentation
      </button>
    </div>
  </section>
  
  <!-- Main Content -->
  <div class="max-w-[1400px] mx-auto px-12 pb-20">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
      <!-- Feature Cards -->
      <div class="space-y-6">
        <div class="bg-base-2 border border-base-1/20 rounded p-8
                    shadow-[0_2px_8px_rgba(101,123,131,0.08)]
                    transition-all duration-300
                    hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(101,123,131,0.12)]">
          <div class="w-12 h-12 bg-sol-cyan rounded flex items-center justify-center text-2xl text-base-3 mb-5">
            ⚡
          </div>
          <h3 class="text-xl font-semibold mb-3">Parallel Execution</h3>
          <p class="text-sm text-base-01 leading-relaxed">
            Run identical prompts across multiple models simultaneously.
          </p>
        </div>
      </div>
      
      <!-- Sidebar -->
      <aside>
        <div class="bg-base-2 border border-base-1/20 border-l-[3px] border-l-sol-cyan rounded p-6 sticky top-[100px]">
          <h4 class="text-base font-semibold mb-5">Quick Test</h4>
          <div class="space-y-4">
            <div>
              <label class="block text-xs text-base-1 mb-1.5 uppercase tracking-wider">Model</label>
              <select class="w-full px-3 py-2 bg-base-3 border border-base-1/20 rounded text-[13px]
                             focus:outline-none focus:border-sol-cyan focus:ring-[3px] focus:ring-sol-cyan/20">
                <option>GPT-4 Turbo</option>
                <option>Claude Sonnet 4.5</option>
              </select>
            </div>
            <button class="w-full bg-sol-cyan text-base-3 px-7 py-3 text-sm font-semibold rounded
                           hover:shadow-[0_4px_12px_rgba(42,161,152,0.3)] hover:-translate-y-0.5
                           transition-all duration-150">
              Run Test
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</body>
</html>
```

---
