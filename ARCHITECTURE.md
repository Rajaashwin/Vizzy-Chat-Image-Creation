# Vizzy Chat V1 Architecture

This document summarizes the high‑level architecture described in the assessment
"High-Level Architecture for Dev Team" section.  The three main layers and data
flow are outlined below.  See `NEXT_STEP_PLAN.md` for more context and the
full spec excerpts.

## 1. Frontend Layer

* **React-based chat UI** served by Vite.  Source: `frontend/src/`
* **Multimodal input**: text entry, image upload
* **Output rendering**:
  * text blocks (chat bubbles)
  * image grid (default 4 variations)
  * iteration/refinement thread view
  * download & copy-prompt buttons
* Handles session IDs, mode switching (image/chat), and displays model info.

## 2. Orchestration Layer (Backend API)

Located in `backend/main.py` (FastAPI).

### Core Components

1. **Intent Router** – implemented by `interpret_intent()`
   * Uses OpenRouter LLM to classify user messages into intents
   * Categories include visual generation, prompt generation, refinement,
     commentary, and a `user_type` hint (home vs enterprise).

2. **Prompt Constructor** – `construct_prompt()`
   * Combines raw input with orientation, variation count, style clarity.
   * Ensures default of 4 variations and square orientation.

3. **Image Generation Service** – `generate_images()` plus provider helpers
   * Calls HuggingFace, Replicate, OpenRouter in priority order
   * Falls back to Puter.js (frontend) or SVG placeholders
   * Returns list of image URLs and the model label used

4. **Response Formatter** – implicit in `chat()`:
   * Bundles copy text, images, descriptions, refinement suggestions, intent
   * Produces `ChatResponse` objects for the frontend

5. **Session Management** – in-memory dictionary keyed by session ID.
   * Stores conversation history and user taste metadata (intent categories).
   * Stateless; no persistence across restarts (V1 limitation).

### Model Stack

* **LLM** – OpenRouter `openrouter/auto` for both text generation and
  classification
* **Image models** – various third-party APIs as above; Puter.js in the browser
* The system prompt defined in `backend/prompts.py` is injected on every LLM
  call to make the model behave as Vizzy.

### Data Flow

```
User → Chat UI (React)
      POST /chat → Backend
             ↓
        Intent Router → Prompt Constructor
             ↓
        Image Model (if visual) or LLM (if text)
             ↓
        Response Formatter → HTTP response
             ↓
      Chat UI renders text + images/descriptions
```

## 3. Frontend/Backend Integration Notes

* Backend serves the built frontend under the `/vizzychat` path using
  `StaticFiles`.
* Environment separation is handled via `config.js` using
  `window.location.origin` in production.
* Startup greeting logic: the first assistant response contains the
  startup prompt (also displayed as the welcome panel when the page loads).

## 4. V2 Expansion Points (see spec)

* Memory layer / vector store for long-term context
* User preference embedding and profile persistence
* Enterprise brand knowledge base, role-based tuning
* Output-to-video pipeline

## 5. DevOps & MLOps Context

The `ocr_results.txt` provided by the interviewer includes additional notes
on port mappings and Docker commands for the larger Deckoviz/Elinity project.
Those notes are not directly required for Vizzy Chat v1 but may guide future
containerization or deployment work.
