# 👨‍💻 Real-Time Collaborative Code Editor IDE

A full-stack real-time collaborative code editor with integrated video conferencing capabilities, built with ReactJS, TypeScript, ExpressJS, and Socket.IO. This project enables multiple users to write, edit, and compile code together in real-time with features like language switching, typing indicators, video calls, and a live compiler that accepts standard input.

# 🌐 Demo

https://github.com/user-attachments/assets/581e920f-ce45-4bb5-9ba9-e02e81cea6ce

# 🧰 Tech Stack

## Frontend

- **ReactJS 19.1.0 with TypeScript**
- **Vite** for fast development and building
- **TailwindCSS 4.1.8** for styling
- **Monaco Editor** for advanced code editing with syntax highlighting
- **Socket.IO Client** for real-time communication
- **WebRTC** for peer-to-peer video conferencing
- **Lucide React** for modern icons

## Backend

- **Node.js with ExpressJS**
- **TypeScript** with ts-node for development
- **Socket.IO (Server-side)** for real-time communication
- **Piston API** for code compilation and execution
- **WebRTC signaling** for video conference coordination

# 🚀 Features

**✅ Real-time Collaborative Editing**
- Live code synchronization across all connected users
- Real-time typing indicators showing who's currently editing
- Monaco Editor integration with advanced syntax highlighting
- Code formatting and IntelliSense support

**✅ Multi-language Programming Support**
- Support for multiple programming languages (C++, Python, JavaScript, Java, etc.)
- Easy language switching with syntax highlighting adaptation
- Language-specific code execution environments

**✅ Live Code Compilation & Execution**
- Runtime input support for interactive programs
- Real-time compilation and execution results
- Error handling and output display
- Support for standard input/output operations

**✅ Integrated Video Conferencing**
- WebRTC-based peer-to-peer video calls
- Video enable/disable functionality
- Audio mute/unmute controls
- Draggable and resizable video windows
- Multi-user video support within coding sessions

**✅ Room-based Collaboration**
- Unique room IDs for private collaboration sessions
- Join/Leave room functionality
- User presence indicators
- Real-time user list with video status

**✅ Modern UI/UX**
- Responsive design with TailwindCSS
- Dark/Light theme support
- Intuitive interface with modern icons
- Smooth animations and transitions

**✅ Development & Deployment Ready**
- TypeScript for type safety
- ESLint configuration for code quality
- Vite for fast development server and optimized builds
- Modular component architecture

# 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git** for cloning the repository

# 🛠️ Installation & Setup

## 1. Clone the Repository
```bash
git clone https://github.com/SubhPanda04/Real-Time-Collaborative-Code-Editor-IDE.git
cd Real-Time-Collaborative-Code-Editor-IDE
```

## 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## 3. Development Setup
```bash
# Start the development server (runs both backend and frontend)
npm run dev
```

This will:
- Start the backend server on `http://localhost:3000`
- Start the frontend development server on `http://localhost:5173`
- Enable hot reloading for both frontend and backend

## 4. Building for Production
```bash
# Build the entire application
npm run build
```

This will:
- Install all dependencies
- Compile TypeScript to JavaScript
- Build the frontend for production
- Prepare the application for deployment

# 🎯 Usage

## Getting Started
1. Open your browser and navigate to `http://localhost:5173`
2. Enter your name and create or join a room with a unique Room ID
3. Start coding collaboratively with others in real-time!

## Key Features Usage

### Collaborative Editing
- Share your Room ID with collaborators
- See real-time changes as others type
- View typing indicators to see who's actively editing

### Video Conferencing
- Click the video button to enable/disable your camera
- Use the microphone button to mute/unmute audio
- Drag video windows to reposition them
- Video calls work peer-to-peer between room participants

### Code Compilation
- Select your programming language from the dropdown
- Write your code in the Monaco editor
- Provide input if your program requires it
- Click "Run Code" to compile and execute
- View output and error messages in real-time

### Language Support
- Switch between different programming languages
- Syntax highlighting adapts automatically
- Support for popular languages like Python, JavaScript, C++, Java, and more

# 📁 Project Structure

```
Real-Time-Collaborative-Code-Editor-IDE/
├── backend/
│   └── server.ts           # Express server with Socket.IO
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── VideoConference.tsx  # WebRTC video component
│   │   ├── types/
│   │   │   └── webrtc.d.tsx        # WebRTC type definitions
│   │   ├── App.tsx         # Main application component
│   │   └── main.tsx        # React entry point
│   ├── public/
│   ├── package.json
│   └── vite.config.ts      # Vite configuration
├── package.json            # Backend dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md
```

# 🚀 Available Scripts

## Backend Scripts
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build the entire application for production

## Frontend Scripts (run from `/frontend` directory)
- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality




