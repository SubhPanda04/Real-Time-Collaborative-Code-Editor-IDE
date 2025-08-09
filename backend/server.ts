import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from "path";
import axios from 'axios';

interface User {
  id: string;
  name: string;
  isVideoEnabled?: boolean;
  videoPosition?: { x: number; y: number };
}

interface Room {
  users: Map<string, User>; // Changed from Set<string> to Map<string, User>
  code: string;
  output?: string;
  videoUsers: Map<string, { userId: string; userName: string; position: { x: number; y: number } }>;
}

const app: Express = express();
const server = http.createServer(app);

interface ServerToClientEvents {
  userJoined: (users: User[]) => void; // Changed from string[] to User[]
  codeUpdate: (code: string) => void;
  userTyping: (user: string) => void;
  languageUpdate: (language: string) => void;
  codeResponse: (data: any) => void;
  userIdAssigned: (userId: string) => void;
  // Video conference events
  'user-joined-video': (data: { userId: string; userName: string; position?: { x: number; y: number } }) => void;
  'existing-video-users': (users: { userId: string; userName: string; position: { x: number; y: number } }[]) => void;
  'user-left-video': (data: { userId: string }) => void;
  offer: (data: { offer: RTCSessionDescriptionInit; fromUserId: string; fromUserName: string }) => void;
  answer: (data: { answer: RTCSessionDescriptionInit; fromUserId: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidate; fromUserId: string }) => void;
  'video-toggle': (data: { userId: string; isVideoEnabled: boolean }) => void;
  'audio-toggle': (data: { userId: string; isAudioEnabled: boolean }) => void;
  'video-position-update': (data: { userId: string; position: { x: number; y: number } }) => void;
}

interface ClientToServerEvents {
  join: (data: { roomId: string; userName: string }) => void;
  codeChange: (data: { roomId: string; code: string }) => void;
  leaveRoom: () => void;
  typing: (data: { roomId: string; userName: string }) => void;
  languageChange: (data: { roomId: string; language: string }) => void;
  compileCode: (data: { code: string; roomId: string; language: string; version: string; input: string }) => void;
  disconnect: () => void;
  // Video conference events  
  'join-video': (data: { roomId: string }) => void;
  'leave-video': (data: { roomId: string }) => void;
  offer: (data: { roomId: string; offer: RTCSessionDescriptionInit; targetUserId: string }) => void;
  answer: (data: { roomId: string; answer: RTCSessionDescriptionInit; targetUserId: string }) => void;
  'ice-candidate': (data: { roomId: string; candidate: RTCIceCandidate; targetUserId: string }) => void;
  'video-toggle': (data: { roomId: string; isVideoEnabled: boolean }) => void;
  'audio-toggle': (data: { roomId: string; isAudioEnabled: boolean }) => void;
  'check-video-user': (data: { roomId: string; userId: string }) => void;
  'video-position-change': (data: { roomId: string; userId: string; position: { x: number; y: number } }) => void;
}

const url = process.env.VITE_SOCKET_URL;
const interval = 30000;

function reloadWebsite() {
  axios
    .get(url)
    .then((response) => {
      // Website reloaded successfully
    })
    .catch((error) => {
      console.error(`Error : ${error.message}`);
    });
}

setInterval(reloadWebsite, interval);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
  },
});

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
    socket.to(roomId).emit("video-toggle", {
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

  socket.on("video-position-change", ({ roomId, userId, position }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId)!;
      const videoUser = room.videoUsers.get(userId);

      if (videoUser) {
        videoUser.position = position;
        // Broadcast position update to all users in the room
        io.to(roomId).emit("video-position-update", { userId, position });
      }
    }
  });

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

const port = process.env.PORT || 5000;

// Use process.cwd() instead of path.resolve() to avoid __dirname conflicts
const rootDir = process.cwd();

app.use(express.static(path.join(rootDir, "/frontend/dist")));
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(rootDir, "frontend", "dist", "index.html"));
});

server.listen(port);