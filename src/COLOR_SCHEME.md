# Obsidian - Stealth Mode Color Scheme 🖤⚡

## Design Philosophy
**"We're serious about tech, but we look damn good doing it."**

Black = Power & Mystery  
Gray = Balance & Modernity  
Purple Accent = Intelligence & Luxury

---

## Color Palette

### Primary Colors (Dominance)
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Background** | Jet Black | `#0A0A0A` | Main app background, deep matte finish |
| **Secondary Background** | Graphite Gray | `#1E1E1E` | Cards, containers, sections |
| **Tertiary Background** | Subtle Gray | `#2C2C2C` | Borders, dividers, subtle separators |

### Text Colors
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Text** | Off-White | `#EDEDED` | Main headings, important text |
| **Secondary Text** | Cool Gray | `#A0A0A0` | Descriptions, labels, muted content |

### Accent Colors (Strategic Use Only)
| Role | Color Name | Hex Code | Usage |
|------|------------|----------|-------|
| **Primary Accent** | Electric Purple | `#8A2BE2` | CTAs, active states, primary actions |
| **Secondary Accent** | Light Purple | `#B388FF` | Highlights, icons, secondary emphasis |
| **Accent Dark** | Deep Purple | `#5C00C5` | Gradient endpoints, shadows |

---

## Visual Effects

### Glassmorphism
```css
background: rgba(30, 30, 30, 0.6);
backdrop-filter: blur(12px);
border: 1px solid #2C2C2C;
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
```

### Electric Purple Gradient (Buttons)
```css
background: linear-gradient(135deg, #8A2BE2 0%, #5C00C5 100%);
```

### Neon Border Effect
```css
border: 1px solid #8A2BE2;
box-shadow: 0 0 10px rgba(138, 43, 226, 0.5),
            inset 0 0 10px rgba(138, 43, 226, 0.1);
```

### Pulse Glow Animation
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(138, 43, 226, 0.3); }
  50% { box-shadow: 0 0 40px rgba(138, 43, 226, 0.6); }
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

## Component Color Usage

### Navigation Sidebar
- **Background**: `#0A0A0A` (Jet Black)
- **Logo Icon**: Electric Purple Gradient with neon glow
- **Active Nav Item**: Purple gradient background + neon border
- **Hover State**: `#2C2C2C/50` with subtle purple border

### Cards & Containers
- **Background**: Glassmorphic `#1E1E1E` with blur
- **Border**: `#2C2C2C`
- **Hover**: Subtle electric purple glow

### Buttons
- **Primary**: Purple gradient (`#8A2BE2` → `#5C00C5`) + neon border
- **Secondary**: Transparent with gray border
- **Hover**: Shimmer effect overlay

### Text Elements
- **Headings**: `#EDEDED` with optional purple gradient for emphasis
- **Body**: `#EDEDED`
- **Muted**: `#A0A0A0`
- **Links/Accents**: `#B388FF`

### Progress Bars & XP
- **Track**: `#2C2C2C`
- **Fill**: Purple gradient
- **Glow**: Electric purple shadow

---

## Design Principles

1. **Black Dominance**: 70% of the UI should be black/dark gray
2. **Gray Balance**: 20% subtle gray for structure  
3. **Purple Accent**: 10% strategic purple for emphasis
4. **Minimal Contrast**: Soft, easy on the eyes - no harsh whites
5. **Subtle Glow**: Purple glows should be elegant, not overwhelming
6. **Clean Lines**: Sharp borders with `#2C2C2C` for definition
7. **Glassmorphism**: Layered depth with blur effects

---

## Typography
- **Headings**: Montserrat (600-800 weight)
- **Body**: Inter (400-500 weight)
- **Color**: Primarily `#EDEDED`, muted `#A0A0A0`

---

## Mood Board Keywords
- Stealth
- Premium Tech
- AI Intelligence
- Minimalist Elegance
- Neon Accents
- Dark Luxury
- Futuristic Professional
- Serious but Sexy

---

**Built by Team Obsidian** ✨
