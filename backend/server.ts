import express, { Express } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import path from "path";
import axios from 'axios';

interface User {
  id: string;
  name: string;
}

interface Room {
  users: Map<string, User>; // Changed from Set<string> to Map<string, User>
  code: string;
  output?: string;
}

const app: Express = express();
const server = http.createServer(app);

interface ServerToClientEvents {
  userJoined: (users: User[]) => void; // Changed from string[] to User[]
  codeUpdate: (code: string) => void;
  userTyping: (user: string) => void;
  languageUpdate: (language: string) => void;
  codeResponse: (data: any) => void;
}

interface ClientToServerEvents {
  join: (data: { roomId: string; userName: string }) => void;
  codeChange: (data: { roomId: string; code: string }) => void;
  leaveRoom: () => void;
  typing: (data: { roomId: string; userName: string }) => void;
  languageChange: (data: { roomId: string; language: string }) => void;
  compileCode: (data: { code: string; roomId: string; language: string; version: string; input: string }) => void;
  disconnect: () => void;
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
  },
});

const rooms = new Map<string, Room>();

io.on('connection', (socket) => {
  console.log('User Connected', socket.id);

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
        code: "// Start Code here"
      });
    }

    const room = rooms.get(roomId)!;
    const user: User = {
      id: socket.id,
      name: userName
    };
    
    room.users.set(socket.id, user);

    socket.emit("codeUpdate", room.code);

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
        io.to(currentRoom).emit('userJoined', Array.from(room.users.values()));
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

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        io.to(currentRoom).emit('userJoined', Array.from(room.users.values()));
      }
    }
    console.log("User Disconnected");
  });
});

const port = process.env.PORT || 5000;

const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "/frontend/dist")));
app.get('*', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});