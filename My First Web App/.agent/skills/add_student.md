# Skill: Add Student to Teacherstack

## Description
This skill automates the process of adding a new student to the Teacherstack roster. It updates the student list in the README, adds a new student card to `students.html`, and ensures the color coding matches the design system.

## Triggers
- "Add a student named [Name] with initials [Initials] and color [Color]"
- "I have a new student"

## Steps
1. **Gather Student Info**: If not provided, ask for the student's name, initials, and a hex color (or suggest a harmonious one).
2. **Update README**: 
   - Open `Teacher Command Center/README.md`.
   - Find the "Student Roster" section.
   - Append the new student in the format: `Name (Initials, #HexColor)`.
3. **Update HTML**:
   - Open `students.html`.
   - Find the `<div class="student-grid">` (or equivalent container).
   - Create a new student card using the template:
     ```html
     <div class="student-card" style="--accent-color: #HexColor">
         <div class="student-avatar">Initials</div>
         <span class="student-name">Name</span>
         <div class="student-actions">
             <i class="fa-solid fa-note-sticky"></i>
             <i class="fa-solid fa-chart-line"></i>
         </div>
     </div>
     ```
4. **Verify Navigation**: Ensure the "Students" link in `dashboard.html` correctly points to the updated page.

## Design Rules
- Use vibrant, harmonious colors from the project's design system.
- Maintain alphabetical order in the roster if possible.
