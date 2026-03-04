// Messenger module for P2P chat
document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const chatMessages = document.getElementById('chatMessages');
    const messagesCountEl = document.getElementById('messagesCount');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let messagesCount = 0;

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            // Update active tab button
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Show corresponding tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tab}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Update messages count
    function updateMessagesCount() {
        messagesCount++;
        if (messagesCountEl) messagesCountEl.textContent = messagesCount;
    }

    // Add a message to the chat UI
    function addMessage(text, sender = 'peer', isSystem = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSystem ? 'system' : sender}`;
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const senderLabel = isSystem ? '' : `<span class="sender">${sender === 'self' ? 'You' : 'Peer'}</span>`;
        messageDiv.innerHTML = `
            ${senderLabel}
            <span class="text">${escapeHtml(text)}</span>
            <span class="time">${time}</span>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        if (!isSystem) updateMessagesCount();
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Send message via data connection
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        if (!window.conn || !window.conn.open) {
            addMessage('Not connected to a peer. Please connect first.', 'system', true);
            return;
        }
        const msg = {
            type: 'chat-message',
            text: text,
            timestamp: Date.now(),
            sender: window.currentPeerId
        };
        window.conn.send(JSON.stringify(msg));
        addMessage(text, 'self');
        messageInput.value = '';
        messageInput.focus();
    }

    // Handle incoming chat message
    window.handleChatMessage = function(data) {
        if (data.type === 'chat-message') {
            addMessage(data.text, 'peer');
        }
    };

    // Attach event listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Expose functions globally
    window.addMessage = addMessage;
    window.sendMessage = sendMessage;
});