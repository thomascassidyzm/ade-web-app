# L3 Worker Implementation Orders - Your Work Instructions

## What are these orders?

These are your direct work assignments from the system architect (L2_APML_MASTER). Think of them as detailed work tickets that tell you exactly what to build, how to build it, and when it needs to be done.

## ⚠️ Non-Negotiable Rules

Before we get to your assignments, here are the absolute requirements:

### **Must Do:**
- ✅ Implement exactly as specified - no creative liberties
- ✅ Follow all APML specifications to the letter
- ✅ Report completion with proof of your work
- ✅ Report any problems immediately

### **Never Do:**
- ❌ Modify any APML specification files
- ❌ Create new APML files
- ❌ Change the specifications in any way
- ❌ Implement features not listed in the specifications
- ❌ Deviate from mobile-first design principles

## Your Work Queue - 6 Assignments

### 🚨 **ORDER 1 - URGENT** (Complete in 2 hours)
**Job:** Replace VisualizePanel.vue completely
**Worker Type:** Frontend Developer

**What you need to do:**
1. Delete the current VisualizePanel.vue file
2. Build a new one following the master-app.apml blueprint
3. Implement the 3-panel layout from visualize-layout.apml
4. Ensure it works perfectly on mobile phones first
5. Add bottom tab navigation (tabs at the bottom of the screen)

**Success criteria:** 
- Single panel visible on mobile
- Bottom tabs work for navigation
- Adapts to different screen sizes
- All panels sync their data properly

**Reference documents:** master-app.apml, visualize-layout.apml

### 📋 **ORDER 2 - HIGH PRIORITY** (Complete in 4 hours)
**Job:** Refactor VisualizeWireframe.vue
**Worker Type:** Frontend Developer

**What you need to do:**
1. Update the wireframe panel to match the exact specification
2. Set canvas size to exactly 300x400 pixels
3. Provide four drawing tools: rectangle, circle, text, and line
4. Add grid functionality with snap-to-grid feature
5. Include Save, Clear, and Export buttons at the bottom

**Success criteria:**
- Canvas is exactly the right size
- All four tools work properly
- Grid helps users align elements
- Footer buttons are functional

**Reference documents:** visualize-layout.apml

### 🔄 **ORDER 3 - HIGH PRIORITY** (Complete in 4 hours)
**Job:** Refactor VisualizeFlow.vue  
**Worker Type:** Frontend Developer

**What you need to do:**
1. Update the flow panel to match the specification
2. Support four node types: start, process, decision, and end
3. Use smooth Bezier curves for connections between nodes
4. Add auto-layout feature to organize nodes neatly
5. Include Add Node, Layout, and Validate buttons

**Success criteria:**
- All four node types available
- Smooth connections between nodes
- Auto-layout organizes everything nicely
- Footer buttons work correctly

**Reference documents:** visualize-layout.apml

### 🗺️ **ORDER 4 - HIGH PRIORITY** (Complete in 4 hours)
**Job:** Refactor VisualizeJourney.vue
**Worker Type:** Frontend Developer

**What you need to do:**
1. Update the journey panel to match the specification
2. Create a vertical timeline (top to bottom)
3. Build a touchpoint system for user interactions
4. Add emotion tracking for each step
5. Include timeline controls for navigation

**Success criteria:**
- Timeline flows vertically
- Users can add touchpoints
- Emotion tracking works
- Timeline controls are functional

**Reference documents:** visualize-layout.apml

### 🔗 **ORDER 5 - MEDIUM PRIORITY** (Complete in 6 hours)
**Job:** Implement data synchronization system
**Worker Type:** Backend Developer

**What you need to do:**
1. Connect wireframe changes to flow updates
2. Connect flow changes to journey updates
3. Connect journey selections to wireframe highlights
4. Build an event-driven system for real-time updates

**Success criteria:**
- Changes in one panel automatically update others
- Data flows correctly between all panels
- Events trigger properly

**Reference documents:** visualize-layout.apml

### 📱 **ORDER 6 - MEDIUM PRIORITY** (Complete in 6 hours)
**Job:** Mobile navigation implementation
**Worker Type:** Integration Specialist

**What you need to do:**
1. Build bottom tab navigation system
2. Enable smooth phase switching
3. Add transition animations
4. Ensure mobile responsiveness

**Success criteria:**
- Navigation works perfectly on phones
- Smooth animations between phases
- Optimized for mobile use

**Reference documents:** master-app.apml

## Quality Control - What Your Work Will Be Checked Against

Every piece of work you submit must pass these tests:

### **APML Compliance Check**
- Does your implementation match the specification exactly?
- Are all required features present?
- Are there any unauthorized additions?

### **Mobile Responsive Testing**
- Does it work perfectly on phone screens?
- Are touch interactions optimized?
- Does it adapt to different screen sizes?

### **Data Synchronization Validation**
- Do all panels stay in sync?
- Do changes propagate correctly?
- Are events firing as expected?

### **Performance Benchmarks**
- Does it load in under 2 seconds?
- Are interactions responsive (under 100ms)?
- Is memory usage reasonable?

## Reporting Requirements

### **When you start work:**
- Report to L2_APML_MASTER that you're beginning the assignment
- Confirm you understand the requirements

### **When you complete work:**
- Report completion with evidence (screenshots, demo links, etc.)
- Provide test results showing quality gate compliance

### **If you encounter problems:**
- Report blockers immediately - don't wait
- Include specific details about the issue
- Suggest solutions if you have them

### **Daily progress:**
- Send daily status updates
- Report percentage complete
- Highlight any concerns

## When You Need Help - Escalation Process

For ANY of these situations, contact L2_APML_MASTER immediately:

- **Technical Issues:** Can't figure out how to implement something
- **Specification Conflicts:** Requirements seem to contradict each other
- **Resource Constraints:** Need additional tools or access
- **Questions:** Anything is unclear or confusing

## Timeline Summary

- **URGENT work (Order 1):** 2 hours maximum
- **HIGH priority work (Orders 2-4):** 4 hours each
- **MEDIUM priority work (Orders 5-6):** 6 hours each
- **Progress reports:** Daily updates required

## Final Reminders

- This is a direct order from the system architect
- Non-compliance may result in task reassignment
- The architect has final authority on all specifications
- When in doubt, ask rather than guess
- Quality is more important than speed
- Mobile-first design is mandatory for everything

## Success Tips

1. **Read the specifications thoroughly** before starting
2. **Ask questions early** if anything is unclear
3. **Test on mobile devices** frequently during development
4. **Document your work** for easier quality review
5. **Report progress regularly** to stay aligned with expectations

Your work is critical to the success of the entire ADE system. Follow these orders carefully, and you'll contribute to building something amazing!