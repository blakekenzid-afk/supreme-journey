# 🍎 Teacherstack — Teacher Command Center
**Owner:** Kenzi Young  
**Stack:** HTML + CSS + Vanilla JS  
**Status:** In Progress

## Overview
This project is a classroom command center built for a Kindergarten teacher. It includes a dashboard, a student roster, and an interactive whiteboard.

## Project Structure
```
Teacher Command Center/
├── README.md
├── dashboard.html
├── dashboard.css
├── students.html
├── students.css
├── students.js
├── whiteboard.html
├── whiteboard.css
├── whiteboard-core.js
├── whiteboard-storage.js
└── whiteboard.js
```

## Current Features

### Dashboard
- Sidebar navigation
- Quick action cards
- Live clock
- Up Next panel
- Today's Schedule panel
- Last Day of School countdown
- Notes section
- Floating action buttons

### Students Page
- Student roster grid
- Student cards generated from `students.js`
- Color-coded avatars

### Whiteboard
- Interactive drawing canvas
- Cursor, pen, eraser, text, and shapes tools
- Color picker and brush size control
- Clear, export, and fullscreen actions
- Shared helper logic in `whiteboard-core.js`
- Local storage helpers in `whiteboard-storage.js`

## Student Data
The student roster is stored in `students.js` and reused by the student page and whiteboard tools.

## Design System
- Font: Inter
- Primary accent: `#6366f1`
- Sidebar background: `#ffffff`
- Dashboard background: `#c1c2c5`
- Whiteboard background: `#e8e0f0`
- Clock card: `#1a2332`
- Countdown card: `#2e7d6b`
- Icons: Font Awesome 6.4

## Important Notes
1. Keep everything free.
2. Do not rename or move the existing files unless navigation links are updated too.
3. Explain changes in plain English.
4. Match the Teacherstack look and layout closely.

## Next Step
The main whiteboard JavaScript file already exists. The next step is refining and completing whiteboard behavior.
