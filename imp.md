To use an **Elegant Serif font for headings** and a **Sans-serif font for body text** in **Tailwind CSS + Vite**, follow these steps:
(to use our custome font too using local font styles)
---

## ✅ 1️⃣ Install Your Fonts

You can either:

* Use **Google Fonts**
* Or install local/custom fonts

### Example (Google Fonts)

Let’s say:

* Heading font: **Playfair Display** (elegant serif)
* Body font: **Inter** (clean sans-serif)

Add this to your `index.html` inside `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
```

---

## ✅ 2️⃣ Configure Tailwind

Open `tailwind.config.js` and extend the font families:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

---

## ✅ 3️⃣ Apply Fonts Globally

In your main CSS file (e.g. `src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Set default body font */
body {
  @apply font-body;
}

/* Optional: Set headings automatically */
h1, h2, h3, h4, h5, h6 {
  @apply font-heading;
}
```

---

## ✅ 4️⃣ Or Apply Per Component

Instead of global styling, you can use classes:

```html
<h1 class="font-heading text-4xl">Elegant Heading</h1>
<p class="font-body text-gray-600">
  This is clean sans-serif body text.
</p>
```

---

# 💎 Alternative: Using Local Font Files

If you have `.woff` or `.ttf` files:

### 1. Put them in:

```
src/assets/fonts/
```

### 2. Declare in CSS:

```css
@font-face {
  font-family: 'ElegantSerif';
  src: url('./assets/fonts/ElegantSerif.woff2') format('woff2');
}

@font-face {
  font-family: 'ModernSans';
  src: url('./assets/fonts/ModernSans.woff2') format('woff2');
}
```

### 3. Add to Tailwind config:

```js
extend: {
  fontFamily: {
    heading: ['ElegantSerif', 'serif'],
    body: ['ModernSans', 'sans-serif'],
  },
}
```

---

# 🔥 Best Practice Setup (Clean Architecture)

Most projects use:

* Default body font globally
* Custom `font-heading` utility for headings
* Consistent typography scale (`text-xl`, `text-2xl`, etc.)

---

If you tell me:

* React or Vue?
* Tailwind v3 or v4?
* Google font or custom font?

I can tailor it exactly to your setup.
