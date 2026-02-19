import React, { useState } from 'react'
import './InputBar.css'

export default function InputBar({ onSend, onUpload, disabled }) {
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


  return (
    <div className="input-bar">
      <div className="input-controls-row">
  
        <div className="input-container">
          <input
            type="text"
            placeholder="Describe what you'd like to create (text or image prompt)"
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
          {onUpload && (
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
        📝 Enter any creative request or upload an image to analyze. The system will
        respond with text or generate visuals based on intent.
      </p>
    </div>
  )
}
