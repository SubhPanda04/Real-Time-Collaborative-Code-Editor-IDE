import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from "path";
import axios from 'axios';
import { throttle } from './utils';
import { User, Room, ServerToClientEvents, ClientToServerEvents } from './types';

const app: Express = express();
const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 30000,
  maxHttpBufferSize: 1e6
});

const port = process.env.PORT || 5000;
const serverUrl = `http://localhost:${port}`;
const interval = 30000;
let isServerReady = false;

function pingServer() {
  if (!serverUrl || !isServerReady) {
    return;
  }

  axios
    .get(`${serverUrl}/health`)
    .catch((error) => {
      console.error(`Health check failed: ${error.message}`);
    });
}

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  let currentRoom: string | null = null;
  let currentUser: string | null = null;

  socket.on('join', ({ roomId, userName }) => {
    if (currentRoom && currentUser) {
      socket.leave(currentRoom);
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        io.to(currentRoom).emit('userJoined', Array.from(room.users.values()));
      }
    }

    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map<string, User>(),
        code: "// Start Code here",
        videoUsers: new Map()
      });
    }

    const room = rooms.get(roomId)!;
    const user: User = {
      id: socket.id,
      name: userName
    };

    room.users.set(socket.id, user);

    socket.emit("codeUpdate", room.code);
    socket.emit("userIdAssigned", socket.id);

    io.to(roomId).emit('userJoined', Array.from(room.users.values()));
  });

  socket.on('codeChange', ({ roomId, code }) => {
    if (rooms.has(roomId)) {
      rooms.get(roomId)!.code = code;
    }
    socket.to(roomId).emit('codeUpdate', code);
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        room.videoUsers.delete(socket.id);
        io.to(currentRoom).emit('userJoined', Array.from(room.users.values()));
        io.to(currentRoom).emit('user-left-video', { userId: socket.id });
      }

      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on("typing", ({ roomId, userName }) => {
    io.to(roomId).emit("userTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("compileCode", async ({ code, roomId, language, version, input }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      try {
        const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
          language,
          version,
          files: [
            {
              content: code
            }
          ],
          stdin: input,
        });

        room.output = response.data.run.output;
        io.to(roomId).emit("codeResponse", response.data);
      } catch (error) {
        console.error("Code execution error:", error);
        io.to(roomId).emit("codeResponse", {
          run: {
            output: "Error executing code"
          }
        });
      }
    }
  });

  // Video conference event handlers
  socket.on("join-video", ({ roomId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      const user = room.users.get(socket.id);

      if (user) {
        const position = { x: 20, y: 20 }; // Default position
        room.videoUsers.set(socket.id, {
          userId: socket.id,
          userName: user.name,
          position
        });

        // Notify others that this user joined video
        socket.to(roomId).emit("user-joined-video", {
          userId: socket.id,
          userName: user.name,
          position
        });

        // Send existing video users to the new participant
        const existingVideoUsers = Array.from(room.videoUsers.values()).filter(
          videoUser => videoUser.userId !== socket.id
        );
        if (existingVideoUsers.length > 0) {
          socket.emit("existing-video-users", existingVideoUsers);
        }
      }
    }
  });

  socket.on("leave-video", ({ roomId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      room.videoUsers.delete(socket.id);

      socket.to(roomId).emit("user-left-video", { userId: socket.id });
    }
  });

  socket.on("offer", ({ roomId, offer, targetUserId }) => {
    const room = rooms.get(roomId);
    const user = room?.users.get(socket.id);

    io.to(targetUserId).emit("offer", {
      offer,
      fromUserId: socket.id,
      fromUserName: user?.name || "Unknown"
    });
  });

  socket.on("answer", ({ roomId, answer, targetUserId }) => {
    io.to(targetUserId).emit("answer", {
      answer,
      fromUserId: socket.id
    });
  });

  socket.on("ice-candidate", ({ roomId, candidate, targetUserId }) => {
    io.to(targetUserId).emit("ice-candidate", {
      candidate,
      fromUserId: socket.id
    });
  });

  socket.on("video-toggle", ({ roomId, isVideoEnabled }) => {
    console.log(`User ${socket.id} toggled video: ${isVideoEnabled}`);
    // Broadcast to all users in the room including the sender
    io.to(roomId).emit("video-toggle", {
      userId: socket.id,
      isVideoEnabled
    });
  });

  socket.on("audio-toggle", ({ roomId, isAudioEnabled }) => {
    socket.to(roomId).emit("audio-toggle", {
      userId: socket.id,
      isAudioEnabled
    });
  });

  socket.on("check-video-user", ({ roomId, userId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      const videoUser = room.videoUsers.get(userId);

      if (videoUser) {
        socket.emit("user-joined-video", {
          userId: videoUser.userId,
          userName: videoUser.userName,
          position: videoUser.position
        });
      }
    }
  });

  // Throttle position updates to reduce network traffic
  const throttledPositionChange = throttle(({ roomId, userId, position }: {
    roomId: string;
    userId: string;
    position: { x: number; y: number }
  }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      const videoUser = room.videoUsers.get(userId);

      if (videoUser) {
        videoUser.position = position;
        io.to(roomId).emit("video-position-update", { userId, position });
      }
    }
  }, 50);

  socket.on("video-position-change", throttledPositionChange);

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        room.videoUsers.delete(socket.id);
        io.to(currentRoom).emit('userJoined', Array.from(room.users.values()));
        io.to(currentRoom).emit('user-left-video', { userId: socket.id });
      }
    }
  });
});

const rootDir = process.cwd();

app.get('/health', (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(rootDir, "/frontend/dist")));
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(rootDir, "frontend", "dist", "index.html"));
});

let pingInterval: NodeJS.Timeout | null = null;

server.listen(port, () => {
  isServerReady = true;
  pingInterval = setInterval(pingServer, interval);
});