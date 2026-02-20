
import React, { useState } from 'react';
import './ImageGallery.css';

export default function ImageGallery({ images = [], descriptions = [], onDownload, onRefine, onUpload, loading }) {
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleRefineSubmit = async () => {
    if (!refineText.trim()) return;
    setRefining(true);
    await onRefine(refineText);
    setRefineText('');
    setRefining(false);
  };

  return (
    <div className="gemini-gallery">
      {/* Loading overlay */}
      {loading && (
        <div className="gemini-loading-overlay">
          <div className="gemini-spinner"></div>
          <div className="gemini-loading-text">Generating your image...</div>
        </div>
      )}

      {/* Main content area */}
      <div className="gemini-gallery-content">
        {images.length === 0 ? (
          <div className="gemini-empty-state">
            <h2>🖼️ Image Gallery</h2>
            <p>Type a prompt below to create images, or upload your own.</p>
            <button
              className="gemini-upload-btn-inline"
              onClick={(e) => {
                e.preventDefault();
                const input = document.getElementById('gallery-file-input');
                input.click();
              }}
              title="Upload an image from your computer"
            >
              📤 Upload Image
            </button>
            <input
              id="gallery-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files[0] && onUpload) {
                  onUpload(e.target.files[0]);
                }
              }}
            />
          </div>
        ) : (
          <div className="gemini-gallery-main">
            {/* Main image display */}
            <div className="gemini-gallery-preview">
              <img
                src={images[selectedIdx]}
                alt={`Variation ${selectedIdx + 1}`}
                className="gemini-main-image"
              />
              {descriptions[selectedIdx] && (
                <div className="gemini-image-description">{descriptions[selectedIdx]}</div>
              )}
              <div className="gemini-image-actions">
                <button
                  className="gemini-download-btn"
                  onClick={() => onDownload(images[selectedIdx])}
                  title="Download this image"
                >
                  ⬇️ Download
                </button>
                <button
                  className="gemini-upload-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = document.getElementById('gallery-file-input-bottom');
                    input.click();
                  }}
                  title="Upload an image from your computer"
                >
                  📤 Upload
                </button>
                <input
                  id="gallery-file-input-bottom"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files[0] && onUpload) {
                      onUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            {/* Thumbnails for all variations */}
            {images.length > 1 && (
              <div className="gemini-gallery-thumbnails">
                <div className="gemini-thumbs-label">Variations</div>
                <div className="gemini-thumbs-container">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      className={`gemini-thumb-btn${idx === selectedIdx ? ' active' : ''}`}
                      onClick={() => setSelectedIdx(idx)}
                      title={descriptions[idx] || `Variation ${idx + 1}`}
                    >
                      <img src={img} alt={`Variation ${idx + 1}`} className="gemini-thumb-img" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Refine input */}
            <div className="gemini-refine-bar">
              <input
                type="text"
                placeholder='Refine: e.g., "Make it more vibrant" or "Add gold accents"'
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRefineSubmit()}
                disabled={refining}
                className="gemini-refine-input"
              />
              <button
                className="gemini-refine-btn"
                onClick={handleRefineSubmit}
                disabled={refining || !refineText.trim()}
                title="Apply refinement to the current image"
              >
                {refining ? '⏳' : '✨'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

