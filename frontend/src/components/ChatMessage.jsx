import React from 'react'
import './ChatMessage.css'

export default function ChatMessage({ message, onDownload }) {
  const isUser = message.role === 'user'

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-content">
        <p className="message-text">{message.content}</p>
        
        {message.images && message.images.length > 0 && (
          <div className="message-images">
            {message.images.map((img, idx) => (
              <div key={idx} className="image-card">
                <img src={img} alt={`Generated ${idx + 1}`} />
                <button
                  className="download-btn"
                  onClick={() => onDownload(img)}
                  title="Download image"
                >
                  ⬇
                </button>
              </div>
            ))}
          </div>
        )}
        
        {message.intent && (
          <p className="intent-label">Intent: {message.intent}</p>
        )}
        {message.refinement_suggestion && (
          <p className="refinement-suggestion">
            💡 Suggestion: {message.refinement_suggestion}
          </p>
        )}
      </div>
    </div>
  )
}
