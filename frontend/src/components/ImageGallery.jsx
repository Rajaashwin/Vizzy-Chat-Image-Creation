
import React, { useState } from 'react';
import './ImageGallery.css';

export default function ImageGallery({ 
  images = [], 
  descriptions = [], 
  allImages = [],
  allImageDescriptions = [],
  currentImageSet = 0,
  onDownload, 
  onRefine, 
  onUpload, 
  loading,
  onSetChange
}) {
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

  const goToPreviousSet = () => {
    if (currentImageSet > 0) {
      onSetChange(currentImageSet - 1);
    }
  };

  const goToNextSet = () => {
    if (currentImageSet < allImages.length - 1) {
      onSetChange(currentImageSet + 1);
    }
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
            {/* Navigation for image sets */}
            <div className="gemini-set-navigation">
              <button
                className="gemini-nav-btn prev"
                onClick={goToPreviousSet}
                disabled={currentImageSet === 0}
                title="Previous creation"
              >
                ← 
              </button>
              <div className="gemini-set-counter">
                Set {currentImageSet + 1} of {allImages.length || 1}
              </div>
              <button
                className="gemini-nav-btn next"
                onClick={goToNextSet}
                disabled={currentImageSet === (allImages.length - 1)}
                title="Next creation"
              >
                →
              </button>
            </div>

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

            {/* History of all creations/uploads */}
            {allImages.length > 0 && (
              <div className="gemini-creation-history">
                <div className="gemini-history-label">📋 All Creations</div>
                <div className="gemini-history-scroll">
                  {allImages.map((imageSet, setIdx) => (
                    <button
                      key={setIdx}
                      className={`gemini-history-item${setIdx === currentImageSet ? ' active' : ''}`}
                      onClick={() => onSetChange(setIdx)}
                      title={`Set ${setIdx + 1} - Click to view`}
                    >
                      <img 
                        src={imageSet.images[0]} 
                        alt={`Creation ${setIdx + 1}`}
                        className="gemini-history-thumb"
                      />
                      <div className="gemini-history-label-small">#{setIdx + 1}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Thumbnails for all variations in current set */}
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


