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
        if (externalPosition) {
            return externalPosition;
        }
        // Calculate initial position to avoid overlap
        const windowIndex = parseInt(userId.slice(-2), 16) % 10; // Use last 2 chars of ID for positioning
        const baseX = 20;
        const baseY = 20;
        const spacing = 300; // Width of video window + margin
        const rowHeight = 220; // Height of video window + margin
        const windowsPerRow = Math.floor((window.innerWidth - 400) / spacing); // Account for sidebar

        const row = Math.floor(windowIndex / windowsPerRow);
        const col = windowIndex % windowsPerRow;

        return {
            x: baseX + (col * spacing),
            y: baseY + (row * rowHeight)
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

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Add event listeners to track video element state
            const videoElement = videoRef.current;

            const handleLoadedMetadata = () => {
                // Try to play the video manually if autoplay fails
                videoElement.play().catch(error => {
                    // Silently handle autoplay failure - common in browsers
                });
            };

            const handleError = (e: Event) => {
                console.error(`Video error for ${userName}:`, e);
            };

            const handleCanPlay = () => {
                // Ensure video plays when it's ready
                videoElement.play().catch(error => {
                    // Silently handle autoplay failure - common in browsers
                });
            };

            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.addEventListener('error', handleError);
            videoElement.addEventListener('canplay', handleCanPlay);

            return () => {
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                videoElement.removeEventListener('error', handleError);
                videoElement.removeEventListener('canplay', handleCanPlay);
            };
        }
    }, [stream, userName]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Allow dragging any video window by anyone in the room
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging) { // Allow moving any video window
            const newX = Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 210, e.clientY - dragOffset.y));

            const newPosition = { x: newX, y: newY };
            setPosition(newPosition);

            // Notify parent component about position change for synchronization
            if (onPositionChange) {
                onPositionChange(userId, newPosition);
            }
        }
    }, [isDragging, dragOffset, userId, onPositionChange, isLocal, userName]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []); useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div
            className={`fixed bg-slate-800 rounded-lg overflow-hidden shadow-2xl border-2 z-50 ${isDragging
                ? 'cursor-grabbing border-blue-400'
                : 'cursor-grab border-slate-600 hover:border-slate-500'
                }`}
            style={{
                left: position.x,
                top: position.y,
                width: '280px',
                height: '210px',
            }}
        >
            <div
                className="flex items-center justify-between p-3 bg-slate-700 cursor-move hover:bg-slate-600 transition-colors"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center space-x-2">
                    <Move className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-white truncate">
                        {isLocal ? 'You' : userName}
                    </span>
                    <span className="text-xs text-slate-400">(movable)</span>
                </div>
                <div className="flex items-center space-x-1">
                    {!isVideoEnabled && (
                        <VideoOff className="w-4 h-4 text-red-400" />
                    )}
                    {!isAudioEnabled && (
                        <MicOff className="w-4 h-4 text-red-400" />
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-600 rounded transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>
            <div className="relative h-40 bg-slate-900">
                {isVideoEnabled && stream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isLocal}
                        className="w-full h-full object-cover"
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

    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
        ],
    };

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
            return stream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            return null;
        }
    };    // Create peer connection
    const createPeerConnection = useCallback((userId: string, userName: string, isInitiator: boolean) => {
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
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    newMap.set(userId, remoteStream);
                    return newMap;
                });
            } else {
                console.error(`No remote stream in ontrack event for ${userName}`);
            }
        };

        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'failed') {
                // Connection failed - could retry or handle gracefully
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            if (peerConnection.iceConnectionState === 'failed') {
                // ICE connection failed - could attempt reconnection
            }
        };

        // Add local stream tracks if available
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current!);
            });
        }

        const newPeerConnection: PeerConnection = {
            id: userId,
            name: userName,
            peerConnection,
        };

        setPeerConnections(prev => {
            const newMap = new Map(prev);
            newMap.set(userId, newPeerConnection);
            return newMap;
        });

        return peerConnection;
    }, [socket, roomId, iceServers]);

    const createOffer = async (peerConnection: RTCPeerConnection, targetUserId: string) => {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.emit('offer', {
                roomId,
                offer,
                targetUserId,
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    const createAnswer = async (peerConnection: RTCPeerConnection, offer: RTCSessionDescriptionInit, targetUserId: string) => {
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
            console.error('Error creating answer:', error);
        }
    };

    // Disabled - problematic effect that tries to add tracks to existing connections
    // This was causing InvalidStateError when peer connections were closed
    /*
    useEffect(() => {
        if (localStream && peerConnections.size > 0) {
            peerConnections.forEach((peer, userId) => {
                // Check if peer connection is still open
                if (peer.peerConnection.connectionState === 'closed' ||
                    peer.peerConnection.signalingState === 'closed') {
                    return;
                }

                // Check if tracks are already added
                const senders = peer.peerConnection.getSenders();
                const hasVideoTrack = senders.some(sender => sender.track?.kind === 'video');
                const hasAudioTrack = senders.some(sender => sender.track?.kind === 'audio');

                if (!hasVideoTrack || !hasAudioTrack) {
                    // Add missing tracks
                    localStream.getTracks().forEach(track => {
                        const trackExists = senders.some(sender => sender.track === track);
                        if (!trackExists) {
                            try {
                                peer.peerConnection.addTrack(track, localStream);
                            } catch (error) {
                                console.error(`❌ Failed to add ${track.kind} track to ${peer.name}:`, error);
                            }
                        }
                    });

                    // Create new offer since we added tracks
                    createOffer(peer.peerConnection, userId);
                }
            });
        }
    }, [localStream]);
    */

    // Create peer connections for users who were detected before we had a local stream
    useEffect(() => {
        if (localStream && remoteVideoStates.size > 0) {
            remoteVideoStates.forEach((isVideoEnabled, userId) => {
                if (isVideoEnabled && !peerConnectionsRef.current.has(userId)) {
                    const user = users.find(u => u.id === userId);
                    if (user) {
                        setPeerConnections(prev => {
                            if (!prev.has(userId)) {
                                const peerConnection = createPeerConnection(userId, user.name, true);

                                // Create offer after peer connection is set up
                                setTimeout(() => {
                                    createOffer(peerConnection, userId);
                                }, 200);

                                return new Map(prev.set(userId, {
                                    id: userId,
                                    name: user.name,
                                    peerConnection
                                }));
                            }
                            return prev;
                        });
                    }
                }
            });
        }
    }, [localStream]);

    // Disabled - redundant effect since we now create offers directly in event handlers
    /*
    useEffect(() => {
        if (localStream) {
            const currentPeerConnections = peerConnectionsRef.current;
            currentPeerConnections.forEach((peer, userId) => {
                // Check if peer connection is still open
                if (peer.peerConnection.connectionState === 'closed' || 
                    peer.peerConnection.signalingState === 'closed') {
                    return;
                }

                const senders = peer.peerConnection.getSenders();
                if (senders.length === 0) {
                    // This is a new peer connection, add tracks
                    localStream.getTracks().forEach(track => {
                        try {
                            peer.peerConnection.addTrack(track, localStream);
                        } catch (error) {
                            console.error(`❌ Failed to add ${track.kind} track to new peer connection for ${peer.name}:`, error);
                        }
                    });

                    // Create offer for initiator
                    setTimeout(() => createOffer(peer.peerConnection, userId), 100);
                }
            });
        }
    }, [localStream]);
    */    // Handle position changes
    const handlePositionChange = useCallback((userId: string, position: { x: number; y: number }) => {
        // Update local position state for any user
        setVideoPositions(prev => new Map(prev.set(userId, position)));

        // Always broadcast position changes to other users when anyone moves any video window
        socket.emit('video-position-change', {
            roomId,
            userId, // Include the userId to specify which video window was moved
            position,
        });
    }, [socket, roomId]);

    // Socket event handlers
    useEffect(() => {
        const handleUserJoinedVideo = ({ userId, userName, position }: { userId: string; userName: string; position?: { x: number; y: number } }) => {
            if (userId !== currentUserId) {
                setRemoteVideoStates(prev => new Map(prev.set(userId, true)));
                setRemoteAudioStates(prev => new Map(prev.set(userId, true)));

                // Set initial position if provided
                if (position) {
                    setVideoPositions(prev => new Map(prev.set(userId, position)));
                }

                // Only create peer connection if we have a local stream
                if (localStreamRef.current) {
                    setPeerConnections(prev => {
                        if (!prev.has(userId)) {
                            const peerConnection = createPeerConnection(userId, userName, true);

                            // Wait longer before creating offer to ensure peer is ready
                            setTimeout(() => {
                                createOffer(peerConnection, userId);
                            }, 500);

                            return new Map(prev.set(userId, {
                                id: userId,
                                name: userName,
                                peerConnection
                            }));
                        }
                        return prev;
                    });
                }
            }
        }; const handleExistingVideoUsers = (videoUsers: { userId: string; userName: string; position: { x: number; y: number } }[]) => {
            videoUsers.forEach(({ userId, userName, position }) => {
                if (userId !== currentUserId) {
                    setRemoteVideoStates(prev => new Map(prev.set(userId, true)));
                    setRemoteAudioStates(prev => new Map(prev.set(userId, true)));
                    setVideoPositions(prev => new Map(prev.set(userId, position)));

                    // Only create peer connection if we have a local stream
                    if (localStreamRef.current) {
                        setPeerConnections(prev => {
                            if (!prev.has(userId)) {
                                const peerConnection = createPeerConnection(userId, userName, true);

                                // Wait longer before creating offer to ensure peer is ready
                                setTimeout(() => {
                                    createOffer(peerConnection, userId);
                                }, 500);

                                return new Map(prev.set(userId, {
                                    id: userId,
                                    name: userName,
                                    peerConnection
                                }));
                            }
                            return prev;
                        });
                    }
                }
            });
        };

        const handleOffer = async ({ offer, fromUserId, fromUserName }: { offer: RTCSessionDescriptionInit; fromUserId: string; fromUserName: string }) => {
            setPeerConnections(prev => {
                let peerConnection: RTCPeerConnection;

                if (!prev.has(fromUserId)) {
                    peerConnection = createPeerConnection(fromUserId, fromUserName, false);
                    const newMap = new Map(prev.set(fromUserId, {
                        id: fromUserId,
                        name: fromUserName,
                        peerConnection
                    }));

                    // Create answer after a small delay to ensure everything is set up
                    setTimeout(() => {
                        createAnswer(peerConnection, offer, fromUserId);
                    }, 100);
                    return newMap;
                } else {
                    const existingPeer = prev.get(fromUserId)!;
                    createAnswer(existingPeer.peerConnection, offer, fromUserId);
                    return prev;
                }
            });
        };

        socket.on('user-joined-video', handleUserJoinedVideo);
        socket.on('existing-video-users', handleExistingVideoUsers);
        socket.on('offer', handleOffer);

        socket.on('video-position-update', ({ userId, position }) => {
            setVideoPositions(prev => new Map(prev.set(userId, position)));
        });

        socket.on('answer', async ({ answer, fromUserId }) => {
            setPeerConnections(prev => {
                const peer = prev.get(fromUserId);
                if (peer) {
                    peer.peerConnection.setRemoteDescription(answer).catch(error => {
                        console.error('Error setting remote description for answer:', error);
                    });
                } else {
                    console.error(`No peer connection found for answer from ${fromUserId}`);
                }
                return prev;
            });
        });

        socket.on('ice-candidate', async ({ candidate, fromUserId }) => {
            setPeerConnections(prev => {
                const peer = prev.get(fromUserId);
                if (peer) {
                    peer.peerConnection.addIceCandidate(candidate).catch(error => {
                        console.error('Error adding ICE candidate:', error);
                    });
                } else {
                    console.error(`No peer connection found for ICE candidate from ${fromUserId}`);
                }
                return prev;
            });
        });

        socket.on('user-left-video', ({ userId }) => {
            setPeerConnections(prev => {
                const peer = prev.get(userId);
                if (peer) {
                    peer.peerConnection.close();
                    const newMap = new Map(prev);
                    newMap.delete(userId);
                    return newMap;
                }
                return prev;
            });

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
        });

        socket.on('video-toggle', ({ userId, isVideoEnabled: videoEnabled }) => {
            setRemoteVideoStates(prev => new Map(prev.set(userId, videoEnabled)));
        });

        socket.on('audio-toggle', ({ userId, isAudioEnabled: audioEnabled }) => {
            setRemoteAudioStates(prev => new Map(prev.set(userId, audioEnabled)));
        });

        return () => {
            socket.off('user-joined-video', handleUserJoinedVideo);
            socket.off('existing-video-users', handleExistingVideoUsers);
            socket.off('offer', handleOffer);
            socket.off('video-position-update');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('user-left-video');
            socket.off('video-toggle');
            socket.off('audio-toggle');
        };
    }, [socket, currentUserId, createPeerConnection]);

    // Handle when new users join the room while video is enabled
    useEffect(() => {
        if (isVideoEnabled && localStream) {
            // Check if any new users have joined and need video connections
            users.forEach(user => {
                if (user.id !== currentUserId && !peerConnectionsRef.current.has(user.id)) {
                    // Check if this user has video enabled
                    socket.emit('check-video-user', { roomId, userId: user.id });
                }
            });
        }
    }, [users, isVideoEnabled, localStream, currentUserId, roomId, socket]);

    // Initialize video conference
    useEffect(() => {
        if (isVideoEnabled) {
            // First, ensure we clean up any existing connections
            peerConnectionsRef.current.forEach(peer => peer.peerConnection.close());
            setPeerConnections(new Map());
            setRemoteStreams(new Map());

            initializeMedia().then(stream => {
                if (stream) {
                    // Emit join-video after local stream is ready
                    socket.emit('join-video', { roomId });

                    // Wait for the server to process the join-video event
                    setTimeout(() => {
                        // Check for existing video users
                        users.forEach(user => {
                            if (user.id !== currentUserId) {
                                socket.emit('check-video-user', { roomId, userId: user.id });
                            }
                        });
                    }, 1000); // Increased delay to ensure server processing
                } else {
                    console.error('Failed to obtain local media stream');
                }
            });
        } else {
            // Stop local stream
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }

            // Close all peer connections
            peerConnectionsRef.current.forEach(peer => peer.peerConnection.close());
            setPeerConnections(new Map());
            setRemoteStreams(new Map());
            setRemoteVideoStates(new Map());
            setRemoteAudioStates(new Map());
            setVideoPositions(new Map());

            socket.emit('leave-video', { roomId });
        }

        return () => {
            const currentLocalStream = localStreamRef.current;
            const currentPeerConnections = peerConnectionsRef.current;

            if (currentLocalStream) {
                currentLocalStream.getTracks().forEach(track => track.stop());
            }
            currentPeerConnections.forEach(peer => peer.peerConnection.close());
        };
    }, [isVideoEnabled, roomId, socket]); const toggleAudio = () => {
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

    const handleVideoToggle = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                const newVideoState = !videoTrack.enabled;
                videoTrack.enabled = newVideoState;

                socket.emit('video-toggle', {
                    roomId,
                    isVideoEnabled: newVideoState,
                });
            }
        }

        if (!isVideoEnabled) {
            // If turning video on, make sure we have a stream
            initializeMedia().then(stream => {
                if (stream) {
                    setLocalStream(stream);
                }
            });
        }

        onToggleVideo();
    };

    const handleCloseVideo = () => {
        onToggleVideo();
    };

    if (!isVideoEnabled) {
        return null;
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

                return (
                    <VideoWindow
                        key={userId}
                        userId={userId}
                        userName={user?.name || 'Unknown'}
                        stream={stream}
                        isVideoEnabled={isRemoteVideoEnabled}
                        isAudioEnabled={isRemoteAudioEnabled}
                        position={position}
                        onPositionChange={handlePositionChange}
                    />
                );
            })}            {/* Video controls */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-slate-800/90 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-600 z-50">
                <button
                    onClick={handleVideoToggle}
                    className={`p-3 rounded-full transition-all duration-200 ${isVideoEnabled
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                >
                    {isVideoEnabled ? (
                        <Video className="w-5 h-5" />
                    ) : (
                        <VideoOff className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all duration-200 ${isAudioEnabled
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                >
                    {isAudioEnabled ? (
                        <Mic className="w-5 h-5" />
                    ) : (
                        <MicOff className="w-5 h-5" />
                    )}
                </button>
            </div>
        </>
    );
};

export default VideoConference;
