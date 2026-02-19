import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'
import './App.css'
import ChatMessage from './components/ChatMessage'
import ImageGallery from './components/ImageGallery'
import InputBar from './components/InputBar'
import GenerationHistory from './components/GenerationHistory'
import HistoryView from './components/HistoryView'

  const API_BASE = API_BASE_URL

function App() {
  const [sessionId, setSessionId] = useState(null)
  // Mode state: 'chat' or 'image'
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDescriptions, setImageDescriptions] = useState([]);
  const [modelInfo, setModelInfo] = useState({ llm: 'openrouter/auto', image: 'none' });
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [imageQuota, setImageQuota] = useState({ count: 0, limit: null });
  const [activeTab, setActiveTab] = useState('chat');  // 'chat' or 'history'
  const messagesEndRef = useRef(null);

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
    if (!text.trim() || !sessionId) return;
    // if in image mode enforce quota locally
    if (mode === 'image' && imageQuota.limit && imageQuota.count >= imageQuota.limit) {
      const warning = {
        role: 'assistant',
        content: `You've already used ${imageQuota.count} of your ${imageQuota.limit} images today.`,
        images: [],
      };
      setMessages(prev => [...prev, warning]);
      return;
    }
    // Add user message to UI
    const userMessage = { role: 'user', content: text, images: [], mode };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        session_id: sessionId,
        message: text,
        mode,
      });
      const { images, image_descriptions, copy, intent_category, llm_model, image_model, recent_generations, daily_image_count, daily_image_limit } = response.data;
      setSelectedImages(images);
      setImageDescriptions(image_descriptions || []);
      setModelInfo({
        llm: llm_model || 'openrouter/auto',
        image: image_model || 'none'
      });
      if (recent_generations) {
        setRecentGenerations(recent_generations);
      }
      setImageQuota({ count: daily_image_count || 0, limit: daily_image_limit || null });
      const assistantMessage = {
        role: 'assistant',
        content: copy,
        images,
        intent: intent_category,
        image_descriptions,
        refinement_suggestion: response.data.refinement_suggestion,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message}. Make sure the backend is running on http://localhost:8000`,
        images: [],
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (file) => {
    if (!file || !sessionId) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Create a local preview URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      // Show the uploaded image in the chat
      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          content: 'Uploaded image',
          images: [imageUrl],
        }
      ]);
      const response = await axios.post(`${API_BASE}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { analysis, transform_options } = response.data;
      const message = {
        role: 'assistant',
        content: `Image analysis: ${analysis}\nOptions: ${transform_options.join(', ')}`,
        images: [imageUrl],
      };
      setMessages(prev => [...prev, message]);
    } catch (err) {
      console.error('Upload error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Upload failed.', images: [] }]);
    } finally {
      setLoading(false);
    }
  }

  const handleRefine = async (refinementText) => {
    // existing code unchanged below
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
        // backend will respect intent (typically image mode)
      })

      const { images, image_descriptions, copy, intent_category, llm_model, image_model, recent_generations } = response.data

      // Update model info
      setModelInfo({
        llm: llm_model || 'openrouter/auto',
        image: image_model || 'none'
      })
      if (recent_generations) setRecentGenerations(recent_generations)

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
        {recentGenerations.length > 0 && <GenerationHistory generations={recentGenerations} />}
          <h1>✨ Vizzy Chat</h1>
          <p>AI-powered creative co-pilot for visual, narrative & experiential content</p>
          <div className="model-display">
            <span className="model-badge">
              LLM: {modelInfo.llm}
            </span>
            <span className="model-badge image-model">
              Images: {modelInfo.image}
            </span>
            {imageQuota.limit !== null && (
              <span className="model-badge quota">
                {imageQuota.count}/{imageQuota.limit} used
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="chat-area">
        <div className="tab-header">
          <button
            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >💬 Chat</button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >📋 History</button>
        </div>
        {activeTab === 'chat' ? (
        <>
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <h2>Hey — I’m Vizzy.</h2>
              <p>What would you like to create today?</p>
              <p>You can create:</p>
              <ul>
                <li>Artworks</li>
                <li>Posters</li>
                <li>Product visuals</li>
                <li>Marketing material</li>
                <li>Reimagine photos</li>
                <li>Or start with just an idea</li>
              </ul>
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
              <span className="model-hint">LLM: {modelInfo.llm} | Images: {modelInfo.image}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Only show ImageGallery if in image mode and images exist */}
        {activeTab === 'chat' && mode === 'image' && selectedImages.length > 0 && (
          <ImageGallery
            images={selectedImages}
            descriptions={imageDescriptions}
            onDownload={handleDownloadImage}
            onRefine={handleRefine}
          />
        )}

        {activeTab === 'chat' && (
        <InputBar
          onSend={handleSendMessage}
          onUpload={handleUpload}
          disabled={loading}
          mode={mode}
          setMode={setMode}
        />
        )}
        </>
        ) : (
          <HistoryView generations={recentGenerations} sessionId={sessionId} />
        )}
      </div>
    </div>
  )
}

export default App