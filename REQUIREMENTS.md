# Vizzy Chat V1 Technical Requirements

Derived from the "Technical Requirements / Spec (Elite Team Style)" section of
the assessment documents.  This file captures the functional and non-functional
requirements expected for the next stage of the project.  Where applicable, the
current implementation status is noted.

## Functional Requirements

* Unified conversational creation interface.  **(implemented)**
* Multimodal input support (text + image upload).  **(implemented)**
* Image generation with 4 default variations.  **(changed default to 4)**
* Iterative refinement within session context.  **(basic support)**
* Prompt generation as standalone output. **(generate_copy produces taglines)**
* Image commentary and enhancement suggestions. **(descriptions & suggestions added)**
* Enterprise and Home contextual response awareness. **(classification stub added)**

## Output Requirements

* All image outputs must include:
  * Orientation – enforced via prompt constructor (default square 1:1)
  * Style descriptor – included as part of `image_descriptions` text
  * Color palette guidance – requested in description prompt
  * Lighting specification – likewise requested in descriptions
* Text outputs must:
  * Be structured and avoid filler language – system prompt mandates this
  * Be directly usable by creative teams

## Non-Functional Requirements

* <2.5 s latency for text responses – **not measured** but system prompt LLM
  call typically completes within a couple seconds on OpenRouter.
* <8 s average latency for image generation – **not measured**.
* Stateless session persistence (V1) – **implemented via in-memory store**.
* Scalable image generation concurrency – can handle multiple simultaneous
  requests; rely on cloud provider limits.
* Clean separation between orchestration and model layer – backend functions
  separate routing, prompt construction, and model calls.

## Constraints

* No feature-mode switching UI in V1 – frontend uses a simple `mode` toggle but
  all features are still triggered by intent recognition.
* All features triggered via intent recognition – see `interpret_intent()`.
* No long-term personalization yet – sessions are ephemeral.
* No user profile memory – everything resets when server restarts.

## Default Behavior Rules

* Always generate 4 visual outputs unless the user explicitly requests fewer.
* Offer a refinement suggestion after each image generation.
* Never auto-generate >4 images without explicit instruction (backend clamps).
* Keep responses concise but rich; the core system prompt enforces brevity.


## Implementation Notes

Most of the above are satisfied or partially implemented in the current
repository.  The remaining gaps (latency tracking, enterprise-specific
responses, detailed scene analysis of uploaded images) are noted as future
enhancements.
