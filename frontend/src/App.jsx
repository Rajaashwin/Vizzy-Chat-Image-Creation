import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL } from './config'
import './App.css'
import ChatMessage from './components/ChatMessage'
import ImageGallery from './components/ImageGallery'
import InputBar from './components/InputBar'
import HistoryView from './components/HistoryView'

  const API_BASE = API_BASE_URL

function App() {
  // tabbed sessions: each tab corresponds to a backend session
  const [tabs, setTabs] = useState(() => {
    // attempt to restore from localStorage immediately
    try {
      const saved = localStorage.getItem('vizzy_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tabs && parsed.tabs.length) return parsed.tabs;
      }
    } catch (e) {
      console.warn('unable to parse stored tabs', e);
    }
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return [{
      sessionId: id,
      messages: [],
      selectedImages: [],
      imageDescriptions: [],
      modelInfo: { llm: 'openrouter/auto', image: 'none' },
      recentGenerations: [],
      imageQuota: { count: 0, limit: null },
    }];
  });
  const [activeTabIndex, setActiveTabIndex] = useState(() => {
    try {
      const saved = localStorage.getItem('vizzy_tabs');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.activeTabIndex || 0;
      }
    } catch {}
    return 0;
  });
  // UI states derived from current tab
  const [loading, setLoading] = useState(false);
  const [activeTabView, setActiveTabView] = useState('chat'); // 'chat' or 'image'
  // mode is determined by the active view (chat or image)
  const mode = activeTabView === 'image' ? 'image' : 'chat';
  const [showHistory, setShowHistory] = useState(false); // separate history toggle
  const [deletedTabs, setDeletedTabs] = useState([]); // track deleted tabs
  const messagesEndRef = useRef(null);

  // Initialize tabs on mount, possibly from localStorage
  useEffect(() => {
    const createTab = () => {
      const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        sessionId: id,
        messages: [],
        selectedImages: [],
        imageDescriptions: [],
        modelInfo: { llm: 'openrouter/auto', image: 'none' },
        recentGenerations: [],
        imageQuota: { count: 0, limit: null },
      };
    };
    const saved = localStorage.getItem('vizzy_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tabs && parsed.tabs.length) {
          setTabs(parsed.tabs);
          setActiveTabIndex(parsed.activeTabIndex || 0);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved tabs', e);
      }
    }
    // fallback to fresh tab
    setTabs([createTab()]);
    setActiveTabIndex(0);
  }, []);

  // Auto-scroll to bottom when active tab messages change
  useEffect(() => {
    const msgs = tabs[activeTabIndex]?.messages || [];
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tabs, activeTabIndex]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    const sessionId = tab.sessionId;
    // if in image view enforce local quota
    if (mode === 'image' && tab.imageQuota.limit && tab.imageQuota.count >= tab.imageQuota.limit) {
      const warning = {
        role: 'assistant',
        content: `You've already used ${tab.imageQuota.count} of your ${tab.imageQuota.limit} images today.`,
        images: [],
      };
      const newTabs = [...tabs];
      newTabs[activeTabIndex].messages.push(warning);
      setTabs(newTabs);
      return;
    }
    // Add user message to UI
    const userMessage = { role: 'user', content: text, images: [] };
    const newTabs = [...tabs];
    newTabs[activeTabIndex].messages.push(userMessage);
    setTabs(newTabs);
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        session_id: sessionId,
        message: text,
        mode: 'chat', // Always chat in this view
      });
      const { copy, llm_model, daily_image_count, daily_image_limit } = response.data;
      // update tab state - text response only, no images in chat
      const updated = { ...newTabs[activeTabIndex] };
      updated.modelInfo = { llm: llm_model || 'openrouter/auto', image: 'none' };
      updated.imageQuota = { count: daily_image_count || 0, limit: daily_image_limit || null };
      const assistantMessage = {
        role: 'assistant',
        content: copy,
        images: [], // Never add images in chat view
      };
      updated.messages = [...updated.messages, assistantMessage];
      newTabs[activeTabIndex] = updated;
      setTabs(newTabs);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message}. Make sure the backend is running on http://localhost:8000`,
        images: [],
      };
      const newTabs2 = [...tabs];
      newTabs2[activeTabIndex].messages.push(errorMessage);
      setTabs(newTabs2);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (file) => {
    if (!file) return;
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    const sessionId = tab.sessionId;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Show local preview while uploading
      const imageUrl = URL.createObjectURL(file);
      const newTabs = [...tabs];
      newTabs[activeTabIndex].messages.push({ role: 'user', content: 'Uploaded image', images: [imageUrl] });
      setTabs(newTabs);
      
      const response = await axios.post(`${API_BASE}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { image_url, analysis, transform_options } = response.data;
      
      // Use the backend URL instead of local preview
      const message = {
        role: 'assistant',
        content: `Image analysis: ${analysis}\nOptions: ${transform_options.join(', ')}`,
        images: [image_url], // Use backend URL
      };
      const newTabs2 = [...tabs];
      newTabs2[activeTabIndex].messages.push(message);
      setTabs(newTabs2);
    } catch (err) {
      console.error('Upload error:', err);
      const newTabs2 = [...tabs];
      newTabs2[activeTabIndex].messages.push({ role: 'assistant', content: 'Upload failed.', images: [] });
      setTabs(newTabs2);
    } finally {
      setLoading(false);
    }
  }

  const handleRefine = async (refinementText) => {
    if (!refinementText.trim()) return;
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    const sessionId = tab.sessionId;

    // For refine, we use the last image prompt
    // Either from the image view context or from messages
    let lastPrompt = tab.selectedImages && tab.selectedImages.length > 0 
      ? tab.recentGenerations?.[0]?.prompt || "Refine the current image"
      : [...tab.messages].reverse().find(m => m.role === 'user')?.content;

    if (!lastPrompt) return;

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/refine`, {
        session_id: sessionId,
        message: lastPrompt,
        refinement: refinementText,
      });

      const { images, image_descriptions, copy, intent_category, llm_model, image_model, recent_generations } = response.data;

      const updated = { ...tab };
      // Update image gallery ONLY - don't add to messages
      updated.selectedImages = images;
      updated.imageDescriptions = image_descriptions || [];
      updated.modelInfo = { llm: llm_model || 'openrouter/auto', image: image_model || 'none' };
      if (recent_generations) updated.recentGenerations = recent_generations;

      const newTabs = [...tabs];
      newTabs[activeTabIndex] = updated;
      setTabs(newTabs);
    } catch (error) {
      console.error('Refinement error:', error);
      alert(`Refinement error: ${error.message}`);
    } finally {
      setLoading(false);
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

  const handleNewTab = () => {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTab = {
      sessionId: id,
      messages: [],
      selectedImages: [],
      imageDescriptions: [],
      modelInfo: { llm: 'openrouter/auto', image: 'none' },
      recentGenerations: [],
      imageQuota: { count: 0, limit: null },
    };
    setTabs([...tabs, newTab]);
    setActiveTabIndex(tabs.length);
    setActiveTabView('chat');
    setShowHistory(false);
  };

  const handleDeleteTab = (indexToDelete) => {
    if (tabs.length === 1) {
      alert('Cannot delete the last tab');
      return;
    }
    
    // Add deleted tab to history
    const deletedTab = tabs[indexToDelete];
    setDeletedTabs([...deletedTabs, { ...deletedTab, deletedAt: new Date().toISOString() }]);
    
    // Remove the tab
    const newTabs = tabs.filter((_, idx) => idx !== indexToDelete);
    setTabs(newTabs);
    
    // Adjust active tab index
    if (activeTabIndex === indexToDelete) {
      setActiveTabIndex(Math.max(0, indexToDelete - 1));
    } else if (activeTabIndex > indexToDelete) {
      setActiveTabIndex(activeTabIndex - 1);
    }
    setShowHistory(false);
  };

  const currentTab = tabs[activeTabIndex] || {
    sessionId: '',
    messages: [],
    selectedImages: [],
    imageDescriptions: [],
    modelInfo: { llm: 'openrouter/auto', image: 'none' },
    recentGenerations: [],
    imageQuota: { count: 0, limit: null },
  };

  // persist tabs on change
  useEffect(() => {
    try {
      localStorage.setItem('vizzy_tabs', JSON.stringify({ tabs, activeTabIndex }));
    } catch (e) {
      console.warn('Failed to save tabs to localStorage', e);
    }
  }, [tabs, activeTabIndex]);
  const { messages, selectedImages, imageDescriptions, modelInfo, recentGenerations, imageQuota } = currentTab;

  // Handle image upload in gallery view
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      
      const response = await axios.post(`${API_BASE}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { image_url, analysis, transform_options } = response.data;
      
      // Update current tab with uploaded image
      const updated = { ...currentTab };
      updated.selectedImages = [image_url];
      const newTabs = [...tabs];
      newTabs[activeTabIndex] = updated;
      setTabs(newTabs);
      
      console.log('Image uploaded successfully:', image_url);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle image creation via InputBar in image view
  // This creates images but does NOT add to chat messages
  const handleImageViewMessage = async (text) => {
    if (!text.trim()) return;
    const tab = tabs[activeTabIndex];
    if (!tab) return;
    const sessionId = tab.sessionId;
    
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        session_id: sessionId,
        message: text,
        mode: 'image',
        num_images: 4,
      });

      const { images, image_descriptions, copy, intent_category, llm_model, image_model, recent_generations } = response.data;

      const updated = { ...tab };
      // Update ONLY the image gallery - not messages
      updated.selectedImages = images || [];
      updated.imageDescriptions = image_descriptions || [];
      updated.modelInfo = { llm: llm_model || 'openrouter/auto', image: image_model || 'none' };
      if (recent_generations) updated.recentGenerations = recent_generations;

      const newTabs = [...tabs];
      newTabs[activeTabIndex] = updated;
      setTabs(newTabs);
    } catch (error) {
      console.error('Image creation error:', error);
      alert(`Image creation error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>✨ Vizzy Chat</h1>
          <p>AI-powered creative co-pilot for visual, narrative & experiential content</p>
          <p className="view-hint">Use the tabs below to toggle between conversation and generated images. Click the 📜 icon on the right to view your session history.</p>
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
        {/* history toggle moved to header right */}
        <button
          className="history-btn"
          title="Toggle history view"
          onClick={() => {
            setShowHistory(prev => !prev);
          }}
        >📜</button>
      </header>

      {/* session-level tabs with plus button */}
      <div className="session-tabs">
        {tabs.map((tab, idx) => (
          <div key={tab.sessionId} className="session-tab-wrapper">
            <button
              className={`session-tab-btn ${idx === activeTabIndex ? 'active' : ''}`}
              onClick={() => { setActiveTabIndex(idx); setActiveTabView('chat'); setShowHistory(false); }}
            >
              Tab {idx + 1}
            </button>
            {tabs.length > 1 && (
              <button
                className="tab-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTab(idx);
                }}
                title="Delete this tab"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="new-tab-btn" onClick={handleNewTab}>+</button>
      </div>

      <div className="chat-area">
        <div className="tab-header" title="Switch between conversation and image gallery">
          <button
            className={`tab-btn ${activeTabView === 'chat' ? 'active' : ''}`}
            onClick={() => { setActiveTabView('chat'); setShowHistory(false); }}
            title="Chat view: conversation and prompts"
          >💬 Chat</button>
          <button
            className={`tab-btn ${activeTabView === 'image' ? 'active' : ''}`}
            onClick={() => { setActiveTabView('image'); setShowHistory(false); }}
            title="Images view: gallery of generated visuals"
          >🖼️ Images</button>
        </div>
        {showHistory ? (
          <HistoryView generations={recentGenerations} sessionId={currentTab.sessionId} />
        ) : activeTabView === 'chat' ? (
        <>
        <div className="messages-container">
          {messages && messages.length === 0 && (
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
        {/* keep input bar visible unless history is showing */}
        {!showHistory && (
          <InputBar
            onSend={handleSendMessage}
            onUpload={handleUpload}
            disabled={loading}
            mode={mode}
            showModeControls={false}
          />
        )}
        </>
        ) : activeTabView === 'image' ? (
          <>
            <ImageGallery
              images={selectedImages || []}
              descriptions={imageDescriptions || []}
              onDownload={handleDownloadImage}
              onRefine={handleRefine}
              onUpload={handleImageUpload}
              loading={loading}
            />
            {!showHistory && (
              <InputBar
                onSend={handleImageViewMessage}
                disabled={loading}
                mode="image"
                showModeControls={false}
              />
            )}
          </>
        ) : null }
      </div>
    </div>
  )
}

export default App