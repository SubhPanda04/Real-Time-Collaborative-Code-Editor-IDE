import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, X, Move } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface User {
    id: string;
    name: string;
}

interface VideoConferenceProps {
    socket: Socket;
    roomId: string;
    users: User[];
    currentUserId: string;
    isVideoEnabled: boolean;
    onToggleVideo: () => void;
}

interface PeerConnection {
    id: string;
    name: string;
    peerConnection: RTCPeerConnection;
    stream?: MediaStream;
}

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

const VideoWindow: React.FC<VideoWindowProps> = ({
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
        if (externalPosition && !isDragging) {
            setPosition(externalPosition);
        }
    }, [externalPosition, isDragging]);

    // Set video stream
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Ensure the video plays
            const playVideo = async () => {
                try {
                    const videoElement = videoRef.current;
                    if (videoElement && videoElement.isConnected) {
                        await videoElement.play();
                    }
                } catch (error) {
                    // Only log non-abort errors to reduce noise
                    if (error instanceof DOMException && error.name !== 'AbortError') {
                        console.error(`❌ Error playing video for ${userName}:`, error);
                    }
                }
            };

            // Add a small delay to ensure the element is properly mounted
            const timeoutId = setTimeout(playVideo, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [stream, userName]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('drag-handle')) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) {
            const newPosition = {
                x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x)),
                y: Math.max(0, Math.min(window.innerHeight - 240, e.clientY - dragOffset.y))
            };
            setPosition(newPosition);
            onPositionChange?.(userId, newPosition);
        }
    }, [isDragging, dragOffset, userId, onPositionChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className="fixed bg-slate-800 rounded-lg shadow-2xl border border-slate-600 overflow-hidden z-50"
            style={{
                left: position.x,
                top: position.y,
                width: '320px',
                height: '240px',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className="drag-handle bg-slate-700 px-3 py-2 flex items-center justify-between cursor-grab">
                <div className="flex items-center space-x-2">
                    <Move className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-white">{userName}</span>
                </div>
                <div className="flex items-center space-x-1">
                    {!isAudioEnabled && <MicOff className="w-4 h-4 text-red-400" />}
                    {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-400" />}
                    {isLocal && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Video content */}
            <div className="h-48 relative">
                {isVideoEnabled && stream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isLocal}
                        controls={false}
                        className="w-full h-full object-cover bg-black"
                        onError={(e) => {
                            const target = e.target as HTMLVideoElement;
                            if (target.error) {
                                console.error(`❌ Video error for ${userName}:`, target.error.message);
                            }
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-2">
                                {userName.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-sm text-slate-400">Camera off</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const VideoConference: React.FC<VideoConferenceProps> = ({
    socket,
    roomId,
    users,
    currentUserId,
    isVideoEnabled,
    onToggleVideo,
}) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peerConnections, setPeerConnections] = useState<Map<string, PeerConnection>>(new Map());
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [remoteVideoStates, setRemoteVideoStates] = useState<Map<string, boolean>>(new Map());
    const [remoteAudioStates, setRemoteAudioStates] = useState<Map<string, boolean>>(new Map());
    const [videoPositions, setVideoPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

    // Use refs to access current state in effects without causing re-renders
    const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);

    // Update refs when state changes
    useEffect(() => {
        peerConnectionsRef.current = peerConnections;
    }, [peerConnections]);

    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);

    const iceServers = React.useMemo(() => ({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    }), []);

    // Initialize local media stream
    const initializeMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                },
                audio: true,
            });

            // Ensure all tracks are enabled
            stream.getTracks().forEach(track => {
                track.enabled = true;
            });

            setLocalStream(stream);
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
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

        // Verify final state
        const finalSenders = peerConnection.getSenders().filter(s => s.track);
    }, []);    // Create peer connection
    const createPeerConnection = useCallback((userId: string, userName: string, isInitiator: boolean = false) => {
        const peerConnection = new RTCPeerConnection(iceServers);

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


                // Log track details for debugging
                audioTracks.forEach(track => );
                videoTracks.forEach(track => );

                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    const existingStream = newMap.get(userId);
                    if (existingStream) {

                    }
                    newMap.set(userId, remoteStream);

                    return newMap;
                });
            } else {
                console.error(`❌ No remote stream received from ${userName}`);
            }
        };

        peerConnection.onconnectionstatechange = () => {


            if (peerConnection.connectionState === 'failed') {

                // Try to restart the ICE connection
                peerConnection.restartIce();

                // Re-add local tracks if they're missing
                setTimeout(() => {
                    if (localStreamRef.current && peerConnection.connectionState === 'failed') {

                        ensureTracksAreAdded(peerConnection, userName);
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
                }, 5000);
            }
        }; peerConnection.oniceconnectionstatechange = () => {


            if (peerConnection.iceConnectionState === 'failed') {

                peerConnection.restartIce();
            }
        };

        // Add local stream tracks if available
        if (localStreamRef.current) {

            ensureTracksAreAdded(peerConnection, userName);
        }

        const newPeerConnection: PeerConnection = {
            id: userId,
            name: userName,
            peerConnection,
        };

        // Update the ref immediately
        peerConnectionsRef.current.set(userId, newPeerConnection);
        setPeerConnections(prev => new Map(prev.set(userId, newPeerConnection)));

        return peerConnection;
    }, [socket, roomId, iceServers, ensureTracksAreAdded]);

    const createOffer = useCallback(async (peerConnection: RTCPeerConnection, targetUserId: string) => {
        try {

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit('offer', {
                roomId,
                offer,
                targetUserId,
            });

        } catch (error) {
            console.error(`❌ Error creating offer for ${targetUserId}:`, error);
        }
    }, [socket, roomId]);

    const createAnswer = useCallback(async (peerConnection: RTCPeerConnection, offer: RTCSessionDescriptionInit, targetUserId: string) => {
        try {

            await peerConnection.setRemoteDescription(offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.emit('answer', {
                roomId,
                answer,
                targetUserId,
            });

        } catch (error) {
            console.error(`❌ Error creating answer for ${targetUserId}:`, error);
        }
    }, [socket, roomId]);

    // Handle position changes
    const handlePositionChange = useCallback((userId: string, position: { x: number; y: number }) => {

        setVideoPositions(prev => new Map(prev.set(userId, position)));
        socket.emit('video-position-change', {
            roomId,
            userId,
            position,
        });
    }, [socket, roomId]);

    // Event handlers defined outside useEffect to avoid circular dependencies
    const handleUserJoinedVideo = useCallback(({ userId, userName, position }: { userId: string; userName: string; position?: { x: number; y: number } }) => {

        if (userId !== currentUserId) {
            setRemoteVideoStates(prev => new Map(prev.set(userId, true)));
            setRemoteAudioStates(prev => new Map(prev.set(userId, true)));
            if (position) {
                setVideoPositions(prev => new Map(prev.set(userId, position)));
            }

            // Clear any existing remote stream for this user first
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.delete(userId);
                return newMap;
            });

            // Check if we already have a peer connection
            const existingPeer = peerConnectionsRef.current.get(userId);

            if (existingPeer) {

                const state = existingPeer.peerConnection.connectionState;


                // Always close and recreate connection for rejoining users to ensure clean state

                existingPeer.peerConnection.close();
                peerConnectionsRef.current.delete(userId);
                setPeerConnections(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    return newMap;
                });
            }

            // Create peer connection if we have local stream
            if (localStreamRef.current) {

                const peerConnection = createPeerConnection(userId, userName, true);
                setTimeout(() => {

                    createOffer(peerConnection, userId);
                }, 500);
            } else {

            }
        }
    }, [currentUserId, createPeerConnection, createOffer]); const handleExistingVideoUsers = useCallback((videoUsers: { userId: string; userName: string; position: { x: number; y: number } }[]) => {

        videoUsers.forEach(({ userId, userName, position }) => {
            if (userId !== currentUserId) {
                setRemoteVideoStates(prev => new Map(prev.set(userId, true)));
                setRemoteAudioStates(prev => new Map(prev.set(userId, true)));
                setVideoPositions(prev => new Map(prev.set(userId, position)));

                if (localStreamRef.current && !peerConnectionsRef.current.has(userId)) {
                    const peerConnection = createPeerConnection(userId, userName, true);
                    setTimeout(() => createOffer(peerConnection, userId), 700);
                }
            }
        });
    }, [currentUserId, createPeerConnection, createOffer]);

    const handleOffer = useCallback(async ({ offer, fromUserId, fromUserName }: { offer: RTCSessionDescriptionInit; fromUserId: string; fromUserName: string }) => {
        
        );

    const existingPeer = peerConnectionsRef.current.get(fromUserId);

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
            peerConnectionsRef.current.delete(fromUserId);
            setPeerConnections(prev => {
                const newMap = new Map(prev);
                newMap.delete(fromUserId);
                return newMap;
            });

            // Create fresh peer connection
            const peerConnection = createPeerConnection(fromUserId, fromUserName, false);
            setTimeout(() => {

                createAnswer(peerConnection, offer, fromUserId);
            }, 100);
        } catch (error) {
            console.error(`❌ Error handling offer for existing connection:`, error);
        }
    }
}, [createPeerConnection, createAnswer]); const handleAnswer = useCallback(async ({ answer, fromUserId }: { answer: RTCSessionDescriptionInit; fromUserId: string }) => {

    const peer = peerConnectionsRef.current.get(fromUserId);
    if (peer) {
        try {
            await peer.peerConnection.setRemoteDescription(answer);

        } catch (error) {
            console.error(`❌ Error processing answer:`, error);
        }
    }
}, []);

const handleIceCandidate = useCallback(async ({ candidate, fromUserId }: { candidate: RTCIceCandidate; fromUserId: string }) => {
    const peer = peerConnectionsRef.current.get(fromUserId);
    if (peer && peer.peerConnection.remoteDescription) {
        try {
            await peer.peerConnection.addIceCandidate(candidate);

        } catch (error) {
            console.error(`❌ Error adding ICE candidate:`, error);
        }
    } else {
        `);
        }
    }, []);

    const handleUserLeftVideo = useCallback(({ userId }: { userId: string }) => {
        
        const peer = peerConnectionsRef.current.get(userId);
        if (peer) {
            peer.peerConnection.close();
            peerConnectionsRef.current.delete(userId);
            setPeerConnections(prev => {
                const newMap = new Map(prev);
                newMap.delete(userId);
                return newMap;
            });
        }

        setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
        setRemoteVideoStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
        setRemoteAudioStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
        setVideoPositions(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
    }, []);

    const handleVideoPositionUpdate = useCallback(({ userId, position }) => {
        
        setVideoPositions(prev => new Map(prev.set(userId, position)));
    }, []);

    const handleVideoToggle = useCallback(({ userId, isVideoEnabled }) => {
        setRemoteVideoStates(prev => new Map(prev.set(userId, isVideoEnabled)));
    }, []);

    const handleAudioToggle = useCallback(({ userId, isAudioEnabled }) => {
        setRemoteAudioStates(prev => new Map(prev.set(userId, isAudioEnabled)));
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

        socket.on('video-position-update', handleVideoPositionUpdate);
        socket.on('video-toggle', handleVideoToggle);
        socket.on('audio-toggle', handleAudioToggle);

        return () => {
            socket.off('user-joined-video', handleUserJoinedVideo);
            socket.off('existing-video-users', handleExistingVideoUsers);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user-left-video', handleUserLeftVideo);
            socket.off('video-position-update', handleVideoPositionUpdate);
            socket.off('video-toggle', handleVideoToggle);
            socket.off('audio-toggle', handleAudioToggle);
        };
    }, [socket]); // Only depend on socket - handlers are stable with useCallback

    // Main video initialization effect - ONLY run when isVideoEnabled changes
    useEffect(() => {
        

        if (isVideoEnabled) {
            

            // Clean up any existing connections
            peerConnectionsRef.current.forEach(peer => peer.peerConnection.close());
            peerConnectionsRef.current.clear();
            setPeerConnections(new Map());
            setRemoteStreams(new Map());

            initializeMedia().then(stream => {
                if (stream) {
                    
                    ));
                    
                    

                    socket.emit('join-video', { roomId });
                    

                    // Also check for existing users in the room who might already have video enabled
                    setTimeout(() => {
                        
                        users.forEach(user => {
                            if (user.id !== currentUserId) {
                                `);
// This will trigger the backend to check if they have video enabled
socket.emit('check-video-user', { roomId, userId: user.id });
                            }
                        });
                    }, 1000);
                }
            });
        } else {

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach(peer => peer.peerConnection.close());
    peerConnectionsRef.current.clear();
    setPeerConnections(new Map());
    setRemoteStreams(new Map());
    setRemoteVideoStates(new Map());
    setRemoteAudioStates(new Map());
    setVideoPositions(new Map());

    socket.emit('leave-video', { roomId });
}

return () => {
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    peerConnectionsRef.current.forEach(peer => peer.peerConnection.close());
};
    }, [isVideoEnabled]); // Only depend on isVideoEnabled to prevent infinite renders

// Effect to handle new users joining when video is already enabled
useEffect(() => {
    if (isVideoEnabled && localStreamRef.current) {
        const currentUserIds = new Set(users.map(u => u.id));
        const existingConnectionIds = new Set(peerConnectionsRef.current.keys());

        // Find users who don't have peer connections yet
        users.forEach(user => {
            if (user.id !== currentUserId && !existingConnectionIds.has(user.id)) {
                    , checking for video`);
                    socket.emit('check-video-user', { roomId, userId: user.id });
                }
            });
        }
    }, [users.length, isVideoEnabled]); // Only depend on users.length to reduce re-renders

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
                videoTrack.enabled = !videoTrack.enabled;

                socket.emit('video-toggle', {
                    roomId,
                    isVideoEnabled: videoTrack.enabled,
                });
            }
        }
    };

    const handleCloseVideo = () => {
        onToggleVideo();
    };

    if (!isVideoEnabled) {
        return null;
    }

    // Only log once when streams or connections change
    if (peerConnections.size > 0) {
        
    }

    return (
        <>
            {/* Local video window */}
            {localStream && (
                <VideoWindow
                    userId={currentUserId}
                    userName="You"
                    stream={localStream}
                    isLocal={true}
                    onClose={handleCloseVideo}
                    isVideoEnabled={localStream.getVideoTracks()[0]?.enabled ?? true}
                    isAudioEnabled={isAudioEnabled}
                    onPositionChange={handlePositionChange}
                />
            )}

            {/* Remote video windows */}
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
                const user = users.find(u => u.id === userId);
                const isRemoteVideoEnabled = remoteVideoStates.get(userId) ?? true;
                const isRemoteAudioEnabled = remoteAudioStates.get(userId) ?? true;
                const position = videoPositions.get(userId);

                if (!user) return null;

                return (
                    <VideoWindow
                        key={userId}
                        userId={userId}
                        userName={user.name}
                        stream={stream}
                        isLocal={false}
                        isVideoEnabled={isRemoteVideoEnabled}
                        isAudioEnabled={isRemoteAudioEnabled}
                        position={position}
                        onPositionChange={handlePositionChange}
                    />
                );
            })}

            {/* Audio and End Call Controls - Bottom Middle */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4 bg-slate-800/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-2xl z-50">
                <button
                    onClick={toggleAudio}
                    className={`p - 4 rounded - full transition - colors ${
                    isAudioEnabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                } `}
                    title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
                >
                    {isAudioEnabled ? (
                        <Mic className="w-6 h-6 text-white" />
                    ) : (
                        <MicOff className="w-6 h-6 text-white" />
                    )}
                </button>

                <button
                    onClick={handleCloseVideo}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                    title="End Call"
                >
                    <X className="w-6 h-6 text-white" />
                </button>
            </div>
        </>
    );
};

export default VideoConference;
