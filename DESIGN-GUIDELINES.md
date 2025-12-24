# Terminal UI Design System - Tailwind v4

A developer tool design system with classic amber CRT terminal aesthetics, built with Tailwind v4.

## Tailwind v4 Configuration

Use tailwind from the CDN like this:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

```css
@import "tailwindcss";

@theme {
  /* Amber Terminal Color Palette */
  --color-terminal-bg: #0a0a08;
  --color-terminal-text: #ffb000;
  --color-terminal-text-deep: #ff8c00;
  --color-terminal-muted: #664400;
  --color-terminal-dim: #996600;
  --color-terminal-error: #ff6600;
  --color-terminal-success: #ddaa00;
  --color-terminal-green: #00ff00;
  
  /* Spacing optimized for terminal layouts */
  --spacing-terminal: 1.5rem;
  
  /* Typography */
  --font-family-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace;
  --line-height-terminal: 1.6;
  
  /* Effects */
  --glow-sm: 0 0 5px rgb(255 176 0 / 0.5);
  --glow-md: 0 0 10px rgb(255 176 0 / 0.4);
  --glow-lg: 0 0 20px rgb(255 176 0 / 0.3);
  
  /* Screen curvature */
  --radius-screen: 8px;
}

@layer base {
  body {
    @apply bg-terminal-bg text-terminal-text font-mono leading-terminal antialiased;
  }
}

@layer utilities {
  .text-glow {
    text-shadow: var(--glow-sm), var(--glow-md);
  }
  
  .text-glow-strong {
    text-shadow: 
      0 0 5px rgb(255 176 0 / 0.8),
      0 0 10px rgb(255 176 0 / 0.4),
      0 0 15px rgb(255 176 0 / 0.2);
  }
  
  .box-glow {
    box-shadow: var(--glow-lg), inset 0 0 100px rgb(255 176 0 / 0.02);
  }
  
  /* CRT Screen effect */
  .crt-screen {
    @apply rounded-screen border-2 border-terminal-text box-glow;
    position: relative;
  }
  
  /* Scanlines overlay */
  .scanlines::before {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      rgb(0 0 0 / 0.15),
      rgb(0 0 0 / 0.15) 1px,
      transparent 1px,
      transparent 2px
    );
    pointer-events: none;
    z-index: 10;
  }
  
  /* Terminal box borders */
  .terminal-box {
    @apply border border-terminal-text p-4 relative;
    background: rgb(255 176 0 / 0.02);
  }
  
  /* Box title positioned on border */
  .terminal-box-title {
    @apply absolute -top-2.5 left-4 bg-terminal-bg px-2 text-xs text-terminal-text-deep;
  }
  
  /* Border highlight on left */
  .border-l-highlight {
    @apply border-l-2 border-terminal-muted transition-colors duration-100;
  }
  
  .border-l-highlight:hover {
    @apply border-terminal-text;
    background: rgb(255 176 0 / 0.05);
  }
  
  .border-l-highlight.active {
    @apply border-terminal-text-deep;
    background: rgb(255 176 0 / 0.08);
  }
  
  /* Cursor blink animation */
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
  
  .cursor-blink {
    animation: blink 1s linear infinite;
  }
  
  /* Low framerate animation for authenticity */
  .animate-terminal {
    animation-timing-function: linear;
  }
}
```

## Core Color System

```javascript
// Tailwind class reference
const colors = {
  background: 'bg-terminal-bg',          // #0a0a08
  text: 'text-terminal-text',            // #ffb000 (primary amber)
  textDeep: 'text-terminal-text-deep',   // #ff8c00 (emphasis)
  muted: 'text-terminal-muted',          // #664400 (disabled/secondary)
  dim: 'text-terminal-dim',              // #996600 (labels)
  error: 'text-terminal-error',          // #ff6600
  success: 'text-terminal-success',      // #ddaa00
  green: 'text-terminal-green',          // #00ff00 (status)
}
```

## Typography

```javascript
// Font sizing scale (avoid fractional sizes)
const textSizes = {
  xs: 'text-[10px]',    // Labels, help text
  sm: 'text-[11px]',    // Secondary content
  base: 'text-[12px]',  // Body text, inputs
  md: 'text-[13px]',    // Buttons
  lg: 'text-[18px]',    // Headers
}

// Usage
<h1 className="text-lg uppercase tracking-[2px] text-glow">
  LLM API Comparator
</h1>

<label className="text-xs uppercase tracking-wide text-terminal-dim">
  API Endpoint
</label>
```

**Rules:**
- Single weight only (400) - terminals don't have bold
- Use UPPERCASE and letter-spacing for emphasis
- Line height: `leading-relaxed` (1.6) for readability
- Never use font weights or font-style variations

## Component Patterns

### Terminal Screen Container

```jsx
<div className="min-h-screen bg-black p-5">
  <div className="max-w-6xl mx-auto crt-screen scanlines p-8">
    {/* Content */}
  </div>
</div>
```

### Box with Title

```jsx
<div className="terminal-box mb-5">
  <div className="terminal-box-title">┤ API PROVIDERS ├</div>
  {/* Content */}
</div>
```

### Provider/Item List

```jsx
<div className="space-y-3">
  <div className="flex items-center gap-3 p-2 border-l-highlight">
    <input type="checkbox" className="terminal-checkbox" />
    <span className="text-terminal-text">OpenAI</span>
    <span className="ml-auto text-[10px] text-terminal-green">● KEY SAVED</span>
    <button className="terminal-btn-danger">CLEAR KEY</button>
  </div>
</div>
```

### Custom Checkbox

```jsx
<style>
  .terminal-checkbox {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid theme('colors.terminal.text');
    background: theme('colors.terminal.bg');
    cursor: pointer;
    position: relative;
  }
  
  .terminal-checkbox:checked::before {
    content: 'X';
    position: absolute;
    top: -2px;
    left: 3px;
    color: theme('colors.terminal.text-deep');
    font-size: 12px;
  }
</style>

<input type="checkbox" className="terminal-checkbox" />
```

### Buttons

```jsx
// Primary button
<button className="terminal-btn-primary">
  Send to APIs
</button>

// Standard button
<button className="terminal-btn">
  Download JSON
</button>

// Danger button
<button className="terminal-btn-danger">
  Delete
</button>

// Styles
<style>
  .terminal-btn {
    @apply bg-transparent border border-terminal-text text-terminal-text 
           px-3 py-1.5 text-[11px] uppercase tracking-wider cursor-pointer
           transition-all duration-100 hover:bg-[rgb(255_176_0_/_0.2)]
           hover:shadow-[0_0_10px_rgb(255_176_0_/_0.3)];
  }
  
  .terminal-btn-primary {
    @apply terminal-btn bg-terminal-muted border-terminal-text-deep
           hover:bg-[rgb(255_140_0_/_0.3)];
  }
  
  .terminal-btn-danger {
    @apply terminal-btn border-terminal-error text-terminal-error;
  }
</style>
```

### Input Fields

```jsx
<input 
  type="text"
  className="w-full bg-terminal-bg border border-terminal-muted border-l-[3px] 
             border-l-terminal-text text-terminal-text px-3 py-2 text-[12px]
             outline-none focus:border-l-terminal-text-deep 
             focus:bg-[rgb(255_176_0_/_0.05)] 
             focus:shadow-[0_0_5px_rgb(255_176_0_/_0.2)]"
  placeholder="> Enter command..."
/>

<textarea 
  className="w-full bg-terminal-bg border border-terminal-muted border-l-[3px] 
             border-l-terminal-text text-terminal-text px-3 py-2 text-[12px]
             outline-none resize-y min-h-[100px]
             focus:border-l-terminal-text-deep 
             focus:bg-[rgb(255_176_0_/_0.05)]"
/>
```

### Message Bubbles

```jsx
// User message
<div className="border-l-[3px] border-terminal-text p-3">
  <div className="flex items-center gap-3 mb-2 text-[11px] text-terminal-dim">
    <span className="text-terminal-text-deep uppercase">&gt;&gt;&gt; User</span>
    <span>│</span>
  </div>
  <div className="text-[12px] pl-3">
    Message content here
  </div>
</div>

// Assistant message
<div className="border-l-[3px] border-terminal-dim p-3 bg-[rgb(255_176_0_/_0.03)]">
  <div className="flex items-center gap-3 mb-2 text-[11px] text-terminal-dim">
    <span className="text-terminal-text-deep uppercase">&lt;&lt;&lt; Assistant</span>
    <span>│</span>
  </div>
  <div className="text-[12px] pl-3">
    Message content here
  </div>
</div>
```

### Dashed Box (Add Actions)

```jsx
<div className="border border-dashed border-terminal-muted p-4 text-center 
                text-terminal-dim cursor-pointer transition-all duration-100
                hover:border-terminal-text hover:text-terminal-text 
                hover:bg-[rgb(255_176_0_/_0.05)]">
  + ADD CUSTOM OR LOCAL PROVIDER
</div>
```

### Status Badges

```jsx
<span className="text-[10px] text-terminal-green">● KEY SAVED</span>
<span className="text-[10px] text-terminal-error">● NOT SAVED</span>
```

### Dividers

```jsx
// Solid
<div className="border-t border-terminal-muted my-5" />

// ASCII style
<div className="text-center text-terminal-muted my-5 text-[12px]">
  ─────────────────────────────────────────────
</div>
```

## Layout Patterns

### Full-width Terminal Layout

```jsx
<div className="max-w-6xl mx-auto">
  {/* No sidebars - terminal UIs are single-column */}
</div>
```

### Form Grid (Side-by-side inputs)

```jsx
<div className="grid grid-cols-2 gap-4 mt-4">
  <div className="space-y-1.5">
    <label className="text-[11px] text-terminal-dim uppercase tracking-wide">
      Name (optional)
    </label>
    <input type="text" className="terminal-input" />
  </div>
  <div className="space-y-1.5">
    <label className="text-[11px] text-terminal-dim uppercase tracking-wide">
      API Endpoint
    </label>
    <input type="text" className="terminal-input" />
  </div>
</div>
```

## Special Effects

### Text Glow

```jsx
<h1 className="text-glow">Glowing Text</h1>
<h1 className="text-glow-strong">Strong Glow</h1>
```

### Blinking Cursor

```jsx
<span className="cursor-blink">_</span>
```

### Loading Bar (ASCII)

```jsx
<div className="font-mono text-[12px]">
  [████████░░] 80%
</div>
```

### Progress Indicator

```jsx
<div className="relative h-1 bg-terminal-muted">
  <div className="absolute inset-y-0 left-0 bg-terminal-text" 
       style={{width: '60%'}} />
</div>
```

## Interactive States

### Hover Effects

```javascript
// List items
'hover:border-terminal-text hover:bg-[rgb(255_176_0_/_0.05)]'

// Buttons
'hover:bg-[rgb(255_176_0_/_0.2)] hover:shadow-[0_0_10px_rgb(255_176_0_/_0.3)]'

// Links
'hover:text-terminal-text-deep hover:text-glow'
```

### Focus States

```javascript
// Inputs
'focus:border-l-terminal-text-deep focus:bg-[rgb(255_176_0_/_0.05)] focus:shadow-[0_0_5px_rgb(255_176_0_/_0.2)]'

// Buttons (use focus-visible for keyboard only)
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-text focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg'
```

### Active States

```javascript
'active:bg-[rgb(255_176_0_/_0.15)] active:scale-[0.98]'
```

### Disabled States

```javascript
'disabled:opacity-40 disabled:cursor-not-allowed disabled:border-terminal-muted'
```

## Animation Principles

- **Timing:** Always use `duration-100` (100ms) or linear timing
- **No easing:** Terminals are instant, use `transition-linear` or omit easing
- **Low framerate:** Keep animations simple and snappy
- **Typing effects:** Reveal text character-by-character at ~50ms per char

```jsx
// Simple linear transition
<button className="transition-all duration-100">Click</button>

// No transition for instant feedback
<button className="transition-none">Instant</button>
```

## Accessibility Considerations

```jsx
// Maintain readable contrast (amber on black = ~8:1 ratio)
// Provide keyboard navigation
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terminal-text"

// Screen reader labels
<span className="sr-only">Status: Key saved</span>
<span aria-hidden="true">●</span>

// Semantic HTML
<button type="button" aria-label="Delete message">
  ✕
</button>
```

## Responsive Behavior

Terminal UIs traditionally aren't responsive, but for mobile:

```jsx
// Stack form grids on mobile
className="grid grid-cols-1 md:grid-cols-2 gap-4"

// Reduce padding on small screens
className="p-4 md:p-8"

// Scale text slightly smaller on mobile
className="text-[11px] md:text-[12px]"
```

## Code Style & Organization

```jsx
// Component structure example
export function TerminalBox({ title, children }) {
  return (
    <div className="terminal-box mb-5">
      {title && (
        <div className="terminal-box-title">
          ┤ {title.toUpperCase()} ├
        </div>
      )}
      {children}
    </div>
  )
}

// Usage
<TerminalBox title="API Providers">
  {/* content */}
</TerminalBox>
```

## Voice & Tone in UI Copy

- **Terse, technical language:** "SEND TO APIS" not "Send to Selected API Providers"
- **Commands feel like CLI:** "CLEAR KEY" not "Remove Saved Key"
- **Status messages:** "READY_" not "System Ready"
- **Unix philosophy:** Show what matters, nothing more
- **Error messages:** "ERR: INVALID KEY FORMAT" not "Oops! The API key you entered..."

## ASCII Characters for UI

```
Box drawing: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Arrows: → ← ↑ ↓ ⇒ ⇐
Markers: ● ○ ◆ ◇ ■ □ ▪ ▫
Symbols: ✓ ✕ ⚠ ⚡ ▶ ◀
```

## Complete Component Example

```jsx
import { useState } from 'react'

function ProviderSection() {
  const [providers, setProviders] = useState([
    { id: 'openai', name: 'OpenAI', keySaved: true, active: false },
    { id: 'anthropic', name: 'Anthropic', keySaved: false, active: false },
    { id: 'gemini', name: 'Google Gemini', keySaved: true, active: false },
  ])

  return (
    <div className="terminal-box mb-5">
      <div className="terminal-box-title">┤ API PROVIDERS ├</div>
      
      <div className="space-y-3">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`
              flex items-center gap-3 p-2 border-l-highlight
              ${provider.active ? 'active' : ''}
            `}
          >
            <input
              type="checkbox"
              id={provider.id}
              checked={provider.active}
              className="terminal-checkbox"
              onChange={(e) => {
                setProviders(providers.map(p => 
                  p.id === provider.id 
                    ? { ...p, active: e.target.checked }
                    : p
                ))
              }}
            />
            <label 
              htmlFor={provider.id}
              className="text-terminal-text cursor-pointer"
            >
              {provider.name}
            </label>
            
            {provider.keySaved && (
              <>
                <span className="ml-auto text-[10px] text-terminal-green">
                  ● KEY SAVED
                </span>
                <button className="terminal-btn-danger text-[10px] px-2 py-1">
                  CLEAR KEY
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Testing Checklist

- [ ] Text is readable at 12px base size
- [ ] Glow effects visible but not overwhelming
- [ ] Hover states respond instantly (100ms)
- [ ] Focus indicators visible for keyboard navigation
- [ ] Scanlines don't interfere with text readability
- [ ] Colors maintain ~8:1 contrast ratio
- [ ] No font weight variations used
- [ ] Monospace font loads correctly
- [ ] ASCII characters render properly
- [ ] Mobile layout stacks appropriately

## Performance Notes

- Scanlines can impact performance on large screens - consider disabling on mobile
- Text glow uses multiple text-shadows - limit to headers/important elements
- Use CSS containment for independent components: `contain: layout style`
- Avoid animating expensive properties (use transform/opacity)

---

**Remember:** The goal is functional authenticity. Every visual choice should support the terminal aesthetic while maintaining modern usability standards. When in doubt, ask "Would this exist on a 1980s terminal?" If no, reconsider the approach.
