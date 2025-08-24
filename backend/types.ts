export interface User {
    id: string;
    name: string;
    isVideoEnabled?: boolean;
    videoPosition?: { x: number; y: number };
}

export interface Room {
    users: Map<string, User>;
    code: string;
    output?: string;
    videoUsers: Map<string, {
        userId: string;
        userName: string;
        position: { x: number; y: number }
    }>;
}

export interface ServerToClientEvents {
    userJoined: (users: User[]) => void;
    codeUpdate: (code: string) => void;
    userTyping: (user: string) => void;
    languageUpdate: (language: string) => void;
    codeResponse: (data: any) => void;
    userIdAssigned: (userId: string) => void;
    'user-joined-video': (data: {
        userId: string;
        userName: string;
        position?: { x: number; y: number }
    }) => void;
    'existing-video-users': (users: {
        userId: string;
        userName: string;
        position: { x: number; y: number }
    }[]) => void;
    'user-left-video': (data: { userId: string }) => void;
    offer: (data: {
        offer: RTCSessionDescriptionInit;
        fromUserId: string;
        fromUserName: string
    }) => void;
    answer: (data: {
        answer: RTCSessionDescriptionInit;
        fromUserId: string
    }) => void;
    'ice-candidate': (data: {
        candidate: RTCIceCandidate;
        fromUserId: string
    }) => void;
    'video-toggle': (data: {
        userId: string;
        isVideoEnabled: boolean
    }) => void;
    'audio-toggle': (data: {
        userId: string;
        isAudioEnabled: boolean
    }) => void;
    'video-position-update': (data: {
        userId: string;
        position: { x: number; y: number }
    }) => void;
}

export interface ClientToServerEvents {
    join: (data: { roomId: string; userName: string }) => void;
    codeChange: (data: { roomId: string; code: string }) => void;
    leaveRoom: () => void;
    typing: (data: { roomId: string; userName: string }) => void;
    languageChange: (data: { roomId: string; language: string }) => void;
    compileCode: (data: {
        code: string;
        roomId: string;
        language: string;
        version: string;
        input: string
    }) => void;
    disconnect: () => void;
    'join-video': (data: { roomId: string }) => void;
    'leave-video': (data: { roomId: string }) => void;
    offer: (data: {
        roomId: string;
        offer: RTCSessionDescriptionInit;
        targetUserId: string
    }) => void;
    answer: (data: {
        roomId: string;
        answer: RTCSessionDescriptionInit;
        targetUserId: string
    }) => void;
    'ice-candidate': (data: {
        roomId: string;
        candidate: RTCIceCandidate;
        targetUserId: string
    }) => void;
    'video-toggle': (data: {
        roomId: string;
        isVideoEnabled: boolean
    }) => void;
    'audio-toggle': (data: {
        roomId: string;
        isAudioEnabled: boolean
    }) => void;
    'check-video-user': (data: {
        roomId: string;
        userId: string
    }) => void;
    'video-position-change': (data: {
        roomId: string;
        userId: string;
        position: { x: number; y: number }
    }) => void;
}
