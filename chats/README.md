# ADE Chat Archive - Source of Truth

## Purpose
This folder contains the **original user conversations** that serve as the source material for generating APML specifications. Each chat represents a user's natural language description of what they want to build.

## Workflow
1. **User Chat** → Detailed conversation about app requirements
2. **APML Generation** → L1_ORCH processes chat into tri-purpose spec
3. **Implementation** → L3 workers build exactly what was discussed

## Tri-Purpose APML Output
From each chat, we generate APML that is:
- **Human Readable:** Users can understand what's being built
- **LLM Parseable:** AI agents can interpret and execute 
- **Code Compilable:** Direct translation to working code

## File Structure
- `[app-name]-explained.md` - Original user conversation/requirements
- `[app-name].apml` - Generated specification (in parent directories)
- `[app-name]/*` - Implemented components/code

## Current Chat Archive
- `master-app-explained.md` - Overall ADE Phone App conversation
- `analyze-phase-explained.md` - User discussion of analysis requirements
- `visualize-explained.md` - User explanation of visualization needs
- `eyetest-compare-explained.md` - User A/B testing requirements
- `journey-timeline-explained.md` - User journey mapping discussion
- `APML_GOVERNANCE-explained.md` - Governance rules conversation
- `L3_IMPLEMENTATION_ORDERS-explained.md` - Implementation instructions chat

## Usage in Production
When ADE builds apps for real users:
1. User has natural conversation about their app idea
2. Conversation gets saved in `/chats/[project-name]-explained.md`
3. L1_ORCH generates APML specs from this source material
4. L3 workers implement exactly what the user described
5. User can always reference original conversation for context

## Single Source of Truth
These chats are the **authoritative source** - all APML specs derive from these user conversations. Any changes to requirements should update both the chat and regenerate the APML.