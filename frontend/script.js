// ===========================
// CRACK THE VAULT — Chat UI
// ===========================

const API_URL = 'http://localhost:8000';

// DOM Elements
const userSelect = document.getElementById('user-select');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const vaultBalance = document.getElementById('vault-balance');
const securityLevel = document.getElementById('security-level');
const userWallet = document.getElementById('user-wallet');
const connectionStatus = document.getElementById('connection-status');

let sessionId = 'SESSION_' + Math.floor(Math.random() * 99999);
let currentUserId = null;

// ===========================
// FORMATTING
// ===========================
function formatCurrency(val) {
    const num = parseFloat(val) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===========================
// FETCH DASHBOARD INFO
// ===========================
async function fetchInfo(userId) {
    try {
        let url = `${API_URL}/info`;
        if (userId) url += `?user_id=${userId}`;

        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to fetch info');
        const data = await resp.json();

        // Update vault balance
        vaultBalance.textContent = formatCurrency(data.vault_balance);

        // Update security level
        const level = data.security_level || 1;
        securityLevel.textContent = `LVL ${level}`;

        // Update user wallet
        if (data.user_wallet_balance !== undefined) {
            userWallet.textContent = formatCurrency(data.user_wallet_balance);
        }

        // Populate user dropdown (only if users exist and dropdown is empty/has placeholder)
        if (data.users && data.users.length > 0 && userSelect.options.length <= 1) {
            userSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '— Select Agent —';
            placeholder.disabled = true;
            placeholder.selected = true;
            userSelect.appendChild(placeholder);

            data.users.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user.id;
                opt.textContent = `${user.username} (#${user.id})`;
                userSelect.appendChild(opt);
            });
        }

        // Update connection status
        setOnline(true);
    } catch (err) {
        console.error('Info fetch error:', err);
        setOnline(false);
    }
}

function setOnline(online) {
    const dot = document.querySelector('.dot');
    if (online) {
        dot.className = 'dot online';
        connectionStatus.textContent = 'ONLINE';
    } else {
        dot.className = 'dot offline';
        connectionStatus.textContent = 'OFFLINE';
    }
}

// ===========================
// CHAT MESSAGES
// ===========================
function addUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'user-msg';
    msg.innerHTML = `
        <div class="msg-icon">👤</div>
        <div class="msg-body">
            <div class="msg-sender">YOU</div>
            <div class="msg-text">${escapeHtml(text)}</div>
        </div>
    `;
    chatMessages.appendChild(msg);
    scrollToBottom();
}

function addSystemMessage(text, status) {
    const statusClass = status === 'APPROVED' ? 'approved' : 'rejected';
    const statusLabel = status || 'RESPONSE';

    const msg = document.createElement('div');
    msg.className = 'system-msg';
    msg.innerHTML = `
        <div class="msg-icon">🛡️</div>
        <div class="msg-body">
            <div class="msg-sender">VAULT GUARDIAN</div>
            <div class="msg-text">
                <span class="status-badge ${statusClass}">${statusLabel}</span><br/>
                ${escapeHtml(text)}
            </div>
        </div>
    `;
    chatMessages.appendChild(msg);
    scrollToBottom();
}

function addThinkingIndicator() {
    const msg = document.createElement('div');
    msg.className = 'system-msg';
    msg.id = 'thinking-msg';
    msg.innerHTML = `
        <div class="msg-icon">🛡️</div>
        <div class="msg-body">
            <div class="msg-sender">VAULT GUARDIAN</div>
            <div class="thinking-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(msg);
    scrollToBottom();
}

function removeThinkingIndicator() {
    const el = document.getElementById('thinking-msg');
    if (el) el.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===========================
// SEND MESSAGE
// ===========================
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!currentUserId) {
        addSystemMessage('Please select an agent before transmitting.', 'REJECTED');
        return;
    }

    // Add user message to chat
    addUserMessage(text);
    userInput.value = '';
    autoResizeInput();

    // Disable input
    userInput.disabled = true;
    sendBtn.disabled = true;

    // Show thinking indicator
    addThinkingIndicator();

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                user_id: parseInt(currentUserId),
                session_id: sessionId
            })
        });

        removeThinkingIndicator();

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            addSystemMessage(errData.detail || 'Communication error with vault system.', 'REJECTED');
            return;
        }

        const data = await response.json();

        // Display only the message (no scores)
        const displayMsg = data.message || data.reason || 'No response from vault.';
        addSystemMessage(displayMsg, data.status);

        // Refresh dashboard stats after each message
        await fetchInfo(currentUserId);

    } catch (error) {
        removeThinkingIndicator();
        console.error('Send error:', error);
        addSystemMessage('Connection to vault system failed. Check if services are running.', 'REJECTED');
        setOnline(false);
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// ===========================
// AUTO-RESIZE TEXTAREA
// ===========================
function autoResizeInput() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// ===========================
// EVENT LISTENERS
// ===========================
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

userInput.addEventListener('input', autoResizeInput);

userSelect.addEventListener('change', async (e) => {
    currentUserId = e.target.value;
    if (currentUserId) {
        // Generate new session for new user
        sessionId = 'SESSION_' + Math.floor(Math.random() * 99999);
        await fetchInfo(currentUserId);
    }
});

// ===========================
// INIT
// ===========================
window.addEventListener('DOMContentLoaded', () => {
    fetchInfo();
    // Refresh stats every 30 seconds
    setInterval(() => {
        if (currentUserId) fetchInfo(currentUserId);
    }, 30000);
});
