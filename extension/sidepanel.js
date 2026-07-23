// sidepanel.js - ThoughtStream Capture Extension Logic

const noteInput = document.getElementById('note-input');
const addBtn = document.getElementById('add-btn');
const charCount = document.getElementById('char-count');
const statusText = document.getElementById('status-text');
const statusEl = document.getElementById('status');
const logList = document.getElementById('log-list');
const opacitySlider = document.getElementById('opacity-slider');
const opacityVal = document.getElementById('opacity-val');

let recentNotes = [];

// 0. Panel Transparency Control
function updatePanelOpacity(percent) {
  const alpha = (percent / 100).toFixed(2);
  const cardAlpha = Math.max(0.08, (percent / 100) * 0.65).toFixed(2);
  document.documentElement.style.setProperty('--gradient-bg', `rgba(18, 18, 18, ${alpha})`);
  document.documentElement.style.setProperty('--panel-bg', `rgba(30, 30, 30, ${cardAlpha})`);
  if (opacityVal) opacityVal.innerText = `${percent}%`;
}

if (opacitySlider) {
  opacitySlider.addEventListener('input', (e) => {
    const val = e.target.value;
    updatePanelOpacity(val);
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ sidepanelOpacity: val });
    }
  });

  if (chrome && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get({ sidepanelOpacity: 70 }, (res) => {
      opacitySlider.value = res.sidepanelOpacity;
      updatePanelOpacity(res.sidepanelOpacity);
    });
  }
}

// 1. Character Counter
noteInput.addEventListener('input', () => {
  charCount.innerText = `${noteInput.value.length} / 280`;
});

// 2. Submit Note on Enter (without shift key)
noteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    submitNote();
  }
});

addBtn.addEventListener('click', submitNote);

// 3. Main Note Submission Logic
async function submitNote() {
  const text = noteInput.value.trim();
  if (!text) return;

  // Clear input
  noteInput.value = '';
  charCount.innerText = '0 / 280';

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  let noteState = 'buffered';

  try {
    // Check if there is an active localhost tab running ThoughtStream
    const tabs = await chrome.tabs.query({ url: 'http://localhost/*/*' });
    const localTab = tabs.find(t => t.url && t.url.includes('localhost'));

    if (localTab) {
      // Send the thought directly to the open tab
      await chrome.tabs.sendMessage(localTab.id, {
        type: 'ADD_THOUGHT_EXTERNAL',
        text: text
      });
      noteState = 'synced';
    } else {
      // Buffer the thought locally in storage
      const result = await chrome.storage.local.get({ thoughtBuffer: [] });
      result.thoughtBuffer.push(text);
      await chrome.storage.local.set({ thoughtBuffer: result.thoughtBuffer });
      noteState = 'buffered';
    }
  } catch (err) {
    console.error('Error during sync check, fallback to buffer:', err);
    // Fallback: save to storage buffer
    try {
      const result = await chrome.storage.local.get({ thoughtBuffer: [] });
      result.thoughtBuffer.push(text);
      await chrome.storage.local.set({ thoughtBuffer: result.thoughtBuffer });
    } catch (e) {
      console.error('Failed to write to fallback storage:', e);
    }
    noteState = 'buffered';
  }

  // Prepend to recent list
  recentNotes.unshift({ text, time: timestamp, state: noteState });
  if (recentNotes.length > 50) recentNotes.pop();

  renderLog();
  updateStatus();
}

// 4. Update Status Indicators
async function updateStatus() {
  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost/*/*' });
    const localTab = tabs.find(t => t.url && t.url.includes('localhost'));

    if (localTab) {
      statusEl.className = 'status connected';
      statusText.innerText = 'Connected';
    } else {
      // Get buffer count to show in status
      const result = await chrome.storage.local.get({ thoughtBuffer: [] });
      const count = result.thoughtBuffer.length;
      statusEl.className = 'status';
      statusText.innerText = count > 0 ? `${count} buffered` : 'Offline';
    }
  } catch (err) {
    statusEl.className = 'status';
    statusText.innerText = 'Offline';
  }
}

// 5. Render Recent Log List
function renderLog() {
  if (recentNotes.length === 0) {
    logList.innerHTML = '<div class="empty-state">Your captured notes will pile up here.</div>';
    return;
  }

  logList.innerHTML = '';
  recentNotes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'log-item';
    
    // Status badge style
    const badgeColor = note.state === 'synced' ? 'color: #10b981;' : 'color: #f59e0b;';
    const badgeText = note.state === 'synced' ? 'Synced ✓' : 'Buffered ⌛';

    item.innerHTML = `
      <div style="font-weight: 500; word-break: break-word;">${escapeHTML(note.text)}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span style="font-size: 9px; font-weight: 600; text-transform: uppercase; ${badgeColor}">${badgeText}</span>
        <span class="time">${note.time}</span>
      </div>
    `;
    logList.appendChild(item);
  });
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 6. Polling Connection State
updateStatus();
setInterval(updateStatus, 2500);

// Focus input on load
noteInput.focus();
