# Skill: Add Whiteboard Tool

## Description
This skill helps the user add a new interactive tool to the `whiteboard.html` interface. It adds the UI element (button/icon) and sets up a placeholder logic in `whiteboard.js`.

## Triggers
- "Add a [Tool Name] tool to the whiteboard"
- "I want to add the [Tool Name] from the README"

## Steps
1. **Identify Target Category**: Check the README for which category the tool belongs to (Classroom Management, Math Tools, etc.).
2. **Modify UI**:
   - Open `whiteboard.html`.
   - Find the corresponding section in the right tools panel (`<div class="tools-section">`).
   - Add a new tool item:
     ```html
     <div class="tool-item" id="tool-[id]" onclick="activateTool('[id]')">
         <i class="fa-solid fa-[icon-name]"></i>
         <span>[Tool Name]</span>
     </div>
     ```
3. **Add Logic**:
   - Open `whiteboard.js` (create it if it doesn't exist).
   - Add a basic handler for the new tool:
     ```javascript
     function activate[ToolName]() {
         console.log("[ToolName] activated");
         // Logic for tool goes here
     }
     ```
4. **Style Update**: Ensure `whiteboard.css` has appropriate hover states and active styles for the new tool.

## Guidelines
- Always use Font Awesome icons.
- Ensure the tool is added to the correct functional group.
- Keep logic modular and separate from other tools.
