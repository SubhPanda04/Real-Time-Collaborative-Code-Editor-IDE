// WebRTC types for better TypeScript support
export { };

// Extend global WebRTC types if needed
declare global {
    interface MediaDevices {
        getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
    }

    interface RTCPeerConnection {
        getSenders(): RTCRtpSender[];
        getReceivers(): RTCRtpReceiver[];
        addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender;
        removeTrack(sender: RTCRtpSender): void;
    }

    interface MediaStream {
        getVideoTracks(): MediaStreamTrack[];
        getAudioTracks(): MediaStreamTrack[];
        getTracks(): MediaStreamTrack[];
    }

    interface MediaStreamTrack {
        enabled: boolean;
        readonly kind: string;
        stop(): void;
    }
}
