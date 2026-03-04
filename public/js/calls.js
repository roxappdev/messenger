// Call manager for audio/video using PeerJS
class CallManager {
    constructor(peer) {
        this.peer = peer;
        this.currentCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isVideoCall = false;
    }

    // Start a call (audio or video)
    async startCall(remotePeerId, withVideo = false) {
        if (this.currentCall) {
            console.warn('A call is already in progress');
            return;
        }
        try {
            const constraints = {
                audio: true,
                video: withVideo
            };
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.isVideoCall = withVideo;
            this.updateLocalVideo(this.localStream);

            // Create a call via PeerJS
            this.currentCall = this.peer.call(remotePeerId, this.localStream);
            this.setupCallHandlers();
            console.log('Call started:', withVideo ? 'video' : 'audio');
            return this.currentCall;
        } catch (err) {
            console.error('Failed to get media or start call:', err);
            throw err;
        }
    }

    // Answer an incoming call
    async answerCall(call, withVideo = false) {
        if (this.currentCall) {
            console.warn('Already in a call, rejecting incoming');
            call.close();
            return;
        }
        try {
            const constraints = {
                audio: true,
                video: withVideo
            };
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.isVideoCall = withVideo;
            this.updateLocalVideo(this.localStream);

            this.currentCall = call;
            this.setupCallHandlers();
            call.answer(this.localStream);
            console.log('Call answered');
        } catch (err) {
            console.error('Failed to answer call:', err);
            call.close();
        }
    }

    // Setup call event handlers
    setupCallHandlers() {
        if (!this.currentCall) return;
        this.currentCall.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            this.remoteStream = remoteStream;
            this.updateRemoteVideo(remoteStream);
        });
        this.currentCall.on('close', () => {
            console.log('Call ended');
            this.cleanup();
        });
        this.currentCall.on('error', (err) => {
            console.error('Call error:', err);
            this.cleanup();
        });
    }

    // End the current call
    endCall() {
        if (this.currentCall) {
            this.currentCall.close();
            this.cleanup();
        }
    }

    // Cleanup media streams
    cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        this.remoteStream = null;
        this.currentCall = null;
        this.updateLocalVideo(null);
        this.updateRemoteVideo(null);
        console.log('Call cleaned up');
    }

    // Update local video element
    updateLocalVideo(stream) {
        const video = document.getElementById('localVideo');
        if (video) {
            video.srcObject = stream;
        }
    }

    // Update remote video element
    updateRemoteVideo(stream) {
        const video = document.getElementById('remoteVideo');
        if (video) {
            video.srcObject = stream;
        }
    }

    // Toggle video on/off during call
    async toggleVideo(enabled) {
        if (!this.localStream) return;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = enabled;
        } else if (enabled) {
            // Add video track
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = newStream.getVideoTracks()[0];
                this.localStream.addTrack(newVideoTrack);
                if (this.currentCall) {
                    // Replace track in call (simplified)
                    const sender = this.currentCall.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(newVideoTrack);
                }
            } catch (err) {
                console.error('Cannot enable video:', err);
            }
        }
    }

    // Toggle mute
    toggleMute(muted) {
        if (!this.localStream) return;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !muted;
        }
    }
}

// Integration with UI
document.addEventListener('DOMContentLoaded', () => {
    let callManager = null;
    let peer = window.peer; // Expect peer instance from app.js

    // Buttons
    const startAudioBtn = document.getElementById('startAudioCall');
    const startVideoBtn = document.getElementById('startVideoCall');
    const endCallBtn = document.getElementById('endCall');
    const callStatus = document.getElementById('callStatus');

    if (!peer) {
        console.warn('Peer not available, call features disabled');
        return;
    }

    // Initialize call manager when peer is ready
    peer.on('open', () => {
        callManager = new CallManager(peer);
        console.log('Call manager ready');
    });

    // Handle incoming calls
    peer.on('call', (call) => {
        if (!callManager) return;
        const withVideo = call.metadata && call.metadata.video;
        const confirmCall = confirm(`Incoming ${withVideo ? 'video' : 'audio'} call. Accept?`);
        if (confirmCall) {
            callManager.answerCall(call, withVideo);
            updateCallStatus('In call');
        } else {
            call.close();
        }
    });

    // Start audio call
    if (startAudioBtn) {
        startAudioBtn.addEventListener('click', async () => {
            const remotePeerId = window.conn ? window.conn.peer : prompt('Enter remote peer ID:');
            if (!remotePeerId) return;
            try {
                await callManager.startCall(remotePeerId, false);
                updateCallStatus('Audio call started');
                endCallBtn.disabled = false;
            } catch (err) {
                updateCallStatus('Failed to start call');
                console.error(err);
            }
        });
    }

    // Start video call
    if (startVideoBtn) {
        startVideoBtn.addEventListener('click', async () => {
            const remotePeerId = window.conn ? window.conn.peer : prompt('Enter remote peer ID:');
            if (!remotePeerId) return;
            try {
                await callManager.startCall(remotePeerId, true);
                updateCallStatus('Video call started');
                endCallBtn.disabled = false;
            } catch (err) {
                updateCallStatus('Failed to start call');
                console.error(err);
            }
        });
    }

    // End call
    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => {
            if (callManager) {
                callManager.endCall();
                updateCallStatus('Call ended');
                endCallBtn.disabled = true;
            }
        });
    }

    function updateCallStatus(text) {
        if (callStatus) callStatus.textContent = text;
    }
});