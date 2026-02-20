import React from 'react';
import './HistoryView.css';

export default function HistoryView({ generations, sessionId, userType }) {
  if (!generations || generations.length === 0) {
    return (
      <div className="history-view">
        <p className="empty-history">
          No generations yet. When you create text or images they will be logged here
          so you can review prompts, view thumbnails, and track your session activity.
        </p>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <span className="history-icon" title="Session History" style={{fontSize: '2rem', marginRight: '0.5rem'}}>📜</span>
        <h3 style={{display: 'inline'}}>Generation History</h3>
        <span className="history-count">({generations.length} total)</span>
      </div>
      <p className="history-description" style={{fontWeight: 'bold', color: '#ffd700'}}>
        <span style={{fontSize: '1.1rem'}}>This is your session history.</span> Every request you make—text or image—appears here with a timestamp and preview. Use this to revisit, copy, or review your creative journey!
      </p>
      <div className="history-list">
        {generations.map((gen, idx) => (
          <div key={idx} className="history-item">
            <div className="history-item-header">
              <span className="history-time">
                {new Date(gen.timestamp).toLocaleString()}
              </span>
              <span className={`history-intent intent-${gen.intent}`}>
                {gen.intent}
              </span>
              {gen.user_type && (
                <span className={`user-type ${gen.user_type}`}>
                  {gen.user_type}
                </span>
              )}
            </div>
            <div className="history-prompt">{gen.prompt}</div>
            {gen.images && gen.images.length > 0 && (
              <div className="history-images">
                {gen.images.slice(0, 3).map((img, i) => (
                  <img key={i} src={img} alt={`Generation ${idx}-${i}`} className="history-thumbnail" />
                ))}
                {gen.images.length > 3 && (
                  <div className="more-images">+{gen.images.length - 3}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
