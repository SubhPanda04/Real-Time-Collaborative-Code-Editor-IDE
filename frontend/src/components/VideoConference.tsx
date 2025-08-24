import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { X, Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface VideoWindowProps {
    userId: string;
    userName: string;
    stream?: MediaStream;
    isLocal?: boolean;
    onClose?: () => void;
    isVideoEnabled?: boolean;
    isAudioEnabled?: boolean;
    position?: { x: number; y: number };
    onPositionChange?: (userId: string, position: { x: number; y: number }) => void;
}

interface VideoConferenceProps {
    isVideoEnabled: boolean;
    onToggleVideo: () => void;
    socket: Socket;
    roomId: string;
    users: { id: string; name: string }[];
    currentUserId: string;
}

interface PeerConnection {
    peerConnection: RTCPeerConnection;
    userName: string;
    isInitiator: boolean;
}

const VideoWindow = React.memo<VideoWindowProps>(({
    userId,
    userName,
    stream,
    isLocal = false,
    onClose,
    isVideoEnabled = true,
    isAudioEnabled = true,
    position: externalPosition,
    onPositionChange
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [position, setPosition] = useState(() => {
        if (externalPosition) return externalPosition;
        return {
            x: Math.random() * (window.innerWidth - 320),
            y: Math.random() * (window.innerHeight - 240)
        };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Update position when external position changes
    useEffect(() => {
        if (externalPosition) {
            setPosition(externalPosition);
        }
    }, [externalPosition]);

    // Update stream connection to video element
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Check if tracks are enabled
            const videoTracks = stream.getVideoTracks();
            if (videoTracks.length > 0) {
                // Ensure video tracks are enabled
                videoTracks.forEach(track => {
                    track.enabled = isVideoEnabled;
                });
            }

            // Ensure the video plays
            const playVideo = async () => {
                try {
                    const videoElement = videoRef.current;
                    if (videoElement && videoElement.isConnected) {
                        await videoElement.play();

                        // Monitor video dimensions to detect black screens
                        const checkVideoContent = () => {
                            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                // Try refreshing the stream connection
                                videoElement.srcObject = null;
                                setTimeout(() => {
                                    if (videoElement && stream) videoElement.srcObject = stream;
                                }, 500);
                            }
                        };

                        // Check video content after a delay
                        setTimeout(checkVideoContent, 2000);
                    }
                } catch (error) {
                    // Ignore AbortError as it's common when component unmounts
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        // Keep critical errors for production debugging
                        console.error(`Error playing video:`, error);
                    }
                }
            };

            // Add a small delay to ensure the element is properly mounted
            const timeoutId = setTimeout(playVideo, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [stream, userName, userId, isVideoEnabled]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const newPosition = {
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            };
            setPosition(newPosition);

            // Only emit position change for non-local videos
            if (!isLocal && onPositionChange) {
                onPositionChange(userId, newPosition);
            }
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    return (
        <div
            className="video-window"
            style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: '320px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                zIndex: isDragging ? 100 : 10,
                border: '2px solid rgba(255, 255, 255, 0.1)',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                className="drag-handle"
                style={{
                    height: '30px',
                    backgroundColor: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    cursor: 'move',
                    userSelect: 'none',
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DragHandleDots2Icon />
                    <span style={{ fontSize: '14px' }}>{userName}{isLocal ? ' (You)' : ''}</span>
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isVideoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
                    {isAudioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <X size={14} color="#fff" />
                        </button>
                    )}
                </div>
            </div>
            <div style={{ position: 'relative', width: '320px', height: '240px', backgroundColor: '#000' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal || !isAudioEnabled}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: isVideoEnabled ? 'block' : 'none',
                    }}
                />

                {!isVideoEnabled && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#333',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                        }}
                    >
                        <VideoOff size={48} color="#666" />
                    </div>
                )}
            </div>
        </div>
    );
});

const VideoConference: React.FC<VideoConferenceProps> = ({
    isVideoEnabled,
    onToggleVideo,
    socket,
    roomId,
    users,
    currentUserId,
}) => {
    // ICE servers configuration for WebRTC
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
    };

    // State for local media stream
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const [peerConnections, setPeerConnections] = useState<Record<string, PeerConnection>>({});
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

    const [videoPositions, setVideoPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [remoteVideoPositions, setRemoteVideoPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [remoteVideoStates, setRemoteVideoStates] = useState<Record<string, boolean>>({});
    const [remoteAudioStates, setRemoteAudioStates] = useState<Record<string, boolean>>({});
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [localVideoEnabled, setLocalVideoEnabled] = useState(true);

    const peerConnectionsRef = useRef<Record<string, PeerConnection>>({});

    // Sync ref with state
    useEffect(() => {
        peerConnectionsRef.current = peerConnections;
    }, [peerConnections]);

    // Access user media
    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            setLocalStream(stream);
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            return null;
        }
    };

    // Utility function to ensure all local tracks are properly added
    const ensureTracksAreAdded = useCallback((peerConnection: RTCPeerConnection, userName: string) => {
        if (!localStreamRef.current) {
            return;
        }

        const localTracks = localStreamRef.current.getTracks();
        const senders = peerConnection.getSenders();

        localTracks.forEach(track => {
            const existingSender = senders.find(s => s.track && s.track.kind === track.kind);

            if (!existingSender) {
                peerConnection.addTrack(track, localStreamRef.current!);
            } else if (existingSender.track !== track) {
                existingSender.replaceTrack(track);
            }
        });
    }, []);

    const createPeerConnection = useCallback((userId: string, userName: string, isInitiator: boolean = false) => {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10,
            iceTransportPolicy: 'all'
        });

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    roomId,
                    candidate: event.candidate,
                    targetUserId: userId,
                });
            }
        };

        peerConnection.ontrack = (event) => {
            const [remoteStream] = event.streams;
            if (remoteStream) {
                // Ensure we have both audio and video tracks
                const audioTracks = remoteStream.getAudioTracks();
                const videoTracks = remoteStream.getVideoTracks();

                // Force enabling tracks if they're disabled
                audioTracks.forEach(track => track.enabled = true);
                videoTracks.forEach(track => track.enabled = true);

                setRemoteStreams(prev => ({
                    ...prev,
                    [userId]: remoteStream
                }));
            } else {
                console.error(`No remote stream received`);
            }
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'failed') {
                // Try to restart the ICE connection
                peerConnection.restartIce();

                // More aggressive approach - recreate the connection after a delay
                setTimeout(() => {
                    if (localStreamRef.current && peerConnection.connectionState === 'failed') {
                        // First try to add tracks again
                        ensureTracksAreAdded(peerConnection, userName);

                        // If still failing after another delay, trigger renegotiation
                        setTimeout(() => {
                            if (peerConnection.connectionState === 'failed' && isInitiator) {
                                createOffer(peerConnection, userId);
                            }
                        }, 2000);
                    }
                }, 1000);
            } else if (peerConnection.connectionState === 'disconnected') {
                // Wait a bit before attempting restart
                setTimeout(() => {
                    if (peerConnection.connectionState === 'disconnected') {
                        peerConnection.restartIce();

                        // Re-add local tracks if they're missing
                        if (localStreamRef.current) {
                            ensureTracksAreAdded(peerConnection, userName);
                        }
                    }
                }, 2000);
            }
        };

        // Add our peer connection to the map
        const peerConnectionObj = { peerConnection, userName, isInitiator };
        peerConnectionsRef.current = {
            ...peerConnectionsRef.current,
            [userId]: peerConnectionObj
        };
        setPeerConnections(prev => ({
            ...prev,
            [userId]: peerConnectionObj
        }));

        // If we have a local stream, add tracks to the peer connection
        if (localStreamRef.current) {
            ensureTracksAreAdded(peerConnection, userName);
        }

        return peerConnection;
    }, [socket, roomId, ensureTracksAreAdded]);

    // Create and send offer
    const createOffer = useCallback(async (peerConnection: RTCPeerConnection, targetUserId: string) => {
        try {
            const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peerConnection.setLocalDescription(offer);

            socket.emit('offer', {
                roomId,
                offer,
                targetUserId,
            });
        } catch (error) {
            console.error(`Error creating offer:`, error);
        }
    }, [socket, roomId]);

    const createAnswer = useCallback(async (peerConnection: RTCPeerConnection, offer: RTCSessionDescriptionInit, targetUserId: string) => {
        try {
            // Ensure local tracks are added before creating answer
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    const senders = peerConnection.getSenders();
                    const hasSender = senders.some(sender => sender.track && sender.track.kind === track.kind);
                    if (!hasSender) {
                        peerConnection.addTrack(track, localStreamRef.current!);
                    }
                });
            }

            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('answer', {
                roomId,
                answer,
                targetUserId,
            });
        } catch (error) {
            console.error(`Error creating answer:`, error);
        }
    }, [socket, roomId]);

    // Handle position changes
    const handlePositionChange = useCallback((userId: string, position: { x: number; y: number }) => {
        socket.emit('video-position-change', {
            roomId,
            userId,
            position,
        });
    }, [socket, roomId]);

    // Handle new user joining video
    const handleUserJoinedVideo = useCallback(({ userId, userName }: { userId: string; userName: string }) => {
        if (userId !== currentUserId) {
            // Create peer connection if it doesn't exist
            if (!(userId in peerConnectionsRef.current)) {
                const peerConnection = createPeerConnection(userId, userName, true);

                // Add a slight delay before creating the offer to ensure the connection is ready
                setTimeout(() => {
                    createOffer(peerConnection, userId);
                }, 500);
            }
        }
    }, [currentUserId, createPeerConnection, createOffer]);

    const handleOffer = useCallback(async ({ offer, fromUserId, fromUserName }: { offer: RTCSessionDescriptionInit; fromUserId: string; fromUserName: string }) => {
        const existingPeer = peerConnectionsRef.current[fromUserId];

        if (!existingPeer) {
            const peerConnection = createPeerConnection(fromUserId, fromUserName, false);

            setTimeout(() => {
                createAnswer(peerConnection, offer, fromUserId);
            }, 100);
        } else {
            // For rejoining users, always handle the offer to ensure fresh connection
            try {
                // Close existing connection and create fresh one for better reliability
                existingPeer.peerConnection.close();
                delete peerConnectionsRef.current[fromUserId];
                setPeerConnections(prev => {
                    const newPeerConnections = { ...prev };
                    delete newPeerConnections[fromUserId];
                    return newPeerConnections;
                });

                // Create fresh peer connection
                const peerConnection = createPeerConnection(fromUserId, fromUserName, false);
                setTimeout(() => {
                    createAnswer(peerConnection, offer, fromUserId);
                }, 100);
            } catch (error) {
                console.error(`Error handling offer for existing connection:`, error);
            }
        }
    }, [createPeerConnection, createAnswer]);

    const handleAnswer = useCallback(async ({ answer, fromUserId }: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {
        const peer = peerConnectionsRef.current[fromUserId];
        if (peer) {
            try {
                await peer.peerConnection.setRemoteDescription(answer);
            } catch (error) {
                console.error(`Error processing answer:`, error);
            }
        }
    }, []);

    const handleIceCandidate = useCallback(async ({ candidate, fromUserId }: { candidate: RTCIceCandidate; fromUserId: string }) => {
        const peer = peerConnectionsRef.current[fromUserId];
        if (peer && peer.peerConnection.remoteDescription) {
            try {
                await peer.peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error(`Error adding ICE candidate:`, error);
            }
        }
    }, []);

    const handleUserLeftVideo = useCallback(({ userId }: { userId: string }) => {
        const peer = peerConnectionsRef.current[userId];
        if (peer) {
            peer.peerConnection.close();
            delete peerConnectionsRef.current[userId];
            setPeerConnections(prev => {
                const newPeerConnections = { ...prev };
                delete newPeerConnections[userId];
                return newPeerConnections;
            });
            setRemoteStreams(prev => {
                const newRemoteStreams = { ...prev };
                delete newRemoteStreams[userId];
                return newRemoteStreams;
            });
            setRemoteVideoStates(prev => {
                const newStates = { ...prev };
                delete newStates[userId];
                return newStates;
            });
            setRemoteAudioStates(prev => {
                const newStates = { ...prev };
                delete newStates[userId];
                return newStates;
            });
            setRemoteVideoPositions(prev => {
                const newPositions = { ...prev };
                delete newPositions[userId];
                return newPositions;
            });
        }
    }, []);

    const handleExistingVideoUsers = useCallback(({ users }: { users: { userId: string; userName: string; position?: { x: number; y: number } }[] }) => {
        users.forEach(({ userId, userName, position }) => {
            if (userId !== currentUserId && !(userId in peerConnectionsRef.current)) {
                const peerConnection = createPeerConnection(userId, userName, true);
                createOffer(peerConnection, userId);

                if (position) {
                    setRemoteVideoPositions(prev => ({
                        ...prev,
                        [userId]: position
                    }));
                }
            }
        });
    }, [currentUserId, createPeerConnection, createOffer]);

    const handleVideoPositionUpdate = useCallback(({ userId, position }) => {
        setRemoteVideoPositions(prev => ({
            ...prev,
            [userId]: position
        }));
    }, []);

    const handleVideoToggle = useCallback(({ userId, isVideoEnabled }) => {
        // Update remote video state in our state map
        setRemoteVideoStates(prev => ({
            ...prev,
            [userId]: isVideoEnabled
        }));

        // If we have their stream, ensure the video tracks reflect this state
        const remoteStream = remoteStreams[userId];
        if (remoteStream) {
            const videoTracks = remoteStream.getVideoTracks();
            videoTracks.forEach(track => {
                // Note: we don't disable the track itself, just update our UI state
            });
        }
    }, [remoteStreams]);

    const handleAudioToggle = useCallback(({ userId, isAudioEnabled }) => {
        setRemoteAudioStates(prev => ({
            ...prev,
            [userId]: isAudioEnabled
        }));
    }, []);

    // Socket event handlers setup
    useEffect(() => {
        // Register socket events
        socket.on('user-joined-video', handleUserJoinedVideo);
        socket.on('existing-video-users', handleExistingVideoUsers);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user-left-video', handleUserLeftVideo);
        socket.on('video-position-change', handleVideoPositionUpdate);
        socket.on('video-toggle', handleVideoToggle);
        socket.on('audio-toggle', handleAudioToggle);

        return () => {
            socket.off('user-joined-video', handleUserJoinedVideo);
            socket.off('existing-video-users', handleExistingVideoUsers);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user-left-video', handleUserLeftVideo);
            socket.off('video-position-change', handleVideoPositionUpdate);
            socket.off('video-toggle', handleVideoToggle);
            socket.off('audio-toggle', handleAudioToggle);
        };
    }, [socket]);

    useEffect(() => {
        if (localVideoEnabled) {
            Object.values(peerConnectionsRef.current).forEach(peer => peer.peerConnection.close());
            peerConnectionsRef.current = {};
            setPeerConnections({});
            setRemoteStreams({});

            // Initialize local media
            initializeMedia().then(stream => {
                if (stream) {
                    // Notify server about joining video chat
                    socket.emit('join-video', { roomId });

                    // Add a delay before checking existing users to ensure server is ready
                    setTimeout(() => {
                        // Send a notification to each user currently in the room
                        users.forEach(user => {
                            if (user.id !== currentUserId) {
                                socket.emit('check-video-user', { roomId, userId: user.id });
                            }
                        });
                    }, 1000);
                }
            });
        } else {
            // Stop all tracks and clean up
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    track.stop();
                });
                setLocalStream(null);
                localStreamRef.current = null;
            }

            // Close all peer connections
            Object.values(peerConnectionsRef.current).forEach((peer) => {
                peer.peerConnection.close();
            });

            peerConnectionsRef.current = {};
            setPeerConnections({});
            setRemoteStreams({});
            setRemoteVideoStates({});
            setRemoteAudioStates({});
            setRemoteVideoPositions({});

            socket.emit('leave-video', { roomId });
        }

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            Object.values(peerConnectionsRef.current).forEach(peer => peer.peerConnection.close());
        };
    }, [localVideoEnabled, roomId, users, currentUserId, socket]); // Include all needed dependencies

    // Effect to handle new users joining when video is already enabled
    useEffect(() => {
        if (localVideoEnabled && localStreamRef.current) {
            const existingConnectionIds = new Set(Object.keys(peerConnectionsRef.current));

            // Find users who don't have peer connections yet
            users.forEach(user => {
                if (user.id !== currentUserId && !existingConnectionIds.has(user.id)) {
                    socket.emit('check-video-user', { roomId, userId: user.id });
                }
            });
        }
    }, [users.length, localVideoEnabled]); // Only depend on users.length to reduce re-renders

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);

                socket.emit('audio-toggle', {
                    roomId,
                    isAudioEnabled: audioTrack.enabled,
                });
            }
        }
    };

    const toggleLocalVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                // Toggle video track's enabled state
                videoTrack.enabled = !videoTrack.enabled;
                const newEnabledState = videoTrack.enabled;

                // Force UI update
                setLocalStream(prevStream => {
                    if (prevStream) {
                        return new MediaStream([
                            ...prevStream.getAudioTracks(),
                            ...prevStream.getVideoTracks()
                        ]);
                    }
                    return prevStream;
                });

                // Update video state in the UI
                setLocalVideoEnabled(newEnabledState);

                // Emit video toggle event to inform other peers
                socket.emit('video-toggle', {
                    roomId,
                    isVideoEnabled: newEnabledState
                });

                // Call the parent's toggle handler
                onToggleVideo();
            }
        }
    };

    // Handle video position changes from draggable windows
    const handleVideoPositionChange = useCallback((userId: string, position: { x: number; y: number }) => {
        // Update local state
        setRemoteVideoPositions(prev => ({
            ...prev,
            [userId]: position
        }));

        // Send position update to other peers if it's our video
        if (userId === currentUserId) {
            socket.emit('video-position-change', {
                roomId,
                userId,
                position
            });
        }
    }, [currentUserId, roomId, socket]);

    // Render the video conference interface
    return (
        <div className="fixed inset-0 bg-black/20 z-50 overflow-hidden pointer-events-none">
            {/* Local video */}
            {localStream && (
                <div className="pointer-events-auto">
                    <VideoWindow
                        userId={currentUserId}
                        userName="You"
                        stream={localStream}
                        isLocal={true}
                        isVideoEnabled={localVideoEnabled}
                        isAudioEnabled={isAudioEnabled}
                        position={{ x: 20, y: 20 }}
                        onPositionChange={handleVideoPositionChange}
                    />
                </div>
            )}

            {Object.keys(remoteStreams).map(userId => (
                <div key={userId} className="pointer-events-auto">
                    <VideoWindow
                        userId={userId}
                        userName={peerConnections[userId]?.userName || 'User'}
                        stream={remoteStreams[userId]}
                        isVideoEnabled={remoteVideoStates[userId]}
                        isAudioEnabled={remoteAudioStates[userId]}
                        position={remoteVideoPositions[userId]}
                        onPositionChange={handleVideoPositionChange}
                    />
                </div>
            ))}

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-slate-800/70 p-3 rounded-full shadow-lg pointer-events-auto">
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full ${isAudioEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                >
                    {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </button>
                <button
                    onClick={toggleLocalVideo}
                    className={`p-3 rounded-full ${localVideoEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                >
                    {localVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                </button>
                <button
                    onClick={onToggleVideo}
                    className="p-3 rounded-full bg-slate-800/50 text-slate-300 hover:bg-slate-700"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default VideoConference;
