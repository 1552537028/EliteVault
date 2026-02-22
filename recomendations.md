I want a premium look website so give me best background color models, I'll go with Luxury Light, now what color is best for buttons,footer,headers

Excellent choice 👌
**Luxury Light (Soft Ivory `#F8F6F2`)** gives a refined, editorial feel.

Now let’s build a **cohesive premium color system** for:

* ✅ Buttons
* ✅ Header (navbar)
* ✅ Footer
* ✅ Hover states

The goal: **elegant contrast without looking loud or cheap.**

---

# 🎨 Core Palette (Luxury Light System)

| Purpose      | Color     | Why                            |
| ------------ | --------- | ------------------------------ |
| Background   | `#F8F6F2` | Soft ivory (premium base)      |
| Primary Text | `#1C1C1C` | Deep charcoal (not pure black) |
| Accent Gold  | `#C6A75E` | Muted gold (luxury feel)       |
| Dark Surface | `#111111` | For footer or strong contrast  |
| Soft Border  | `#E5E0D8` | Subtle separation              |

---

# 🏆 1️⃣ Buttons (Most Important)

Premium buttons should feel:

* Solid
* Calm
* Not neon
* Not too saturated

## 🥇 Best Primary Button (Gold)

```html
<button class="bg-[#C6A75E] text-white px-6 py-3 rounded-md hover:bg-[#B8964F] transition">
  Get Started
</button>
```

Why this works:

* Muted gold feels luxurious
* Slightly darker hover feels intentional

---

## 🥈 Alternative: Dark Charcoal Button (Very Classy)

```html
<button class="bg-[#1C1C1C] text-white px-6 py-3 rounded-md hover:bg-black transition">
  Get Started
</button>
```

Feels:

* Minimal
* Premium
* Confident

This is safer if your brand isn’t “gold luxury”.

---

## 🥉 Ghost Button (Elegant Secondary)

```html
<button class="border border-[#C6A75E] text-[#C6A75E] px-6 py-3 rounded-md hover:bg-[#C6A75E] hover:text-white transition">
  Learn More
</button>
```

Very high-end look.

---

# 🧭 2️⃣ Header (Navbar)

Keep header very clean.

## Option A: Same as background (minimal)

```html
<header class="bg-[#F8F6F2] border-b border-[#E5E0D8]">
```

Looks refined and editorial.

---

## Option B: Slightly Elevated

```html
<header class="bg-white/70 backdrop-blur-md border-b border-[#E5E0D8]">
```

Feels modern and premium.

---

# 🌙 3️⃣ Footer (Make It Rich & Deep)

Premium sites often use **contrast in footer**.

## Best Option: Deep Charcoal Footer

```html
<footer class="bg-[#111111] text-[#F8F6F2]">
```

Why:

* Strong contrast
* Looks intentional
* Feels luxurious

Add gold accent links:

```html
<a class="text-[#C6A75E] hover:text-white transition">
```

---

# ✨ Pro-Level Enhancement (Subtle Gradient Footer)

```html
<footer class="bg-gradient-to-b from-[#111111] to-[#1A1A1A] text-[#F8F6F2]">
```

Subtle gradient = premium effect.

---

# 🎯 Final Recommended Setup (Best Overall Balance)

### Background

```html
bg-[#F8F6F2]
```

### Header

```html
bg-[#F8F6F2] border-b border-[#E5E0D8]
```

### Primary Button

```html
bg-[#C6A75E] hover:bg-[#B8964F] text-white
```

### Footer

```html
bg-[#111111] text-[#F8F6F2]
```

---

# 🚀 Bonus: Small Detail That Makes It 10x More Premium

Use:

* `tracking-wide` on buttons
* `uppercase text-sm` for nav links
* `font-semibold` for buttons
* Very subtle shadows (`shadow-sm` only)

Avoid:

* Bright colors
* Fully black text
* Large border radius (`rounded-xl` feels less premium than `rounded-md`)

---

If you tell me your website type (SaaS, agency, portfolio, etc.), I’ll fine-tune:

* Exact button style
* Section background variations
* Hover animation style
* Premium spacing system
