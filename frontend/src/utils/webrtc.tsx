export const optimizedIceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all'
};

export const rtcConfiguration = {
    ...optimizedIceServers,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    sdpSemantics: 'unified-plan'
};

export const optimizedOfferOptions = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: true,
    iceRestart: true
};

export const optimizedMediaConstraints = {
    video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 },
        facingMode: 'user',
    },
    audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    }
};

export const cleanupMediaStream = (stream: MediaStream | null) => {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
    }
};

export const cleanupPeerConnection = (peerConnection: RTCPeerConnection | null) => {
    if (peerConnection) {
        if (peerConnection.signalingState !== 'closed') {
            peerConnection.close();
        }

        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;
        peerConnection.oniceconnectionstatechange = null;
        peerConnection.onsignalingstatechange = null;
        peerConnection.onicegatheringstatechange = null;
        peerConnection.onconnectionstatechange = null;
    }
};
