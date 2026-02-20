import React, { useState, useRef } from 'react'
import './InputBar.css'

export default function InputBar({ onSend, onUpload, disabled, mode, setMode, showModeControls = true }) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef(null);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && onUpload) {
      onUpload(file)
    }
    // Reset the input so the same file can be uploaded again
    e.target.value = ''
  }


  return (
    <div className="input-bar">
      <div className="input-controls-row">
        {showModeControls && (
          <div className="mode-bubbles">
            <button
              className={`mode-btn${mode === 'chat' ? ' active' : ''}`}
              onClick={() => setMode && setMode('chat')}
              disabled={disabled}
              title="💬 Chat Mode - Send text messages and get conversational responses"
              style={{ background: mode === 'chat' ? '#4fd1c5' : 'rgba(255,255,255,0.1)', color: mode === 'chat' ? '#222' : '#fff', border: mode === 'chat' ? '2px solid #fff' : 'none', fontWeight: mode === 'chat' ? 'bold' : 'normal', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
            >💬 Chat</button>
            <button
              className={`mode-btn${mode === 'image' ? ' active' : ''}`}
              onClick={() => setMode && setMode('image')}
              disabled={disabled}
              title="🎨 Image Mode - Describe images you want to create"
              style={{ background: mode === 'image' ? '#f6ad55' : 'rgba(255,255,255,0.1)', color: mode === 'image' ? '#222' : '#fff', border: mode === 'image' ? '2px solid #fff' : 'none', fontWeight: mode === 'image' ? 'bold' : 'normal', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
            >🎨 Create Image</button>
          </div>
        )}
        <div className="input-container">
          <input
            type="text"
            placeholder={mode === 'image' ? 'Describe the image you want to create...' : 'Type your message...'}
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
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={disabled}
                style={{ display: 'none' }}
                aria-label="Upload image"
              />
              <button
                onClick={handleUploadClick}
                disabled={disabled}
                className="upload-btn"
                title="Upload an image"
              >
                📤 Upload
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
