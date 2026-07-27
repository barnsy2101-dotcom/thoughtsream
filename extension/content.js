// content.js - ThoughtStream Capture Floating Overlay & Bridge Script

(function () {
  // Prevent double initialization
  if (window.__thoughtstream_content_loaded) return;
  window.__thoughtstream_content_loaded = true;

  const isLocalhostApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || (window.location.protocol === 'file:' && window.location.pathname.includes('index.html'));

  // ==========================================
  // 1. Localhost App Sync Receiver
  // ==========================================
  if (isLocalhostApp) {
    const fetchBuffer = () => {
      // Fetch buffered thoughts
      chrome.runtime.sendMessage({ type: 'GET_BUFFER' }, (response) => {
        if (response && Array.isArray(response.thoughts) && response.thoughts.length > 0) {
          window.postMessage({
            type: 'ADD_THOUGHT_EXTERNAL_BATCH',
            thoughts: response.thoughts
          }, '*');
        }
      });
    };

    fetchBuffer(); // On load

    // Auto-pull when new thoughts are buffered from other tabs or sidepanel
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.thoughtBuffer && changes.thoughtBuffer.newValue && changes.thoughtBuffer.newValue.length > 0) {
        fetchBuffer();
      }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'ADD_THOUGHT_EXTERNAL') {
        window.postMessage({
          type: 'ADD_THOUGHT_EXTERNAL',
          payload: message.payload || message.text
        }, '*');
        sendResponse({ success: true });
      }
    });
  }

  // ==========================================
  // 2. Floating In-Page Glass Overlay Widget
  // ==========================================
  
  let hostEl = null;
  let shadowRoot = null;
  let isWidgetOpen = false;
  let recentNotes = [];

  function createFloatingWidget() {
    if (hostEl) return;

    hostEl = document.createElement('div');
    hostEl.id = 'thoughtstream-overlay-host';
    // Trick host pages (like YouTube) into ignoring keystrokes by making the host element look editable
    hostEl.contentEditable = 'true';
    hostEl.style.cssText = 'position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none; outline: none; caret-color: transparent;';
    
    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif; }
      
      :host {
        --overlay-bg: rgba(18, 18, 18, 0.70);
        --card-bg: rgba(30, 30, 30, 0.55);
        --border: rgba(255, 255, 255, 0.14);
        --border-accent: rgba(255, 255, 255, 0.22);
        --primary: #EAEAEA;
        --text-muted: #A3A3A3;
      }

      /* Floating Trigger Pill (Minimized Mode) */
      .trigger-badge {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(18, 18, 18, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #EAEAEA;
        padding: 8px 14px;
        border-radius: 30px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        pointer-events: auto;
        transition: all 0.2s ease;
        user-select: none;
      }
      .trigger-badge:hover {
        background: rgba(30, 30, 30, 0.95);
        border-color: rgba(255, 255, 255, 0.35);
        transform: translateY(-2px) scale(1.03);
      }

      /* Main Glass Widget Window */
      .widget-window {
        position: fixed;
        top: 80px;
        right: 24px;
        width: 320px;
        max-height: 85vh;
        background: var(--overlay-bg);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        pointer-events: auto;
        transition: background 0.15s ease-out, border-color 0.2s;
        z-index: 2147483647;
      }

      /* Draggable Header Bar */
      .header-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        cursor: move;
        user-select: none;
      }
      .brand-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #EAEAEA;
        letter-spacing: -0.01em;
        text-transform: uppercase;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .action-btn {
        background: transparent;
        border: none;
        color: #A3A3A3;
        font-size: 13px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
        transition: color 0.15s, background 0.15s;
      }
      .action-btn:hover {
        color: #FFFFFF;
        background: rgba(255, 255, 255, 0.1);
      }

      /* Transparency Slider Row */
      .opacity-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 5px 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        font-size: 11px;
        color: #A3A3A3;
        backdrop-filter: blur(12px);
      }
      .opacity-slider {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        cursor: pointer;
      }
      .opacity-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #EAEAEA;
        cursor: pointer;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      }
      .opacity-val {
        font-size: 10px;
        font-weight: 600;
        min-width: 28px;
        text-align: right;
        color: #EAEAEA;
        font-variant-numeric: tabular-nums;
      }

      /* Input Card */
      .input-card {
        background: var(--card-bg);
        border: 1px solid var(--border-accent);
        border-radius: 14px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: background 0.15s;
      }
      textarea {
        background: transparent;
        border: none;
        color: #EAEAEA;
        font-family: inherit;
        font-size: 12.5px;
        line-height: 1.5;
        resize: none;
        height: 80px;
        outline: none;
        width: 100%;
      }
      textarea::placeholder {
        color: #737373;
      }
      .footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 8px;
      }
      .char-count {
        font-size: 10px;
        color: #A3A3A3;
      }
      .submit-btn {
        background: #EAEAEA;
        color: #121212;
        border: 1px solid #FFFFFF;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      }
      .submit-btn:hover {
        background: #FFFFFF;
        transform: translateY(-1px);
      }

      /* Recent Notes List */
      .log-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 160px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .log-item {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11.5px;
        color: #EAEAEA;
        line-height: 1.4;
      }
      .log-item-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        font-size: 9px;
      }
    `;

    const containerEl = document.createElement('div');
    containerEl.innerHTML = `
      <div id="trigger-badge" class="trigger-badge" style="display: none;">
        <span>⚡</span>
        <span>ThoughtStream</span>
      </div>

      <div id="widget-window" class="widget-window" style="display: none;">
        <div id="header-bar" class="header-bar">
          <div class="brand-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 21h-1l1-7H7.5c-.88 0-.34-.9.34-1.9L13 3h1l-1 7h3.5c.88 0 .34.9-.34 1.9L11 21z"/>
            </svg>
            <span>ThoughtStream</span>
          </div>
          <div class="header-actions">
            <button id="minimize-btn" class="action-btn" title="Minimize overlay">−</button>
            <button id="close-btn" class="action-btn" title="Close overlay">✕</button>
          </div>
        </div>

        <div class="opacity-row">
          <span>Glass Transparency</span>
          <input type="range" id="opacity-slider" min="0" max="100" value="70" class="opacity-slider">
          <span id="opacity-val" class="opacity-val">70%</span>
        </div>

        <div class="input-card">
          <textarea id="overlay-input" placeholder="Capture a thought as you watch..." maxlength="280"></textarea>
          <div class="footer-row">
            <div id="char-count" class="char-count">0 / 280</div>
            <button id="submit-btn" class="submit-btn">Capture +</button>
          </div>
        </div>

        <div id="log-section" class="log-section"></div>
      </div>
    `;

    shadowRoot.appendChild(styleEl);
    shadowRoot.appendChild(containerEl);
    document.documentElement.appendChild(hostEl);

    // Setup Event Listeners
    setupWidgetEvents();
  }

  function setupWidgetEvents() {
    const triggerBadge = shadowRoot.getElementById('trigger-badge');
    const widgetWindow = shadowRoot.getElementById('widget-window');
    const headerBar = shadowRoot.getElementById('header-bar');
    const closeBtn = shadowRoot.getElementById('close-btn');
    const minimizeBtn = shadowRoot.getElementById('minimize-btn');
    const opacitySlider = shadowRoot.getElementById('opacity-slider');
    const opacityVal = shadowRoot.getElementById('opacity-val');
    const overlayInput = shadowRoot.getElementById('overlay-input');
    const submitBtn = shadowRoot.getElementById('submit-btn');
    const charCount = shadowRoot.getElementById('char-count');
    const logSection = shadowRoot.getElementById('log-section');

    // 1. Toggle & Visibility
    triggerBadge.addEventListener('click', () => setWidgetVisibility(true));
    closeBtn.addEventListener('click', () => setWidgetVisibility(false));
    minimizeBtn.addEventListener('click', () => setWidgetVisibility(false));

    // 2. Character Counter & Enter Submit
    overlayInput.addEventListener('input', () => {
      charCount.innerText = `${overlayInput.value.length} / 280`;
    });
    
    // Stop key events from bubbling to the host page (prevents triggering site shortcuts like YouTube's 't' for theater mode)
    const stopPropagation = (e) => e.stopPropagation();
    overlayInput.addEventListener('keyup', stopPropagation);
    overlayInput.addEventListener('keypress', stopPropagation);
    
    overlayInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleOverlaySubmit();
      }
    });
    submitBtn.addEventListener('click', handleOverlaySubmit);

    // 3. Opacity Control
    opacitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      applyOpacityStyle(val);
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ overlayOpacity: val });
      }
    });

    // 4. Dragging Logic
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;

    headerBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widgetWindow.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(10, Math.min(window.innerWidth - widgetWindow.offsetWidth - 10, initialLeft + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - widgetWindow.offsetHeight - 10, initialTop + dy));
      
      widgetWindow.style.left = `${newLeft}px`;
      widgetWindow.style.top = `${newTop}px`;
      widgetWindow.style.right = 'auto';
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        const rect = widgetWindow.getBoundingClientRect();
        if (chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ overlayPos: { left: rect.left, top: rect.top } });
        }
      }
    });

    // Load Saved State
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get({ overlayOpacity: 70, overlayPos: null, overlayVisible: true }, (res) => {
        opacitySlider.value = res.overlayOpacity;
        applyOpacityStyle(res.overlayOpacity);

        if (res.overlayPos) {
          widgetWindow.style.left = `${res.overlayPos.left}px`;
          widgetWindow.style.top = `${res.overlayPos.top}px`;
          widgetWindow.style.right = 'auto';
        }
        setWidgetVisibility(res.overlayVisible);
      });
    } else {
      setWidgetVisibility(true);
    }

    function applyOpacityStyle(percent) {
      const alpha = (percent / 100).toFixed(2);
      const cardAlpha = Math.max(0.05, (percent / 100) * 0.60).toFixed(2);
      shadowRoot.host.style.setProperty('--overlay-bg', `rgba(18, 18, 18, ${alpha})`);
      shadowRoot.host.style.setProperty('--card-bg', `rgba(30, 30, 30, ${cardAlpha})`);
      if (opacityVal) opacityVal.innerText = `${percent}%`;
    }

    async function handleOverlaySubmit() {
      const text = overlayInput.value.trim();
      if (!text) return;

      overlayInput.value = '';
      charCount.innerText = '0 / 280';
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Save / Sync Note
      let noteState = 'buffered';
      const targetStreamId = 'stream_today';

      const payload = {
        id: "node_" + Date.now(),
        text: text,
        timestamp: Date.now(),
        targetStreamId: targetStreamId,
        metadata: {
          url: window.location.href,
          title: document.title,
          favicon: document.querySelector('link[rel="icon"]')?.href || document.querySelector('link[rel="shortcut icon"]')?.href || ''
        }
      };

      try {
        if (isLocalhostApp) {
          window.postMessage({ type: 'ADD_THOUGHT_EXTERNAL', payload }, '*');
          noteState = 'synced';
        } else {
          // Check runtime buffer
          chrome.runtime.sendMessage({ type: 'BUFFER_THOUGHT', text: payload });
          noteState = 'buffered';
        }
      } catch (err) {
        noteState = 'buffered';
      }

      recentNotes.unshift({ text, time: timeStr, state: noteState });
      if (recentNotes.length > 5) recentNotes.pop();

      // Render mini log
      logSection.innerHTML = recentNotes.map(n => `
        <div class="log-item">
          <div>${escapeHTML(n.text)}</div>
          <div class="log-item-meta">
            <span style="color: ${n.state === 'synced' ? '#10b981' : '#f59e0b'}; font-weight: 600;">${n.state === 'synced' ? 'Synced ✓' : 'Buffered ⌛'}</span>
            <span style="color: #A3A3A3;">${n.time}</span>
          </div>
        </div>
      `).join('');
    }
  }

  function setWidgetVisibility(visible) {
    isWidgetOpen = visible;
    if (!shadowRoot) return;
    const triggerBadge = shadowRoot.getElementById('trigger-badge');
    const widgetWindow = shadowRoot.getElementById('widget-window');

    if (visible) {
      widgetWindow.style.display = 'flex';
      triggerBadge.style.display = 'none';
      const overlayInput = shadowRoot.getElementById('overlay-input');
      if (overlayInput) overlayInput.focus();
    } else {
      widgetWindow.style.display = 'none';
      triggerBadge.style.display = 'flex';
    }

    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ overlayVisible: visible });
    }
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Listen for Toggle Messages from Keyboard Shortcut (Alt+Shift+T)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_FLOATING_OVERLAY') {
      createFloatingWidget();
      setWidgetVisibility(!isWidgetOpen);
      sendResponse({ success: true });
    }
  });

  // Auto-inject on non-localhost sites (e.g. YouTube, Twitch, etc.)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingWidget);
  } else {
    createFloatingWidget();
  }
})();
