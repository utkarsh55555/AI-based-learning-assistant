# Obsidian - Stealth Blue Theme 🔵⚫

## Design Philosophy
**"Elite Tech. Cyber Intelligence. Pure Stealth."**

Black = Power & Foundation  
Dark Blue = Mystery & Depth  
Electric Blue = AI Intelligence & Energy

---

## Color Palette (NO PURPLE/SILVER!)

### Base Colors (Foundation)
| Role | Color Name | Hex Code | Tailwind Class |
|------|------------|----------|----------------|
| **Primary Background** | Jet Black | `#0A0A0A` | `bg-[#0A0A0A]` |
| **Secondary Background** | Dark Blue-Black | `#0F1419` | `bg-[#0F1419]` |
| **Card Background** | Navy Charcoal | `#1A2332` | `bg-[#1A2332]` |

### Text Colors
| Role | Color Name | Hex Code | Tailwind Class |
|------|------------|----------|----------------|
| **Primary Text** | Blue-Tinted White | `#E8EDF4` | `text-[#E8EDF4]` |
| **Secondary Text** | Slate Gray | `#94A3B8` | `text-slate-400` |

### Electric Blue Accents (Primary)
| Role | Color Name | Hex Code | Tailwind Class | Usage |
|------|------------|----------|----------------|-------|
| **Primary Accent** | Electric Blue | `#3B82F6` | `blue-600` | CTAs, active states |
| **Light Accent** | Bright Blue | `#60A5FA` | `blue-400` | Icons, highlights |
| **Deep Accent** | Dark Blue | `#2563EB` | `blue-700` | Gradients, shadows |
| **Darker Blue** | Navy Blue | `#1D4ED8` | `blue-800` | Deep gradients |

### Border & Structural Colors
| Role | Color Name | Hex Code | Tailwind Class |
|------|------------|----------|----------------|
| **Border** | Dark Navy | `#1E293B` | `border-blue-900/30` |
| **Subtle Border** | Blue-Black | `#172554` | `border-blue-950/50` |

---

## Color Replacement Map

### FROM Purple TO Blue
```
purple-400 → blue-400 (#60A5FA)
purple-500 → blue-500 (#3B82F6)
purple-600 → blue-600 (#3B82F6)
purple-700 → blue-700 (#2563EB)
purple-800 → blue-800 (#1D4ED8)
purple-900 → blue-900 (#1E40AF)
purple-950 → blue-950 (#172554)

violet-800 → blue-700
violet-900 → blue-800
```

---

## Visual Effects

### Electric Blue Gradient (Buttons & CTAs)
```css
background: linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%);
color: #FFFFFF;
```

### Cyber Glow Effect
```css
box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
```

### Neon Border
```css
border: 1px solid transparent;
background: 
  linear-gradient(#0F1419, #0F1419) padding-box,
  linear-gradient(135deg, #2563EB, #3B82F6, #60A5FA) border-box;
box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
```

### Pulse Glow Animation
```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.5); }
}
```

---

## Component Styling Guide

### Primary Buttons
```tsx
className="gradient-blue hover:opacity-90 neon-border pulse-glow"
// Background: Electric blue gradient
// Border: Neon blue animated border
// Glow: Pulsing blue shadow
```

### Navigation (Active State)
```tsx
className="gradient-blue neon-border"
// Active nav item gets full blue treatment
```

### Cards & Containers
```tsx
className="glass-card" 
// Background: rgba(15, 20, 25, 0.7) with blue tint
// Border: rgba(59, 130, 246, 0.1)
// Shadow: Blue glow
```

### Progress Bars & XP
```tsx
<div className="bg-blue-950/50 border border-blue-900/30">
  <div className="gradient-blue shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
</div>
```

### Icons (Active/Highlighted)
```tsx
className="text-blue-400"
// Bright electric blue for important icons
```

### Badges
```tsx
className="bg-blue-600/20 border border-blue-500/30"
// Semi-transparent blue background
```

---

## Animation Guidelines

### Floating Particles
```tsx
background: `rgba(59, 130, 246, ${0.2 + Math.random() * 0.4})`
boxShadow: `0 0 ${4 + Math.random() * 6}px rgba(59, 130, 246, 0.6)`
```

### Shimmer Effect
```tsx
background: linear-gradient(
  90deg,
  transparent 0%,
  rgba(59, 130, 246, 0.15) 50%,
  transparent 100%
)
```

---

## Files Updated

### Core Files
- ✅ `/styles/globals.css` - Complete blue theme
- ✅ `/App.tsx` - Landing page, sidebar, nav
- ✅ `/components/ObsidianCore.tsx` - Electric blue crystal
- ✅ `/components/LoginScreen.tsx` - Blue particles, buttons

### Component Files (TO UPDATE)
- ⏳ EnhancedDashboard.tsx
- ⏳ EnhancedChatInterface.tsx
- ⏳ EnhancedQuizMode.tsx
- ⏳ NotesGenerator.tsx
- ⏳ FlashcardCreator.tsx
- ⏳ MindMapBuilder.tsx
- ⏳ StudyTimer.tsx
- ⏳ Leaderboard.tsx
- ⏳ StudyPlanner.tsx
- ⏳ (Legacy components - low priority)

---

## The Vibe

**Keywords:**
- Cyber Intelligence
- Stealth Technology
- Elite Command Center
- AI-Powered Learning
- High-Tech Interface
- Digital Navy
- Electric Energy
- Precision & Power

**Inspiration:**
- Cyberpunk 2077 UI
- Military command centers
- High-end tech dashboards
- NASA control rooms
- AI visualization tools

---

**Result:** 
A sophisticated, high-tech aesthetic that screams "cutting-edge AI learning platform" with electric blue energy pulsing through a stealth black foundation. No purple. No silver. Pure cyber intelligence. 🔵⚡🖤

**Built by Team Obsidian**
