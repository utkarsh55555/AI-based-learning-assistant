# Obsidian - Pure Monochrome Luxury Design 🖤✨

## Design Philosophy
**"Classy. Sexy. Sophisticated. No distractions—just pure elegance."**

Black = Power & Mystery  
Gray = Balance & Sophistication  
Silver/Chrome = Premium Luxury  
White = Strategic Emphasis

---

## Color Palette (NO PURPLE!)

### Base Colors (90% of UI)
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Background** | Jet Black | `#0A0A0A` | Main app background |
| **Secondary Background** | Graphite Gray | `#1E1E1E` | Cards, containers |
| **Borders** | Subtle Gray | `#2C2C2C` | Dividers, separators |

### Text Colors
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Text** | Off-White | `#EDEDED` | Headings, important content |
| **Secondary Text** | Cool Gray | `#A0A0A0` | Descriptions, labels |
| **Bright White** | Pure White | `#FFFFFF` | Strategic highlights only |

### Accent Colors (10% Strategic Use)
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Accent** | Bright Silver | `#E8E8E8` | Primary CTAs, active states |
| **Secondary Accent** | Chrome | `#C0C0C0` | Icons, highlights |
| **Tertiary Accent** | Light Gray | `#A8A8A8` | Subtle emphasis |

---

## Visual Effects

### Chrome/Silver Gradient (Premium Buttons)
```css
background: linear-gradient(135deg, #E8E8E8 0%, #C0C0C0 50%, #A8A8A8 100%);
color: #0A0A0A;
```

### Sophisticated Glow Effect
```css
box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
```

### Metallic Border
```css
border: 1px solid #C0C0C0;
box-shadow: 0 0 15px rgba(192, 192, 192, 0.2),
            inset 0 0 15px rgba(255, 255, 255, 0.05);
```

### Subtle Shimmer
```css
background: linear-gradient(
  90deg,
  transparent 0%,
  rgba(255, 255, 255, 0.08) 50%,
  transparent 100%
);
```

---

## Component Styling

### Buttons (Primary)
- **Background**: Silver gradient (`#E8E8E8` → `#C0C0C0` → `#A8A8A8`)
- **Text**: Jet Black (`#0A0A0A`)
- **Border**: Chrome with subtle glow
- **Hover**: Shimmer overlay effect
- **Active**: Increased glow intensity

### Navigation
- **Active Item**: Silver gradient + chrome border + glow
- **Hover**: `#2C2C2C` with white/10 border
- **Text**: Off-white

### Cards
- **Background**: Glassmorphic `#1E1E1E` with blur
- **Border**: `#2C2C2C`
- **Hover**: Subtle white glow

### Progress Bars & XP
- **Track**: `#2C2C2C`
- **Fill**: Silver gradient with white glow
- **Shadow**: `0 0 10px rgba(255, 255, 255, 0.3)`

### Icons
- **Active/Important**: `#E8E8E8` (bright silver)
- **Normal**: `#A0A0A0` (gray)
- **Disabled**: `#606060` (dark gray)

---

## Glassmorphism Standards
```css
background: rgba(30, 30, 30, 0.6);
backdrop-filter: blur(12px);
border: 1px solid #2C2C2C;
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
```

---

## Animation Guidelines

### Floating Particles
- Color: `rgba(255, 255, 255, 0.1-0.25)`
- Movement: Subtle vertical float
- Opacity: Gentle pulse (0.1 → 0.3)

### Glow Pulse
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
  50% { box-shadow: 0 0 35px rgba(255, 255, 255, 0.2); }
}
```

### Shimmer Effect
```css
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
```

---

## Usage Rules

### ✅ DO:
- Use black & gray for 90% of the UI
- Apply silver/chrome accents sparingly (10%)
- Keep glows subtle and elegant
- Use white text for maximum contrast
- Apply glassmorphism for depth
- Use metallic borders for premium feel

### ❌ DON'T:
- Use bright or saturated colors
- Overuse white (only for strategic emphasis)
- Create harsh contrasts (keep it smooth)
- Use colored icons (stick to monochrome)
- Add unnecessary decorations

---

## Mood & Feel

**Keywords:**
- Stealth Wealth
- Premium Minimalism
- Sophisticated Tech
- Elegant AI
- Luxury Simplicity
- Professional Elite
- Monochrome Mastery
- Chrome Refinement

**Inspiration:**
- High-end luxury watches
- Premium automotive interiors
- Professional photography software
- Elite tech brands
- Architectural minimalism

---

## Typography
- **Headings**: Montserrat (600-800 weight) in `#EDEDED`
- **Body**: Inter (400-500 weight) in `#EDEDED`
- **Muted**: Inter in `#A0A0A0`
- **Emphasis**: Gradient from `#E8E8E8` to `#FFFFFF`

---

**The Result:**
A sophisticated, classy, and sexy monochrome aesthetic that screams "premium AI technology" without any distracting colors. Pure elegance. 🖤✨

**Built by Team Obsidian**