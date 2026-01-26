# Design Brief: Jeffrey Smart Web Aesthetic

## Vision Statement

Create a web application that embodies the contemplative precision of Jeffrey Smart's urban landscapes — where modern infrastructure becomes meditation, geometry becomes poetry, and stillness speaks louder than motion.

---

## Core Principles

### 1. Purposeful Geometry
Every element exists with intention. Smart's compositions are meticulously planned — nothing accidental, nothing superfluous. The interface should feel *constructed* rather than decorated.

### 2. Stillness Amid the Modern
Despite depicting highways and industry, Smart's work is profoundly still. The UI should feel calm and unhurried, even when displaying dynamic content.

### 3. The Solitary Figure
Smart often places a lone human amid vast structures. Similarly, the user's focus point — a button, a form field, the content — should feel like that solitary figure: small but significant against considered emptiness.

### 4. Mediterranean Light
Warm, clear, unambiguous. No murky gradients or conflicting light sources. Shadows are defined. Surfaces are honest.

---

## Color Palette

### Primary Palette

```css
:root {
  /* Sky & Atmosphere */
  --sky-pale: #C5D4E0;        /* Hazy horizon */
  --sky-clear: #7BA3C4;       /* Mediterranean blue */
  --sky-deep: #4A6B8A;        /* Late afternoon */
  
  /* Earth & Structure */
  --ochre: #C4956A;           /* Tuscan earth */
  --terracotta: #B86B4C;      /* Warm clay */
  --sand: #D9C5A0;            /* Sunlit ground */
  
  /* Infrastructure */
  --concrete-light: #D4D0C8;  /* Weathered concrete */
  --concrete: #A8A298;        /* Shadowed concrete */
  --concrete-dark: #6B6660;   /* Structure shadow */
  --asphalt: #3D3A36;         /* Road surface */
  --asphalt-deep: #2A2825;    /* Deep shadow */
  
  /* Industrial Accent */
  --signal-orange: #D4692A;   /* Machinery, containers */
  --signal-yellow: #D4A932;   /* Caution, road markings */
  --signal-red: #A63D2F;      /* Containers, signage */
  --industrial-green: #4A6B5A; /* Faded equipment */
  
  /* Light */
  --white-warm: #F5F2EB;      /* Sunlit surfaces */
  --white-pure: #FDFCF9;      /* Bright highlights */
}
```

### Color Application Rules

| Element | Color | Rationale |
|---------|-------|-----------|
| Background | `--white-warm` | The sunlit ground plane |
| Primary surfaces | `--concrete-light` | Built environment |
| Text body | `--asphalt-deep` | Road-like, grounded |
| Text secondary | `--concrete-dark` | Recedes but readable |
| Primary action | `--signal-orange` | The container, the truck |
| Borders/dividers | `--concrete` | Structural lines |
| Hover states | `--terracotta` | Warm shift |
| Focus rings | `--sky-clear` | Sky contrast |

### Shadow Philosophy

Smart's shadows are **solid and directional**, cast by clear Mediterranean sun. No diffuse, multi-source shadows.

```css
:root {
  /* Single light source, top-left, warm ambient */
  --shadow-subtle: 2px 2px 0 rgba(42, 40, 37, 0.08);
  --shadow-soft: 4px 4px 0 rgba(42, 40, 37, 0.12);
  --shadow-medium: 6px 6px 0 rgba(42, 40, 37, 0.15);
  --shadow-strong: 8px 8px 0 rgba(42, 40, 37, 0.18);
  
  /* Hard-edged variant for cards/containers */
  --shadow-hard: 4px 4px 0 var(--concrete);
}
```

---

## Typography

### Font Selection

Smart's world is modernist infrastructure. Typography should echo **road signage, engineering drawings, and mid-century rationalism**.

```css
:root {
  /* 
   * Primary: A geometric sans-serif
   * System fonts that capture the spirit:
   * - Avenir/Nunito qualities: geometric, warm
   * - DIN qualities: industrial, engineered
   */
  --font-primary: system-ui, -apple-system, 'Segoe UI', sans-serif;
  
  /* 
   * Monospace: For data, technical elements
   * Evokes engineering specifications
   */
  --font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
  
  /* 
   * Display: For large headings only
   * Condensed, utilitarian, like container markings
   */
  --font-display: var(--font-primary);
}
```

### Type Scale

Based on Smart's compositional ratios — generous, considered spacing.

```css
:root {
  --text-xs: 0.75rem;      /* 12px - Captions, metadata */
  --text-sm: 0.875rem;     /* 14px - Secondary text */
  --text-base: 1rem;       /* 16px - Body copy */
  --text-lg: 1.125rem;     /* 18px - Lead paragraphs */
  --text-xl: 1.25rem;      /* 20px - Section intros */
  --text-2xl: 1.5rem;      /* 24px - Subheadings */
  --text-3xl: 1.875rem;    /* 30px - Headings */
  --text-4xl: 2.25rem;     /* 36px - Page titles */
  --text-5xl: 3rem;        /* 48px - Hero display */
  
  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
  
  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;
  --tracking-wider: 0.1em;   /* For small caps, labels */
}
```

### Typography Styles

```css
/* Headings: Confident, grounded */
h1, h2, h3, h4 {
  font-family: var(--font-primary);
  font-weight: 600;
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  color: var(--asphalt-deep);
}

h1 {
  font-size: var(--text-4xl);
  font-weight: 700;
}

/* Body: Clear, unhurried */
body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--asphalt-deep);
}

/* Labels: Industrial stencil quality */
.label {
  font-family: var(--font-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--concrete-dark);
}

/* Data/Code: Engineering specification */
.mono {
  font-family: var(--font-mono);
  font-size: 0.9em;
  letter-spacing: var(--tracking-normal);
}
```

---

## Layout System

### Grid Philosophy

Smart composes with **strong horizontal bands** and **vertical divisions**. The horizon line is sacred. Structures rise from it with purpose.

```css
:root {
  /* Spatial scale - generous, considered */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-7: 2.5rem;    /* 40px */
  --space-8: 3rem;      /* 48px */
  --space-10: 4rem;     /* 64px */
  --space-12: 5rem;     /* 80px */
  --space-16: 8rem;     /* 128px */
  
  /* Container widths */
  --width-narrow: 40rem;    /* 640px - Reading */
  --width-medium: 56rem;    /* 896px - Content */
  --width-wide: 72rem;      /* 1152px - Application */
  --width-full: 90rem;      /* 1440px - Maximum */
}

/* Page container */
.container {
  width: 100%;
  max-width: var(--width-wide);
  margin-inline: auto;
  padding-inline: var(--space-6);
}

/* Horizontal bands - the horizon structure */
.band {
  padding-block: var(--space-10);
  border-bottom: 1px solid var(--concrete);
}

.band--hero {
  padding-block: var(--space-16) var(--space-12);
  background: linear-gradient(
    to bottom,
    var(--sky-pale) 0%,
    var(--white-warm) 100%
  );
}

.band--ground {
  background: var(--concrete-light);
}
```

### Grid Structure

```css
/* 12-column grid with generous gutters */
.grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-6);
}

/* Smart often uses asymmetric composition */
.grid--asymmetric {
  grid-template-columns: 1fr 2fr;
  gap: var(--space-8);
}

.grid--sidebar {
  grid-template-columns: 16rem 1fr;
  gap: var(--space-8);
}

/* Cards arranged like containers in a yard */
.grid--cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: var(--space-6);
}
```

### The Horizon Line

A crucial compositional element. In Smart's work, the horizon sits in the upper third, ground dominates.

```css
/* Full-viewport layout with horizon */
.layout-horizon {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

/* Hero with horizon positioning */
.hero {
  display: grid;
  grid-template-rows: 1fr 2fr; /* Sky / Ground ratio */
  min-height: 60vh;
}

.hero__sky {
  background: linear-gradient(
    to bottom,
    var(--sky-clear) 0%,
    var(--sky-pale) 100%
  );
}

.hero__ground {
  background: var(--sand);
  display: flex;
  align-items: start;
  padding-top: var(--space-10);
}
```

---

## Component Patterns

### Cards (The Container)

Like Smart's shipping containers — solid, geometric, purposeful blocks of color.

```css
.card {
  background: var(--white-pure);
  border: 1px solid var(--concrete);
  padding: var(--space-6);
  box-shadow: var(--shadow-hard);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--concrete);
}

/* Colored container variants */
.card--orange {
  background: var(--signal-orange);
  color: var(--white-pure);
  border-color: var(--terracotta);
}

.card--terracotta {
  background: var(--terracotta);
  color: var(--white-pure);
  border-color: var(--signal-red);
}

.card--concrete {
  background: var(--concrete-light);
  border-color: var(--concrete);
}
```

### Buttons (The Signal)

Like road signs and industrial controls — clear, high-contrast, unmistakable.

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  
  padding: var(--space-3) var(--space-5);
  
  font-family: var(--font-primary);
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  text-decoration: none;
  
  background: var(--asphalt-deep);
  color: var(--white-pure);
  border: 2px solid var(--asphalt-deep);
  
  cursor: pointer;
  transition: all 150ms ease;
}

.button:hover {
  background: var(--asphalt);
  border-color: var(--asphalt);
}

.button:focus-visible {
  outline: 3px solid var(--sky-clear);
  outline-offset: 2px;
}

/* Primary action - the orange container */
.button--primary {
  background: var(--signal-orange);
  border-color: var(--signal-orange);
}

.button--primary:hover {
  background: var(--terracotta);
  border-color: var(--terracotta);
}

/* Ghost - structural, understated */
.button--ghost {
  background: transparent;
  color: var(--asphalt-deep);
}

.button--ghost:hover {
  background: var(--concrete-light);
}
```

### Form Elements (The Infrastructure)

Clean, functional, like control panels and instrument readouts.

```css
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  
  font-family: var(--font-primary);
  font-size: var(--text-base);
  
  background: var(--white-pure);
  color: var(--asphalt-deep);
  border: 2px solid var(--concrete);
  
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.input:hover {
  border-color: var(--concrete-dark);
}

.input:focus {
  outline: none;
  border-color: var(--sky-clear);
  box-shadow: 0 0 0 3px rgba(123, 163, 196, 0.2);
}

.input::placeholder {
  color: var(--concrete-dark);
}

/* Label */
.form-label {
  display: block;
  margin-bottom: var(--space-2);
  
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: var(--tracking-wider);
  text-transform: uppercase;
  color: var(--concrete-dark);
}

/* Form group */
.form-group {
  margin-bottom: var(--space-5);
}
```

### Navigation (The Highway)

Horizontal, directional, clear pathways.

```css
.nav {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  
  padding: var(--space-4) var(--space-6);
  background: var(--white-warm);
  border-bottom: 2px solid var(--concrete);
}

.nav__brand {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--asphalt-deep);
  text-decoration: none;
  margin-right: auto;
}

.nav__link {
  padding: var(--space-2) var(--space-4);
  
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--concrete-dark);
  text-decoration: none;
  
  border-bottom: 2px solid transparent;
  transition: color 150ms ease, border-color 150ms ease;
}

.nav__link:hover {
  color: var(--asphalt-deep);
}

.nav__link--active {
  color: var(--asphalt-deep);
  border-bottom-color: var(--signal-orange);
}
```

### Tables (The Grid)

Like aerial views of container yards — ordered, aligned, purposeful.

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.table th {
  padding: var(--space-3) var(--space-4);
  
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  text-align: left;
  
  background: var(--concrete-light);
  color: var(--concrete-dark);
  border-bottom: 2px solid var(--concrete);
}

.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--concrete);
  color: var(--asphalt-deep);
}

.table tr:hover td {
  background: var(--white-warm);
}
```

### Dividers (The Horizon)

```css
.divider {
  height: 1px;
  background: var(--concrete);
  margin-block: var(--space-8);
}

.divider--thick {
  height: 2px;
}

.divider--accent {
  height: 3px;
  background: linear-gradient(
    to right,
    var(--signal-orange) 0%,
    var(--signal-orange) 30%,
    var(--concrete) 30%
  );
}
```

---

## Interaction & Motion

### Philosophy

Smart's paintings are **still**. Motion in this interface should be minimal, purposeful, and never frenetic.

```css
:root {
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Hover States

Subtle shifts, like light changing on a surface.

```css
/* Standard interactive element */
.interactive {
  transition: 
    color var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

/* Lift effect - container being selected */
.lift {
  transition: 
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out);
}

.lift:hover {
  transform: translateY(-2px);
}
```

### Focus States

Clear, visible, structural.

```css
/* Focus ring */
:focus-visible {
  outline: 3px solid var(--sky-clear);
  outline-offset: 2px;
}

/* Alternative: inner glow */
.focus-inner:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 3px var(--sky-clear);
}
```

---

## Imagery Guidelines

### Photography Style

If using images:

- **Perspective**: Strong vanishing points, architectural views
- **Subject**: Urban infrastructure, geometric forms, open spaces
- **Light**: Clear, directional, golden hour preferred
- **Color grading**: Warm highlights, muted shadows, slightly desaturated
- **Composition**: Minimal subjects, generous negative space

### Iconography

- **Style**: Geometric, minimal, single-weight strokes
- **Weight**: 1.5–2px stroke
- **Corners**: Slightly rounded (2px radius)
- **Size**: Design on 24px grid, scale as needed

### Decorative Elements

Avoid ornamentation. If decoration is needed:

- Horizontal bands of color (like road markings)
- Simple geometric shapes (rectangles, circles)
- Structural lines (like architectural drawings)

---

## Full CSS Reset & Base

```css
/* ================================
   JEFFREY SMART DESIGN SYSTEM
   Base Stylesheet
   ================================ */

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--asphalt-deep);
  background: var(--white-warm);
}

img, picture, video, canvas, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}

/* Remove default button styles */
button {
  background: none;
  border: none;
  cursor: pointer;
}

/* Links */
a {
  color: var(--signal-orange);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--duration-fast) var(--ease-out);
}

a:hover {
  color: var(--terracotta);
}

/* Selection */
::selection {
  background: var(--sky-clear);
  color: var(--white-pure);
}

/* Scrollbar (Webkit) */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: var(--concrete-light);
}

::-webkit-scrollbar-thumb {
  background: var(--concrete);
  border: 2px solid var(--concrete-light);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--concrete-dark);
}
```

---

## Example Page Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Name</title>
  <link rel="stylesheet" href="smart.css">
</head>
<body>
  
  <!-- Navigation: The Highway -->
  <nav class="nav">
    <a href="/" class="nav__brand">AppName</a>
    <a href="/projects" class="nav__link nav__link--active">Projects</a>
    <a href="/data" class="nav__link">Data</a>
    <a href="/settings" class="nav__link">Settings</a>
  </nav>
  
  <!-- Hero: Sky & Ground -->
  <section class="band band--hero">
    <div class="container">
      <p class="label">Dashboard</p>
      <h1>Your Projects</h1>
      <p class="lead">Manage and monitor your work.</p>
    </div>
  </section>
  
  <!-- Content Band: The Ground Plane -->
  <main class="band">
    <div class="container">
      
      <!-- Cards: The Container Yard -->
      <div class="grid--cards">
        
        <article class="card">
          <p class="label">Project</p>
          <h3>Infrastructure Analysis</h3>
          <p>Urban planning data visualization system.</p>
          <div class="card__footer">
            <a href="#" class="button button--ghost">View</a>
          </div>
        </article>
        
        <article class="card card--orange">
          <p class="label">Highlighted</p>
          <h3>Transit Mapping</h3>
          <p>Real-time transportation network.</p>
          <div class="card__footer">
            <a href="#" class="button">Open</a>
          </div>
        </article>
        
        <article class="card">
          <p class="label">Project</p>
          <h3>Environmental Monitor</h3>
          <p>Sensor data collection and analysis.</p>
          <div class="card__footer">
            <a href="#" class="button button--ghost">View</a>
          </div>
        </article>
        
      </div>
      
    </div>
  </main>
  
  <!-- Footer: The Far Horizon -->
  <footer class="band band--ground">
    <div class="container">
      <p class="mono">© 2025 AppName</p>
    </div>
  </footer>
  
</body>
</html>
```

---

## Summary: The Jeffrey Smart Checklist

Before shipping any screen, verify:

- [ ] **Geometry is purposeful** — No decorative elements without function
- [ ] **Palette is disciplined** — Using only defined colors, warm undertone
- [ ] **Shadows are directional** — Single light source, hard or semi-hard edges
- [ ] **Typography is utilitarian** — Clear hierarchy, industrial feel
- [ ] **Space is generous** — Let elements breathe, embrace emptiness
- [ ] **Horizon exists** — Clear bands, ground dominates, sky above
- [ ] **Motion is minimal** — Subtle, functional, never decorative
- [ ] **Focus is visible** — Clear indication of interactive states
- [ ] **The solitary figure** — User's attention point is clear and singular

---

*"I love the way a freeway curves... I find it beautiful. I'm not trying to make any comment."*
— Jeffrey Smart
