# 🎨 Vizzy Chat - AI Creative Assistant

> A modern dual-mode chat & image generation platform powered by OpenRouter & HuggingFace

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Python](https://img.shields.io/badge/python-3.12-blue)
![FastAPI](https://img.shields.io/badge/fastapi-0.104-teal)
![React](https://img.shields.io/badge/react-18-61dafb)

---

## 🚀 Live Demo

- **Frontend:** https://ashwin-rajakannan.github.io/vizzy-chat/
- **Backend API:** https://vizzy-backend.railway.app/
- **API Documentation:** https://vizzy-backend.railway.app/docs

---

## ✨ Features

### 🎯 Intent‑Driven Interaction
- The backend automatically interprets your message and chooses whether to
  respond with text, generate images, or both. No manual mode switching is
  required; everything is driven by intent.

### 🖼️ Smart Image Generation
- Stable Diffusion XL (high quality)
- Fallback to colored SVG placeholders
- Base64 embedding for instant display

### 💬 Session Management
- Persistent conversation history
- Intelligent prompt enhancement
- Intent-based categorization

### 🔒 Production Ready
- CORS-enabled API
- Error handling & graceful fallbacks
- Rate limiters & timeouts

---

## 🛠️ Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.12)
- **APIs:** OpenRouter (text), HuggingFace (images)
- **Deployment:** Railway.app

### Frontend  
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Hosting:** GitHub Pages

### Deployment
- Backend: Railway.app (free $5/month credits)
- Frontend: GitHub Pages (free)
- APIs: All free tier services

---

## 📂 Project Structure

```
vizzy-chat/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt      # Python dependencies
│   └── venv/                # Virtual environment
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main component
│   │   ├── components/      # React components
│   │   └── config.js        # API configuration
│   ├── vite.config.js       # Vite config
│   └── package.json         # NPM dependencies
├── Procfile                 # Railway deployment config
├── START_BOTH.ps1           # Local startup script
└── DEPLOYMENT_GUIDE.md      # Detailed deployment instructions
```

---

## 🏃 Quick Start

### Local Development

```bash
# Clone repository
git clone https://github.com/ashwin-rajakannan/vizzy-chat.git
cd vizzy-chat

# Run both services
./START_BOTH.ps1  # PowerShell
# OR
START_BOTH.bat    # Command Prompt
```

Access at:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Manual Setup

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete setup instructions:

1. **Backend to Railway** - Run `railway init && railway up`
2. **Frontend to GitHub Pages** - Run `npm run deploy`

---

## 🔑 Environment Setup

### Required API Keys (Backend)

Create `backend/.env`:
```env
OPENROUTER_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_token_here
REPLICATE_API_KEY=your_key_here  # Optional
```

**Get Free Keys:**
- [OpenRouter](https://openrouter.ai) - $5 free monthly credits
- [HuggingFace](https://huggingface.co/settings/tokens) - Free inference API
- [Replicate](https://replicate.com) - Free API, paid credits

---

## 📊 API Endpoints

### Chat Endpoint
```http
POST /chat
Content-Type: application/json

{
  "message": "Create an image of a mystical forest",
  "num_images": 2,
  "conversation_id": "optional-session-id"
}
```

**Response:**
```json
{
  "session_id": "unique-id",
  "message": "Creative description of generated images",
  "images": ["data:image/png;base64,..."],
  "llm_model": "openrouter/auto",
  "image_model": "HuggingFace (stable-diffusion-xl-base-1.0)"
}
```

---

## 🎓 Interview Highlights

### Technical Achievements
- ✅ Dual-API integration (OpenRouter + HuggingFace)
- ✅ Intelligent fallback system
- ✅ Session-based conversation history
- ✅ Real-time image generation with base64 embedding
- ✅ Production deployment (GitHub Pages + Railway)

### Architecture Decisions
- FastAPI for async, high-performance backend
- React for dynamic, responsive frontend
- Free tier APIs for MVP while maintaining quality
- Railway for serverless Python deployment
- GitHub Actions for CI/CD

### User Experience
- Toggle between chat and image modes
- Visual model indicators in header
- Colored SVG fallbacks maintain aesthetics
- Smooth API error handling

---

## 📝 Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed deployment steps
- [STARTUP_GUIDE.md](STARTUP_GUIDE.md) - Local running instructions

---

## 📄 License

MIT License

---

## 👨‍💼 About

Built by Ashwin Rajakannan as an AI/ML demonstration project

**GitHub:** [@ashwin-rajakannan](https://github.com/ashwin-rajakannan)  
**LinkedIn:** [Ashwin Rajakannan](https://linkedin.com/in/ashwin-rajakannan)

---

**Star this repo if you find it useful! ⭐**
