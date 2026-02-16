const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const mainStatus = document.getElementById('main-status');
const reasonText = document.getElementById('reason-text');

// Telemetry Bars
const qualityBar = document.getElementById('bar-quality');
const emotionBar = document.getElementById('bar-emotion');
const confidenceBar = document.getElementById('bar-confidence');

// Telemetry Values
const qualityVal = document.getElementById('score-val-quality');
const emotionVal = document.getElementById('score-val-emotion');
const confidenceVal = document.getElementById('score-val-confidence');

const sessionId = 'SESSION_' + Math.floor(Math.random() * 99999);

// Map string values (High/Medium/Low) to percentages for the UI
const METRIC_MAP = {
    "strong": 100, "high": 100,
    "medium": 60,
    "weak": 30, "low": 20,
    "N/A": 0
};

function updateTelemetry(data) {
    // 1. Argument Quality
    const qVal = data.argument_quality || "N/A";
    const qPct = METRIC_MAP[qVal.toLowerCase()] || 0;
    qualityBar.style.width = `${qPct}%`;
    qualityVal.innerText = `${qPct}% (${qVal.toUpperCase()})`;

    // 2. Emotional Manipulation
    const eVal = data.emotional_manipulation || "N/A";
    const ePct = METRIC_MAP[eVal.toLowerCase()] || 0;
    emotionBar.style.width = `${ePct}%`;
    emotionVal.innerText = `${ePct}% (${eVal.toUpperCase()})`;

    // Color change for Emotion (High emotion is bad/red)
    if (ePct > 50) {
        emotionBar.style.backgroundColor = '#ff0055';
        emotionBar.style.boxShadow = '0 0 10px #ff0055';
    } else {
        emotionBar.style.backgroundColor = '#00ff41';
        emotionBar.style.boxShadow = '0 0 10px #00ff41';
    }

    // 3. Confidence Band
    const cVal = data.confidence_band || "N/A";
    const cPct = METRIC_MAP[cVal.toLowerCase()] || 0;
    confidenceBar.style.width = `${cPct}%`;
    confidenceVal.innerText = `${cPct}% (${cVal.toUpperCase()})`;
}

function updateStatus(status, reason) {
    mainStatus.innerText = status;
    reasonText.innerText = reason || "Evaluation Complete.";

    // Reset classes
    mainStatus.className = 'status-big';

    if (status === 'APPROVED') {
        mainStatus.classList.add('status-approved');
    } else if (status === 'REJECTED') {
        mainStatus.classList.add('status-rejected');
    } else {
        mainStatus.classList.add('status-idle');
    }
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // UI State: Sending
    userInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerText = "TRANSMITTING...";

    updateStatus("ANALYZING...", "Processing semantic vectors...");

    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                user_id: 1, // Default user
                session_id: sessionId
            })
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        // Update UI with results
        updateTelemetry(data);
        updateStatus(data.status, data.reason || data.message);

        // Flash Input Area based on result
        if (data.status === 'APPROVED') {
            document.querySelector('.input-panel').style.borderColor = '#00ff41';
        } else {
            document.querySelector('.input-panel').style.borderColor = '#ff0055';
        }

        setTimeout(() => {
            document.querySelector('.input-panel').style.borderColor = '#1a1a1a';
        }, 1000);

    } catch (error) {
        console.error("Error:", error);
        updateStatus("OFFLINE", "Connection to Neural Net failed.");
        mainStatus.classList.add('status-rejected');
    } finally {
        userInput.disabled = false;
        userInput.value = '';
        sendBtn.disabled = false;
        sendBtn.innerText = "SEND_REQUEST →";
        userInput.focus();
    }
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
