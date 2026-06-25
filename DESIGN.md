# Design

## Style Summary

上岸资料库采用 Apple 风格参考的本地学习工具界面：白色主内容面、极浅灰页面底、低饱和蓝色强调、圆角卡片、轻量阴影和清晰留白。整体观感应当安静、可靠、偏桌面工作台，而不是营销页或内容社区。

## Color Palette

| Role | Token / Class | Value | Usage |
| --- | --- | --- | --- |
| Page background | `bg-slate-50` | Tailwind slate 50 | App body and main canvas |
| Surface | `bg-white` | White | Cards, sidebar, controls |
| Primary text | `text-slate-950` / `text-slate-900` | Tailwind slate 950/900 | Headings, task titles, strong labels |
| Secondary text | `text-slate-600` / `text-slate-500` | Tailwind slate 600/500 | Descriptions, metadata, helper copy |
| Border | `border-slate-200`, `ring-slate-200/70` | Tailwind slate 200 | Card boundaries and input outlines |
| Primary accent | `blue-600` | Tailwind blue 600 | Primary actions, active nav, task completion |
| Accent surface | `blue-50`, `blue-100` | Tailwind blue 50/100 | Selected nav, current day, focus rings |
| Success | `emerald-50/700` | Tailwind emerald | Completed state and local status |
| Warning | `amber-50/800` | Tailwind amber | Pending review and yellow mistake level |
| Danger | `red-50/700` | Tailwind red | Delete actions and red mistake level |

Use color sparingly. Blue indicates navigation selection, primary action, and current-day emphasis. Red/yellow/green are semantic, especially for mistake importance and status.

## Typography

Use the system font stack defined in `src/index.css`:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif
```

Type scale is compact and product-oriented:

- Page title: `text-2xl font-semibold tracking-tight`
- Card title: `text-base font-semibold`
- Body and form text: `text-sm`
- Metadata and helper text: `text-xs`

Avoid display typography, oversized hero headings, decorative type pairings, negative letter spacing beyond existing Tailwind `tracking-tight`, and uppercase eyebrow patterns.

## Layout

The default shell is a desktop-first two-column app:

- Fixed left sidebar at `w-64` on large screens
- Main content padded with `px-4 sm:px-6 lg:px-8`
- Content max width `max-w-7xl`
- Mobile collapses into a sticky top header with horizontal nav chips

Primary page composition uses restrained card groups and tables:

- Dashboard: metric row, task panel, progress/status panels
- Plan: large weekly table plus right-side task/countdown controls
- Resources and Mistakes: main editable list plus right-side creation panel
- Settings: form card, data management card, local-running explanation

Do not nest cards inside cards. Repeated rows may use quiet `bg-slate-50` panels inside a card.

## Components

### Card

Defined in `src/components/ui.tsx` as:

```tsx
rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/70
```

Cards are for functional groups, repeated list containers, and settings panels. Keep them flat and quiet.

### Buttons

Primary buttons use `bg-blue-600`, white text, `rounded-xl`, `h-9`, and a small shadow. Secondary buttons use a white surface with slate border. Destructive buttons use red-tinted surfaces and red text.

### Forms

Inputs, selects, and textareas share:

- `rounded-xl`
- `border-slate-200`
- white background
- `text-sm`
- blue focus ring

File uploads use dashed blue-tinted drop areas for creation forms and compact attachment buttons inside existing records.

### Pills

Pills are rounded semantic tags for status, category, and importance. Never rely on color alone; include readable labels such as `红色等级`, `待复习`, or `已掌握`.

### Empty States

Empty states use dashed slate borders and concise instructional copy. Avoid large illustrations and marketing copy.

## Motion

Motion should only reinforce state changes. Current transitions are short hover/focus transitions on buttons, inputs, nav items, and cards. Respect `prefers-reduced-motion` as defined in `src/index.css`. Do not add page-load choreography or decorative animation.

## Data Interaction Rules

- Weekly plan and today's tasks must share the same `tasks` source of truth.
- A task carries `day`, `slot`, `date`, `subject`, `minutes`, and `status`.
- Resources and mistakes can contain `attachments`, stored locally as data URLs for MVP purposes.
- Mistakes carry `importance` as `红`, `黄`, or `绿`, with text labels visible wherever color appears.
- Settings drive countdown copy across dashboard, plan, and settings surfaces.

## Accessibility Notes

Maintain WCAG AA contrast. Keep focus rings visible. Use native form controls where possible. Long file names and task titles should truncate or wrap without breaking layout. Touch targets in the mobile nav and form actions should remain at least 36px high.
