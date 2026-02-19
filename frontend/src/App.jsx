import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'
import './App.css'
import ChatMessage from './components/ChatMessage'
import ImageGallery from './components/ImageGallery'
import InputBar from './components/InputBar'

  const API_BASE = API_BASE_URL

function App() {
  const [sessionId, setSessionId] = useState(null)
  const [mode, setMode] = useState('image') // 'image' or 'chat'
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState([])
  const [imageDescriptions, setImageDescriptions] = useState([])
  const [modelInfo, setModelInfo] = useState({ llm: 'openrouter/auto', image: 'none' })
  const messagesEndRef = useRef(null)

  // Initialize session on mount
  useEffect(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (text) => {
    if (!text.trim() || !sessionId) return

    // Add user message to UI
    const userMessage = { role: 'user', content: text, images: [] }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        session_id: sessionId,
        message: text,
        num_images: mode === 'image' ? 4 : 0, // Generate 4 images by default per spec
      })

      const { images, image_descriptions, copy, intent_category, llm_model, image_model } = response.data

      // update gallery descriptions if available
      // Update gallery state and model info display
      setSelectedImages(images)
      setImageDescriptions(image_descriptions || [])
      setModelInfo({
        llm: llm_model || 'openrouter/auto',
        image: image_model || 'none'
      })

      const assistantMessage = {
        role: 'assistant',
        content: copy,
        images,
        intent: intent_category,
        image_descriptions,
        refinement_suggestion: response.data.refinement_suggestion,
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message}. Make sure the backend is running on http://localhost:8000`,
        images: [],
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file) => {
    if (!file || !sessionId) return
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await axios.post(`${API_BASE}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const { analysis, transform_options } = response.data
      const message = {
        role: 'assistant',
        content: `Image analysis: ${analysis}\nOptions: ${transform_options.join(', ')}`,
        images: [],
      }
      setMessages(prev => [...prev, message])
    } catch (err) {
      console.error('Upload error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Upload failed.', images: [] }])
    } finally {
      setLoading(false)
    }
  }

  const handleRefine = async (refinementText) => {
    if (!refinementText.trim() || messages.length === 0 || !sessionId) return

    const lastUserMessage = [...messages]
      .reverse()
      .find(m => m.role === 'user')?.content

    if (!lastUserMessage) return

    setLoading(true)

    try {
      const response = await axios.post(`${API_BASE}/refine`, {
        session_id: sessionId,
        message: lastUserMessage,
        refinement: refinementText,
        num_images: 4,
      })

      const { images, image_descriptions, copy, intent_category, llm_model, image_model } = response.data

      // Update model info
      setModelInfo({
        llm: llm_model || 'openrouter/auto',
        image: image_model || 'none'
      })

      const refinedMessage = {
        role: 'assistant',
        content: `Refined: ${copy}`,
        images,
        intent: intent_category,
        image_descriptions,
        refinement_suggestion: response.data.refinement_suggestion,
      }
      setMessages(prev => [...prev, refinedMessage])
      setSelectedImages(images)
      setImageDescriptions(image_descriptions || [])
    } catch (error) {
      console.error('Refinement error:', error)
      const errorMessage = {
        role: 'assistant',
        content: `Refinement error: ${error.message}`,
        images: [],
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadImage = (imageUrl) => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = `vizzy_${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>✨ Vizzy Chat</h1>
          <p>AI-powered creative co-pilot for visual, narrative & experiential content</p>
          <div className="model-display">
            <span className="model-badge">
              LLM: {modelInfo.llm}
            </span>
            {mode === 'image' && (
              <span className="model-badge image-model">
                Images: {modelInfo.image}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="chat-area">
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome to Vizzy Chat</h2>
              <p>Describe what you want to create, and I'll generate beautiful visuals for you.</p>
              <div className="example-prompts">
                <p><strong>Try:</strong></p>
                <ul>
                  <li>"Paint something that feels like how my last year felt."</li>
                  <li>"Create a dreamlike version of a forest."</li>
                  <li>"Design a quote poster for my living room."</li>
                  <li>"Generate a vision board with goals for 2026."</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              message={msg}
              onDownload={handleDownloadImage}
            />
          ))}

          {loading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>Generating your creation...</p>
              {mode === 'chat' && <span className="model-hint">Using {modelInfo.llm}</span>}
              {mode === 'image' && <span className="model-hint">LLM: {modelInfo.llm} | Images: {modelInfo.image}</span>}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {selectedImages.length > 0 && (
          <ImageGallery
            images={selectedImages}
            descriptions={imageDescriptions}
            onDownload={handleDownloadImage}
            onRefine={handleRefine}
          />
        )}

        <InputBar onSend={handleSendMessage} onUpload={handleUpload} disabled={loading} mode={mode} setMode={setMode} />
      </div>
    </div>
  )
}

export default App