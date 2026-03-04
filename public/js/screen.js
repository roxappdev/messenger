// Screen sharing manager
class ScreenShareManager {
    constructor(peer) {
        this.peer = peer;
        this.screenStream = null;
        this.screenCall = null;
        this.isSharing = false;
    }

    // Start screen sharing
    async startSharing(remotePeerId) {
        if (this.isSharing) {
            console.warn('Screen sharing already active');
            return;
        }
        try {
            // Get screen stream
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor'
                },
                audio: false
            });
            this.isSharing = true;
            this.updateScreenPreview(this.screenStream);

            // Send screen stream via PeerJS call
            this.screenCall = this.peer.call(remotePeerId, this.screenStream, {
                metadata: { type: 'screen' }
            });
            this.setupScreenCallHandlers();

            // Handle stop sharing via browser UI
            this.screenStream.getVideoTracks()[0].onended = () => {
                this.stopSharing();
            };

            console.log('Screen sharing started');
            return this.screenCall;
        } catch (err) {
            console.error('Failed to start screen sharing:', err);
            throw err;
        }
    }

    // Stop screen sharing
    stopSharing() {
        if (this.screenCall) {
            this.screenCall.close();
            this.screenCall = null;
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        this.isSharing = false;
        this.updateScreenPreview(null);
        console.log('Screen sharing stopped');
    }

    // Setup call handlers for screen sharing
    setupScreenCallHandlers() {
        if (!this.screenCall) return;
        this.screenCall.on('close', () => {
            console.log('Screen call closed');
            this.stopSharing();
        });
        this.screenCall.on('error', (err) => {
            console.error('Screen call error:', err);
            this.stopSharing();
        });
    }

    // Update preview video element
    updateScreenPreview(stream) {
        const video = document.getElementById('screenVideo');
        if (video) {
            video.srcObject = stream;
        }
    }

    // Handle incoming screen sharing (not typical, but could be used)
    handleIncomingScreenCall(call) {
        call.on('stream', (stream) => {
            // Show remote screen
            const video = document.getElementById('screenVideo');
            if (video) video.srcObject = stream;
        });
    }
}

// UI integration
document.addEventListener('DOMContentLoaded', () => {
    let screenManager = null;
    const startScreenBtn = document.getElementById('startScreenShare');
    const stopScreenBtn = document.getElementById('stopScreenShare');

    if (!window.peer) {
        console.warn('Peer not available, screen sharing disabled');
        return;
    }

    // Initialize when peer is ready
    window.peer.on('open', () => {
        screenManager = new ScreenShareManager(window.peer);
        console.log('Screen share manager ready');
    });

    // Start screen sharing
    if (startScreenBtn) {
        startScreenBtn.addEventListener('click', async () => {
            const remotePeerId = window.conn ? window.conn.peer : prompt('Enter remote peer ID to share screen:');
            if (!remotePeerId) return;
            try {
                await screenManager.startSharing(remotePeerId);
                startScreenBtn.disabled = true;
                stopScreenBtn.disabled = false;
            } catch (err) {
                console.error('Screen sharing failed:', err);
            }
        });
    }

    // Stop screen sharing
    if (stopScreenBtn) {
        stopScreenBtn.addEventListener('click', () => {
            if (screenManager) {
                screenManager.stopSharing();
                startScreenBtn.disabled = false;
                stopScreenBtn.disabled = true;
            }
        });
    }

    // Handle incoming screen call (optional)
    window.peer.on('call', (call) => {
        if (call.metadata && call.metadata.type === 'screen') {
            // Accept screen sharing stream
            call.answer(); // no local stream needed
            call.on('stream', (stream) => {
                const video = document.getElementById('screenVideo');
                if (video) video.srcObject = stream;
            });
        }
    });
});