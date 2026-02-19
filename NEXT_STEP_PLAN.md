# Next‑Step Plan for Vizzy Chat (Assessment Stage)

The interviewer has provided a set of documents and a detailed set of four sections that describe how the **next version of Vizzy Chat** (v1) should behave. Your current repository is a working proof‑of‑concept, but the next stage requires aligning it with the design/architecture/requirements outlined below.

Below is a breakdown of the four sections taken from the PDF plus corresponding work items. Use the OCR output as additional context for the product domain.

---

## 1. System Prompt — Vizzy Chat v1 (Core Operational Prompt)

This is the instruction block that must be injected into the LLM each time the backend calls the model.  
The text of the prompt is exactly as given in the PDF; you should copy it verbatim into your code or configuration so that the model behaves like a "creative engine" named Vizzy.

**Work items**:
1. Add the full prompt text to a constant in `backend/main.py` (or a separate module) and use it when calling `generate_text()`.
2. Replace the simplistic `intent_prompt` currently used by `interpret_intent()` with logic that includes core prompt instructions (intent classification should still be lightweight).
3. Ensure the prompt covers:
   - multimodal conversational creation
   - default variation count (4)
   - refinement rules
   - personality guidelines
   - capabilities lists (home & enterprise)
   - iteration rules, limitations, etc.
4. Consider storing the prompt in a `.txt` file or environment variable for easier editing.

---

## 2. High‑Level Architecture for Dev Team

The document outlines a three‑layer architecture plus data flow and expansion points.

**Key components to reflect in the repo**:

*Frontend Layer* (already partially implemented with React/Vite)
*Orchestration Layer* (backend):
  - **Intent Router** – classify user input (visual, prompt, refinement, commentary, home/enterprise)
  - **Prompt Constructor** – assemble structured prompts with orientation, style, count, etc. (this could be a helper function)
  - **Image Generation Service** – existing functions (`generate_images_huggingface`, etc.)
  - **Response Formatter** – package URLs, descriptions, suggestions

*Model Stack* – LLM + image models (already using OpenRouter, HF, Replicate, Puter.js)

*Data Flow* – user → UI → backend → router → constructor → model → formatter → UI (we can diagram in README).

**Work items**:
1. Add a new markdown file (`ARCHITECTURE.md`) summarizing the above and drawing the flow (text diagram or ASCII).
2. Refactor `backend/main.py` to clearly separate "Intent Router" and "Prompt Constructor" as functions/classes; add comments referencing the architecture.
3. In UI or code comments, note default of 4 image outputs and iteration thread view.
4. Document V2 expansion points as TODOs (memory layer, brand knowledge base, etc.).

---

## 3. Technical Requirements / Spec (Elite Team Style)

This section lists functional and non‑functional requirements along with constraints and default behaviors.

**Work items**:
1. Write/expand documentation (`REQUIREMENTS.md`) capturing:
   - Core capabilities (conversational interface, multimodal input, 4 variations, etc.)
   - Output requirements (orientation, style descriptor, etc.)
   - Non‑functional requirements (latency targets, stateless sessions, scalability, separation layers).
   - Constraints (no mode switching, intent only, no memory).
   - Behavior rules (never >4 images, offer refinement suggestions, concise responses).
2. Audit the current implementation and make sure it meets these requirements; note any gaps.
3. Add unit tests or validation code to assert default behaviors (e.g., always generate 4 images unless specified).

---

## 4. Startup System Prompt (Runtime Behavior Definition)

This is the message injected at the beginning of every new session (first API call) to define greeting behavior.

**Work items**:
1. Store the startup prompt text in code (e.g. `STARTUP_PROMPT` constant).
2. Modify session creation endpoint (`/chat`) so that when a new `session_id` is generated, the first message from the backend is this startup prompt (or the system can prepend it to the conversation history sent to the LLM).
3. Ensure the frontend displays the greeting only once at the start of a session.

---

## Using the OCR File as Reference

The `ocr_results.txt` contains screenshots from the onboarding slides – they reiterate architectural ports, deployment commands, and product features for Elinity/Deckoviz. Use those notes when implementing DevOps/Dev environment items (e.g., Docker compose snippet, port mappings). They also give domain context (user profiles, AI features, search, etc.) which can inform intent classifications.

---

## Next Steps

1. Decide which of the above work items you want to tackle first.  
   - **A**: Update system prompts and model calls (core LLM behavior).  
   - **B**: Write architecture & requirements docs and refactor backend to match.  
   - **C**: Implement startup greeting logic and session handling.  

2. After you pick a starting point, I’ll make the necessary code and documentation changes step‑by‑step.

Let me know where you’d like to begin, and I’ll start implementing the corresponding changes.