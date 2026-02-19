import React, { useState } from 'react'
import './InputBar.css'

export default function InputBar({ onSend, onUpload, disabled, mode, setMode }) {
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    if (input.trim()) {
      onSend(input)
      setInput('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
  }

  return (
    <div className="input-bar">
      <div className="input-controls-row">
        <div className="mode-toggle" role="tablist" aria-label="Mode selection">
          <button
            className={`mode-btn ${mode === 'image' ? 'active' : ''}`}
            onClick={() => handleModeChange('image')}
            aria-pressed={mode === 'image'}
            title="Image mode: Generate visuals with OpenRouter"
          >
            🎨 Image
          </button>
          <button
            className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
            onClick={() => handleModeChange('chat')}
            aria-pressed={mode === 'chat'}
            title="Chat mode: Conversational AI (text only)"
          >
            💬 Chat
          </button>
        </div>

        <div className="input-container">
          <input
            type="text"
            placeholder={
              mode === 'chat' 
                ? 'Ask a question or chat with AI...' 
                : 'Describe an image to generate with OpenRouter...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            className="input-field"
            aria-label="Message input"
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="send-btn"
            title="Send message"
          >
            {disabled ? '⏳' : '→'}
          </button>
          {mode === 'image' && onUpload && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onUpload(e.target.files[0])}
              disabled={disabled}
              title="Upload image for analysis"
              className="upload-input"
            />
          )}
        </div>
      </div>
      <p className="input-hint">
        <strong>{mode === 'chat' ? '💬 Chat Mode' : '🎨 Image Mode'}:</strong>
        {mode === 'chat'
          ? ' Conversational questions answered with text only (no image generation).'
          : ' Generate visuals with OpenRouter AI. Try descriptive prompts!'}
      </p>
    </div>
  )
}
