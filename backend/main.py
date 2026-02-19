"""
Vizzy Chat Backend - FastAPI
Uses OpenRouter API for text generation (free tier via Mistral-7B).
Images via Replicate (optional).
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import os
import json
import uuid
from datetime import datetime
import urllib.parse
from dotenv import load_dotenv
import logging
from huggingface_hub import InferenceClient

# Try to import replicate, it's optional
try:
    import replicate
    HAS_REPLICATE = True
except ImportError:
    HAS_REPLICATE = False
    replicate = None

# Configure logging FIRST
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Load environment variables from explicit path
env_path = os.path.join(os.path.dirname(__file__), ".env")
env_exists = os.path.exists(env_path)
logging.info(f"Looking for .env at: {env_path}")
logging.info(f".env file exists: {env_exists}")

load_dotenv(env_path, override=True)

# Clients / keys
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")  # Free tier available
REPLICATE_API_KEY = os.getenv("REPLICATE_API_KEY")

# Debug file contents
try:
    with open(env_path, "r", encoding="utf-8") as f:
        env_contents = f.read()
        logging.info(f".env file contents (first 500 chars): {env_contents[:500]}")
except Exception as e:
    logging.error(f"Could not read .env file: {e}")

# Some users/tools set the variable name to REPLICATE_API_TOKEN; accept both.
if not REPLICATE_API_KEY:
    REPLICATE_API_KEY = os.getenv("REPLICATE_API_TOKEN")

# If still not found, attempt to parse the .env file directly as a last resort.
if not REPLICATE_API_KEY and os.path.exists(env_path):
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if not line or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == "REPLICATE_API_KEY" and v:
                    REPLICATE_API_KEY = v
                    break
                if k == "REPLICATE_API_TOKEN" and v:
                    REPLICATE_API_KEY = v
                    break
    except Exception as e:
        logging.warning(f"Failed to parse .env for replicate key: {e}")

# Normalize empty-string vs None
if REPLICATE_API_KEY == "" or REPLICATE_API_KEY is None:
    REPLICATE_API_KEY = None

# Debug: Log loaded API keys (don't print the full key)
logging.info(f"REPLICATE_API_KEY set: {bool(REPLICATE_API_KEY)}")
logging.info(f"OPENROUTER_API_KEY set: {bool(OPENROUTER_API_KEY)}")
if REPLICATE_API_KEY:
    logging.info(f"Replicate key preview: {REPLICATE_API_KEY[:10]}...")

# Initialize HF client (deprecated, kept for compatibility)
hf_client = None

if HUGGINGFACE_API_KEY:
    try:
        hf_client = InferenceClient(token=HUGGINGFACE_API_KEY)
        logging.info("Hugging Face InferenceClient initialized")
    except Exception as e:
        logging.warning("Failed to initialize HF client: %s", e)

def generate_text(
    prompt: str,
    max_tokens: int = 300,
    temperature: float = 0.7,
    system_prompt: Optional[str] = None,
) -> str:
    """
    Generate text using the OpenRouter API (free tier).

    * `system_prompt` is an optional message that is sent with role="system".
      By default we inject the CORE_SYSTEM_PROMPT defined in prompts.py so that
      the model always behaves like the Vizzy Chat creative engine.

    Falls back to a simple error if the API key is missing.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError(
            "OPENROUTER_API_KEY not set in .env. Get a free key at https://openrouter.ai"
        )

    try:
        import requests

        # Use a fast, free model from OpenRouter
        api_url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        }

        messages = []
        # system message: core prompt or override
        from .prompts import CORE_SYSTEM_PROMPT
        sys_msg = system_prompt if system_prompt is not None else CORE_SYSTEM_PROMPT
        if sys_msg:
            messages.append({"role": "system", "content": sys_msg})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": "openrouter/auto",  # Auto-selects best available free model
            "messages": messages,
            "max_tokens": min(max_tokens, 500),
            "temperature": temperature,
        }

        # Increased timeout for slower networks, with retry logic
        import time

        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = requests.post(api_url, json=payload, headers=headers, timeout=45)
                break
            except requests.Timeout:
                if attempt < max_retries - 1:
                    logging.warning(
                        f"OpenRouter timeout, retry {attempt + 1}/{max_retries}"
                    )
                    time.sleep(1)
                else:
                    raise

        if response.status_code != 200:
            logging.error(
                f"OpenRouter API error: {response.status_code} - {response.text[:200]}"
            )
            raise RuntimeError(
                f"OpenRouter API returned status {response.status_code}"
            )

        data = response.json()

        # Extract generated text from OpenRouter response
        if "choices" in data and len(data["choices"]) > 0:
            text = data["choices"][0].get("message", {}).get("content", "").strip()
        else:
            text = ""

        if text:
            return text

        raise ValueError("No generated text in OpenRouter response")
    except Exception as e:
        logging.error("OpenRouter text_generation failed: %s", e)
        raise


app = FastAPI(title="Vizzy Chat Backend", version="0.1.0")

# Configure CORS origins via ALLOWED_ORIGINS env var (comma-separated).
# Default is '*' for development. In production set to your Pages origin.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_env.strip() == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files (built React app from ../frontend/dist)
frontend_build_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_build_path):
    app.mount("/vizzychat", StaticFiles(directory=frontend_build_path, html=True), name="frontend")
    logging.info(f"Frontend static files mounted from {frontend_build_path}")
else:
    logging.warning(f"Frontend build directory not found at {frontend_build_path}")

# In-memory sessions
sessions = {}


class ChatMessage(BaseModel):
    role: str
    content: str
    images: Optional[List[str]] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    num_images: int = 4  # default to 4 variations per spec
    refinement: Optional[str] = None


class ChatResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    session_id: str
    message: str
    images: List[str]
    # descriptions for each image variation (parallel to images list)
    image_descriptions: Optional[List[str]] = None
    # optional suggestion the user could try for refinement
    refinement_suggestion: Optional[str] = None
    copy: str
    intent_category: str
    conversation_history: List[ChatMessage]
    llm_model: str = "openrouter/auto"  # Text generation model
    image_model: str = "none"  # Image generation model


class UserTaste(BaseModel):
    styles: List[str] = []
    colors: List[str] = []
    moods: List[str] = []
    themes: List[str] = []


def interpret_intent(user_message: str) -> tuple[str, str]:
    """Decode the user's message into an intent and a cleaned prompt.

    Returns (intent_category, prompt_text).  The intent category will be one of
    'creative', 'chat', 'refinement', 'commentary' etc., but we also store it as
    "intent" for backwards compatibility in session tastes.

    The underlying LLM is asked to classify both the type of request and
    whether it appears to be from a home or enterprise user.  The home/enterprise
    flag is currently ignored by the backend but could be used later.
    """
    intent_prompt = f"""
You are an AI art director. Analyze the user's request and return a JSON
object with the following keys:
  - intent: one of ['creative', 'chat', 'refinement', 'commentary'] describing
    the general intent
  - prompt: a cleaned prompt suitable for use with an image model or generative
    API
  - user_type: either 'home' or 'enterprise' depending on whether the request
    seems consumer-oriented or business/brand-oriented

User request: "{user_message}"

Respond with JSON only.
"""
    try:
        if not OPENROUTER_API_KEY:
            logging.warning(
                "OpenRouter API not available; returning default intent"
            )
            return "creative", user_message
        text = generate_text(intent_prompt, max_tokens=300, temperature=0.7)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == -1:
            logging.warning("Couldn't find JSON in intent response; using defaults")
            return "creative", user_message
        parsed = json.loads(text[start:end])
        intent = parsed.get("intent", "creative")
        prompt = parsed.get("prompt", user_message)
        # user_type = parsed.get("user_type", "home")  # unused for now
        return intent, prompt
    except Exception as e:
        logging.error("interpret_intent failed: %s", e)
        return "creative", user_message


def construct_prompt(base_prompt: str, intent: str, num_images: int) -> str:
    """Build a fully structured prompt for image/text generation.

    Injects default orientation, variation count and style clarity.  The intent is
    currently unused but may influence wording in the future.
    """
    # default orientation and size instructions
    orientation_instr = (
        "square 1:1 orientation"  # default; could be modified by parsing directives
    )
    return (
        f"{base_prompt}\n\nGenerate {num_images} variations in {orientation_instr}. "
        "Keep descriptions focused on style, lighting, color palette, and mood."
    )


def generate_copy(prompt: str, intent: str) -> str:
    copy_prompt = f"Create a short, poetic one-liner (max 15 words) for this artwork.\nRequest: {prompt}\nIntent: {intent}\nRespond with only the tagline."
    try:
        if not OPENROUTER_API_KEY:
            return "A beautiful creation from your imagination."
        text = generate_text(copy_prompt, max_tokens=60, temperature=0.8)
        return text.strip() or "A beautiful creation from your imagination."
    except Exception as e:
        logging.error("generate_copy failed: %s", e)
        return "A beautiful creation from your imagination."


def describe_image_variations(prompt: str, num_images: int) -> List[str]:
    """Return a list of short descriptions for each variation of the prompt.

    The model is asked to supply numbered labels for each variation that can be
    shown alongside the generated images.  If the LLM fails we fall back to a
    simple default list.
    """
    if num_images <= 0:
        return []
    try:
        desc_prompt = (
            f"You are an assistant that generates concise descriptions for each of "
            f"{num_images} image variations based on the following prompt:\n" 
            f"'{prompt}'\n"
            "Each description should be a short phrase or sentence that includes "
            "an orientation hint (e.g. 16:9, portrait), a style/mood cue, a color "
            "or lighting note if relevant, and should be numbered from 1 to "
            f"{num_images}. Separate entries with newlines."
        )
        text = generate_text(desc_prompt, max_tokens=100, temperature=0.7)
        lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
        # try to take last `num_images` lines if model outputs extra
        if len(lines) >= num_images:
            return lines[:num_images]
        # pad with generic labels
        return lines + [f"Variation {i+1}" for i in range(len(lines), num_images)]
    except Exception as e:
        logging.error("describe_image_variations failed: %s", e)
        return [f"Variation {i+1}" for i in range(num_images)]


def generate_refinement_suggestion(prompt: str) -> str:
    """Ask the LLM to suggest a single simple refinement idea for the prompt.

    This suggestion can be shown to the user after every generation to nudge the
    next iteration.  If the LLM fails, returns an empty string.
    """
    if not OPENROUTER_API_KEY:
        return ""
    try:
        suggestion_prompt = (
            f"Suggest a concise refinement or tweak the user could make to the "
            f"prompt '{prompt}' in order to change the output. Respond with one "
            "sentence only."
        )
        text = generate_text(suggestion_prompt, max_tokens=60, temperature=0.7)
        return text.strip()
    except Exception as e:
        logging.error("generate_refinement_suggestion failed: %s", e)
        return ""


def generate_images_huggingface(prompt: str, num_images: int = 4) -> tuple[List[str], str]:
    """
    Generate images using HuggingFace's free inference API.
    Tries multiple free-tier models with fallback strategy.
    Returns tuple of (image_urls, model_used).
    """
    if not HUGGINGFACE_API_KEY or not hf_client:
        logging.warning("HUGGINGFACE_API_KEY not set or client not initialized, skipping HF")
        return [], "Placeholder (no HuggingFace key)"
    
    try:
        import base64
        from io import BytesIO
        
        # Models to try in order of preference (free/stable first)
        models_to_try = [
            "stabilityai/stable-diffusion-xl-base-1.0",
            "black-forest-labs/FLUX.1-schnell",
            "prithivMLand/Consistent_ID_ComfyUI",
            None  # Default model as last resort
        ]
        
        for model_name in models_to_try:
            try:
                if model_name:
                    logging.info(f"Attempting {model_name.split('/')[-1]}...")
                else:
                    logging.info(f"Attempting default HuggingFace model...")
                
                images = []
                for i in range(num_images):
                    try:
                        if model_name:
                            image = hf_client.text_to_image(prompt, model=model_name)
                        else:
                            image = hf_client.text_to_image(prompt)
                        
                        if image:
                            # Convert PIL image to base64 data URL
                            buffered = BytesIO()
                            image.save(buffered, format="PNG")
                            img_str = base64.b64encode(buffered.getvalue()).decode()
                            data_url = f"data:image/png;base64,{img_str}"
                            images.append(data_url)
                            logging.info(f"Generated image {i+1}/{num_images}")
                    except Exception as e_inner:
                        logging.warning(f"Image {i+1} failed: {str(e_inner)[:100]}, continuing...")
                        continue
                
                if images:
                    model_label = model_name.split('/')[-1] if model_name else "HuggingFace (default)"
                    logging.info(f"Successfully generated {len(images)} images via {model_label}")
                    return images[:num_images], f"HuggingFace ({model_label})"
                else:
                    logging.warning(f"No images generated with {model_name or 'default'}")
                    continue
                    
            except Exception as e:
                err_str = str(e)
                if "402" in err_str:
                    logging.warning(f"{model_name or 'default'}: requires payment, trying next...")
                elif "403" in err_str:
                    logging.warning(f"{model_name or 'default'}: forbidden access, trying next...")
                elif "410" in err_str:
                    logging.warning(f"{model_name or 'default'}: discontinued, trying next...")
                else:
                    logging.warning(f"{model_name or 'default'} failed: {str(e)[:80]}, trying next...")
                continue
        
        # All models failed
        logging.error("All HuggingFace models exhausted")
        return [], "Placeholder (HuggingFace all models failed)"
            
    except Exception as e:
        logging.error(f"HuggingFace image generation failed: {e}")
        return [], "Placeholder (HuggingFace error)"


def generate_images_openrouter(prompt: str, num_images: int = 2) -> tuple[List[str], str]:
    """
    Generate images using OpenRouter's Flux AI image generation API.
    Flux is free on OpenRouter and produces high-quality images.
    Falls back to colored SVG placeholders if API unavailable.
    Returns tuple of (image_urls, model_used).
    """
    if not OPENROUTER_API_KEY:
        logging.warning("OPENROUTER_API_KEY not set for image generation, using placeholders")
        return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (no API key)"
    
    try:
        import requests
        import time
        
        # OpenRouter image generation endpoint - Flux AI is free
        api_url = "https://openrouter.ai/api/v1/images/generations"
        
        logging.info(f"Generating {num_images} images via OpenRouter Flux for: {prompt[:50]}...")
        
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "black-forest-labs/flux-pro",  # Flux AI - free, high quality
            "prompt": prompt,
            "num_images": min(num_images, 2),  # OpenRouter currently supports max 2
            "size": "512x512",
            "response_format": "url"  # Return URLs instead of base64
        }
        
        # Make request with timeout and retry on timeout
        max_retries = 2
        response = None
        
        for attempt in range(max_retries):
            try:
                response = requests.post(api_url, json=payload, headers=headers, timeout=45)
                break
            except requests.Timeout:
                if attempt < max_retries - 1:
                    logging.warning(f"Timeout occurred, retrying ({attempt + 1}/{max_retries})...")
                    time.sleep(2)  # Wait before retrying
                else:
                    logging.error("Max retries reached, using placeholders")
                    return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (timeout)"

        if response and response.status_code == 200:
            try:
                data = response.json()
                image_urls = data.get("images", [])
                if len(image_urls) < num_images:
                    logging.warning("Fewer images returned than requested, using placeholders")
                    return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (partial response)"
                return image_urls, "OpenRouter Flux"
            except json.JSONDecodeError:
                logging.error("Invalid JSON response, using placeholders")
                return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (invalid JSON)"
        else:
            logging.error(f"OpenRouter API error: {response.status_code if response else 'No response'}")
            return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (API error)"
    except Exception as e:
        logging.error("OpenRouter image_generation failed: %s", e)
        raise


def generate_images_replicate(prompt: str, num_images: int = 3) -> tuple[List[str], str]:
    """Generate images using Replicate Flux Schnell model if available, else return placeholders."""
    if not REPLICATE_API_KEY or not HAS_REPLICATE:
        return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (no Replicate key or module)"

    try:
        # Set Replicate API token
        import os as os_module
        os_module.environ["REPLICATE_API_TOKEN"] = REPLICATE_API_KEY
        
        logging.info(f"Calling Replicate Flux Schnell with token (first 10): {REPLICATE_API_KEY[:10]}...")
        
        # Use Flux Schnell - a free, fast, open-source image generation model
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt,
                "go_fast": True,
                "num_outputs": num_images,
                "aspect_ratio": "1:1",
                "output_format": "webp",
                "output_quality": 80
            }
        )
        logging.info(f"Replicate output type: {type(output)}, length: {len(output) if isinstance(output, list) else 'N/A'}")
        
        if output:
            if isinstance(output, list) and len(output) > 0:
                logging.info(f"Successfully generated {len(output)} images from Replicate Flux Schnell")
                return output[:num_images], "Replicate (Flux Schnell)"
            else:
                logging.warning("Replicate returned unexpected output format")
                return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (Replicate invalid output)"
        else:
            logging.warning("Replicate returned no images")
            return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (Replicate no output)"
            
    except Exception as e:
        logging.error(f"Replicate image generation failed: {e}")
        return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (Replicate error)"


def generate_images(prompt: str, num_images: int = 2) -> tuple[List[str], str]:
    """
    Intelligently generate images with fallback chain:
    1. HuggingFace (free, no credits needed)
    2. Replicate (if API key available)
    3. OpenRouter (if API key available)
    4. SVG placeholders (final fallback)
    Returns tuple of (image_urls, model_name).
    """
    logging.info(f"generate_images() called: HF={'yes' if hf_client else 'no'}, REP={HAS_REPLICATE}, OR={'yes' if OPENROUTER_API_KEY else 'no'}")
    
    # Priority 1: Try HuggingFace FREE inference (no credits needed)
    logging.info("Priority 1: Attempting HuggingFace free inference...")
    try:
        images, model = generate_images_huggingface(prompt, num_images)
        if images and "Placeholder" not in model:
            logging.info(f"✓ Generated images via {model}")
            return images, model
        else:
            logging.info(f"HuggingFace returned: {model}")
    except Exception as e:
        logging.warning(f"HuggingFace failed ({e}), trying Replicate...")
    
    # Priority 2: Try Replicate if API key available (for when user adds credits)
    if REPLICATE_API_KEY and HAS_REPLICATE:
        logging.info("Priority 2: Attempting Replicate...")
        try:
            images, model = generate_images_replicate(prompt, num_images)
            if images and not "Placeholder" in model:
                logging.info(f"✓ Generated images via {model}")
                return images, model
            else:
                logging.info(f"Replicate returned: {model}")
        except Exception as e:
            logging.warning(f"Replicate failed ({e}), trying OpenRouter...")
    
    # Priority 3: Try OpenRouter (if endpoint available)
    if OPENROUTER_API_KEY:
        logging.info("Priority 3: Attempting OpenRouter...")
        try:
            images, model = generate_images_openrouter(prompt, num_images)
            if images and not "Placeholder" in model:
                logging.info(f"✓ Generated images via {model}")
                return images, model
        except Exception as e:
            logging.warning(f"OpenRouter failed ({e}), using SVG fallback...")
    
    # Priority 4: Fallback to colored SVG placeholders
    logging.info("Using SVG placeholder images (all providers exhausted)")
    return _generate_placeholder_images(num_images, seed_prompt=prompt), "Placeholder (SVG - colored by prompt)"


def generate_chat_reply(user_message: str) -> str:
    """Generate a conversational reply to a purely textual message.

    The core system prompt defined in prompts.py is automatically included via
    :func:`generate_text`.  We don't need our own mini-system prompt here.
    """
    try:
        if not OPENROUTER_API_KEY:
            logging.warning("OpenRouter API not configured; returning local fallback")
            return "I can help with image ideas and copy — what would you like to create?"
        text = generate_text(user_message, max_tokens=300, temperature=0.7)
        return text.strip()
    except Exception as e:
        logging.error("generate_chat_reply failed: %s", e)
        text = user_message.strip().lower()
        if any(k in text for k in ("summarize", "explain", "what is", "what's")):
            return (
                "Vizzy Chat is a conversational AI creative assistant that helps you generate images, "
                "write content, and explore creative ideas through visual brainstorming. "
                "Would you like me to help you create something specific?"
            )
        elif any(w in text for w in ("how", "why", "when", "where", "who", "what")) or "?" in text:
            return (
                f"That's an interesting question about '{user_message}'. "
                "I'd love to help! Vizzy Chat can generate images, write creative copy, or discuss ideas. "
                "What would you like to explore today?"
            )
        else:
            return (
                f"Thanks for sharing '{user_message}' with me. "
                "I can help you create visuals, write content, or brainstorm ideas. "
                "What sounds interesting to you?"
            )


@app.on_event("startup")
async def startup():
    print("[*] Vizzy Chat Backend started")
    print(f"OpenRouter API configured: {bool(OPENROUTER_API_KEY)}")
    print(f"Replicate key available: {bool(REPLICATE_API_KEY)}")


@app.get("/")
async def root():
    return {
        "app": "Vizzy Chat Backend",
        "version": "0.1.0",
        "endpoints": {
            "POST /chat": "Send a message and get generated images + copy",
            "POST /upload": "Upload an image for analysis and suggested transformations",
            "GET /session/{session_id}": "Retrieve session history",
        }
    }


from fastapi import UploadFile, File

@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Accept an image upload and provide simple analysis and options.

    This is a placeholder implementation to satisfy the spec; a full version
    would run vision analysis on the bytes.  We currently return a generic
    description and a few suggested transformations.
    """
    # read but do not store the file
    try:
        contents = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to read upload")

    # dummy analysis text
    analysis = (
        "This image appears well-composed with balanced lighting. "
        "You could try enhancing contrast or applying a stylistic filter."
    )
    transform_options = [
        "Convert to watercolor style",
        "Increase brightness and contrast",
        "Crop to a square format",
    ]
    return {"analysis": analysis, "transform_options": transform_options}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # create or resume session
    session_id = request.session_id or str(uuid.uuid4())
    is_new = session_id not in sessions
    if is_new:
        sessions[session_id] = {
            "created_at": datetime.now().isoformat(),
            "messages": [],
            "taste": UserTaste(),
        }
    session = sessions[session_id]

    image_model_used = "none"
    descriptions: Optional[List[str]] = None
    suggestion: str = ""
    
    # (startup greeting will be prefixed to the first reply; no need to
    # duplicate it in session history here)

    # allow special instruction like "try 3 more options" to adjust count
    if request.num_images > 0:
        import re
        m = re.search(r"try\s+(\d+)\s+more options", request.message, re.I)
        if m:
            try:
                suggested = int(m.group(1))
                logging.info(f"Iteration request detected, generating {suggested} images")
                request.num_images = suggested
            except ValueError:
                pass

    if request.num_images == 0:
        # Chat mode: only text, no images
        reply = generate_chat_reply(request.message)
        copy_text = reply
        images = []
        intent_category = "chat"
    else:
        # Image mode: generate images + copy
        intent_category, base_prompt = interpret_intent(request.message)
        # build a structured prompt with defaults
        final_prompt = construct_prompt(base_prompt, intent_category, request.num_images)

        # Generate images (tries Replicate first, then OpenRouter, then falls back to colored SVGs)
        images, image_model_used = generate_images(final_prompt, min(request.num_images, 4))
        
        copy_text = generate_copy(request.message, intent_category)
        # describe variations so frontend can show concise labels
        descriptions = describe_image_variations(final_prompt, len(images))
        # suggest one quick refinement idea for the user
        suggestion = generate_refinement_suggestion(final_prompt)

    # if this was the first response of a session, prepend the startup greeting
    if is_new:
        from .prompts import STARTUP_PROMPT
        copy_text = STARTUP_PROMPT + "\n\n" + copy_text

    user_msg = ChatMessage(role="user", content=request.message)
    assistant_msg = ChatMessage(role="assistant", content=copy_text, images=images)
    session["messages"].append(user_msg.model_dump())
    session["messages"].append(assistant_msg.model_dump())

    if intent_category and intent_category not in session["taste"].themes:
        session["taste"].themes.append(intent_category)

    return ChatResponse(
        session_id=session_id,
        message=copy_text,
        images=images,
        image_descriptions=descriptions if images else None,
        refinement_suggestion=suggestion if not is_new else suggestion,
        copy=copy_text,
        intent_category=intent_category,
        conversation_history=[ChatMessage(**m) for m in session["messages"]],
        llm_model="openrouter/auto",
        image_model=image_model_used,
    )


@app.post("/refine", response_model=ChatResponse)
async def refine(request: ChatRequest):
    if not request.session_id or request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    refined_message = f"{request.message}. {request.refinement or ''}"
    refined_request = ChatRequest(session_id=request.session_id, message=refined_message, num_images=request.num_images)
    return await chat(refined_request)


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, **sessions[session_id]}


def _generate_placeholder_images(num_images: int, seed_prompt: str) -> List[str]:
    """
    Generate placeholder images with unique colors based on the seed prompt.
    Each image is represented as an SVG data URL.
    """
    import hashlib
    import random

    # Generate a deterministic hash from the seed prompt
    hash_val = hashlib.md5(seed_prompt.encode()).hexdigest()
    random.seed(hash_val)

    demo_images = []
    for i in range(num_images):
        hue = (int(hash_val, 16) + i * 120) % 360  # Spread hues evenly
        saturation = random.randint(60, 100)  # Saturation between 60-100%
        lightness = random.randint(50, 80)  # Lightness between 50-80%
        color = f"hsl({hue}, {saturation}%, {lightness}%)"

        # Create SVG with gradient background
        svg = (
            f"<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'>"
            f"<rect width='100%' height='100%' fill='{color}'/>"
            f"<text x='50%' y='50%' font-size='24' fill='white' text-anchor='middle' dominant-baseline='middle'>"
            f"Placeholder {i+1}</text>"
            f"</svg>"
        )
        data_url = "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(svg)
        demo_images.append(data_url)

    return demo_images


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
