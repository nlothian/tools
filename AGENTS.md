
# Git
- do not commit to git unless specifically requested

# Design

## UI Style
- Clean, modern interface with rounded corners and subtle shadows
- Purple gradient background (`from-[#667eea] to-[#764ba2]`)
- White card containers with generous padding
- Gray-50 backgrounds for nested sections
- Gray-200 borders for visual separation
- Green for success states and save actions
- Red/amber for errors and delete actions
- Consistent spacing using Tailwind's spacing scale

## Using Tailwind CSS
This project uses Tailwind CSS v4 via the Play CDN. Include it in HTML files like this:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

### Custom Theme Colors
Define custom colors using `@theme` in a `<style type="text/tailwindcss">` block:

```html
<style type="text/tailwindcss">
    @theme {
        --color-primary: #667eea;
        --color-primary-dark: #764ba2;
    }
</style>
```

Then use them as `bg-primary`, `text-primary-dark`, etc.

### Toggle Visibility Classes
For elements that need JavaScript-controlled visibility, keep minimal CSS:

```css
.my-element { display: none; }
.my-element.visible { display: block; }
```

### Common Patterns
- Buttons: `py-2 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors`
- Cards: `bg-white rounded-2xl shadow-2xl p-8`
- Inputs: `w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary`
- Labels: `block mb-2 font-semibold text-gray-800`