import React, { useState } from 'react'
import './ImageGallery.css'

export default function ImageGallery({ images, descriptions = [], onDownload, onRefine }) {
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)

  const handleRefineSubmit = async () => {
    if (!refineText.trim()) return
    setRefining(true)
    await onRefine(refineText)
    setRefineText('')
    setRefining(false)
  }

  return (
    <div className="gallery-panel">
      <div className="gallery-header">
        <h3>Gallery ({images.length} variations)</h3>
      </div>

      <div className="gallery-grid">
        {images.map((img, idx) => (
          <div key={idx} className="gallery-item">
            <img src={img} alt={`Variation ${idx + 1}`} />
            {descriptions[idx] && (
              <div className="gallery-description">{descriptions[idx]}</div>
            )}
            <div className="gallery-controls">
              <button
                className="gallery-btn download"
                onClick={() => onDownload(img)}
                title="Download"
              >
                ⬇ Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="refine-section">
        <p className="refine-label">Refine this creation:</p>
        <div className="refine-input-group">
          <input
            type="text"
            placeholder='e.g., "Make it more vibrant" or "Add gold accents"'
            value={refineText}
            onChange={(e) => setRefineText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRefineSubmit()}
            disabled={refining}
            className="refine-input"
          />
          <button
            className="refine-btn"
            onClick={handleRefineSubmit}
            disabled={refining || !refineText.trim()}
          >
            {refining ? '...' : '✨'}
          </button>
        </div>
      </div>
    </div>
  )
}
