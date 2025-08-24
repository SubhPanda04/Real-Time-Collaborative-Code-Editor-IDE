import { io, Socket } from 'socket.io-client';

export const createSocket = (): Socket => {
    const socket = io("http://localhost:5000", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', (err) => {
        console.error('Connection error:', err.message);
    });

    return socket;
};

export const socket = createSocket();
