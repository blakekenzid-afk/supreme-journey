# supreme-journey

# 🍎 Teacherstack — Teacher Command Center
**Owner:** Kenzi Young  
**Stack:** HTML + CSS + Vanilla JS  
**Status:** In Progress

## Overview
Teacherstack is a classroom command center for a Kindergarten teacher. It currently includes a dashboard, a student roster, and an interactive whiteboard workspace.

The working app files are inside:

`My First Web App/Teacher Command Center/`

## Current Project Structure
```
supreme-journey/
├── README.md
└── My First Web App/
    └── Teacher Command Center/
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

## What Is Built

### Dashboard
- Sidebar navigation for teacher tools and planning pages
- Quick action cards for boards, stations, timer, random, check-in, and to-dos
- Live clock card
- Up Next and Today's Schedule panels
- Last Day of School countdown
- Notes area
- Floating action buttons for behavior logs and student notes

### Students Page
- Student roster grid generated from JavaScript data
- Color-coded student avatars
- Floating action buttons matching the dashboard layout

### Whiteboard
- Canvas drawing area
- Drawing toolbar with cursor, pen, eraser, text, shapes, color picker, and brush size
- Clear board, export, and fullscreen controls
- Support files for shared whiteboard helpers and local storage
- Student data available for randomizer-style tools

## Student Roster
22 students are defined in `students.js` and reused across the app.

## Design Notes
- Font: Inter
- Primary accent: `#6366f1`
- Dashboard background: `#c1c2c5`
- Whiteboard background: `#e8e0f0`
- Clock card: `#1a2332`
- Countdown card: `#2e7d6b`
- Icons: Font Awesome 6.4

## Important Project Rules
1. Keep everything free. No paid APIs or subscriptions.
2. Do not rename or move the existing app files unless the navigation is updated with it.
3. Explain technical changes in plain English.
4. Match the Teacherstack style and layout as closely as possible.

## Next Focus
The whiteboard is no longer missing its main JavaScript file. The next work should be improving and finishing whiteboard behavior, not creating the file from scratch.
