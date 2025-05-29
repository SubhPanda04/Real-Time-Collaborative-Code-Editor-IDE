import React, { useEffect } from 'react'
import './App.css';
import io from "socket.io-client";
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Code2, Users, ArrowRight, Shield } from 'lucide-react';

const socket = io("https://real-time-collaborative-code-editor-ide.onrender.com");

const App = () => {

  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState('// Start code here');
  const [copySuccess, setCopySucess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [output, setOutput] = useState("");
  const [version, setVersion] = useState("*");
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode)
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      setOutput(response.run.output)
    })

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    }
    window.addEventListener("BeforeUnload", handleBeforeUnload);

    return () => {
      window.removeEventListener("BeforeUnload", handleBeforeUnload);
    }
  }, [])

  const joinRoom = (e) => {
    e.preventDefault();
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// Start code here");
    setLanguage("javascript");
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setCopySucess("Copied to Clipboard!");
    setTimeout(() => {
      setCopySucess("")
    }, 1000)
  };


  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });

  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version, input: input })
  }

  if (!joined) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      <div className="w-full h-150 max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl mb-6 shadow-lg">
            <Code2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">Join Code Room</h1>
          <p className="text-slate-400 text-base">Secure collaboration workspace</p>
        </div>

        <div className="bg-white/[0.08] backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-center mb-6">
            <div className="inline-flex items-center px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
              <Shield className="w-3 h-3 mr-1.5" />
              End-to-end encrypted
            </div>
          </div>

          <form onSubmit={joinRoom} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Room ID
              </label>
              <input
                type="text"
                placeholder="Enter room identifier"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/[0.05] backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-white/[0.08]"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Display Name
              </label>
              <input
                type="text"
                placeholder="Your display name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-3.5 bg-white/[0.05] backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 hover:bg-white/[0.08]"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 group shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Room
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </form>
        </div>
      </div>
    </div>

  }
  return <div className="flex h-screen bg-slate-950 text-white antialiased">
    <div className="w-80 bg-slate-900/90 backdrop-blur-sm border-r border-slate-800/50 flex flex-col shadow-2xl">
      <div className="p-6 border-b border-slate-800/30">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <h2 className="text-lg font-medium text-slate-100 tracking-tight">Code Room</h2>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4 border border-slate-700/50">
          <code className="text-emerald-400 text-sm font-mono">{roomId}</code>
        </div>
        <button
          onClick={copyRoomId}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
        >
          Copy Room ID
        </button>
        {copySuccess && <span className='text-emerald-400 text-large font-mono pl-13'>{copySuccess}</span>}
      </div>

      <div className="flex-1 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">Active Users</h3>
          {users.map((user, index) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-semibold" key={index}>
                    {user.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-medium" key={index}>{user.slice(0, 8)}</span>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/20 rounded-lg p-3 border border-slate-700/20">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce delay-200"></div>
          </div>
          <span>{typing}</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2 uppercase tracking-wider">Language</label>
          <select className="w-full bg-slate-800/50 border border-slate-700/50 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">Javascript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
      </div>

      <div className="p-6 border-t border-slate-800/30">
        <button className="w-full bg-slate-800/50 hover:bg-red-600/20 border border-slate-700/50 hover:border-red-500/50 text-slate-300 hover:text-red-400 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 backdrop-blur-sm"
          onClick={leaveRoom}
        >
          Leave Room
        </button>
      </div>
    </div>

    <div className="flex-1 bg-slate-950 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>
      <div className="relative z-10 h-full">
        <Editor
          height={"65%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme='vs-dark'
          options={{
            minimap: { enabled: false },
            fontSize: 20,
          }}
        />
        <div className="flex flex-col gap-4">
          <button
            onClick={runCode}
            className="absolute top-4 right-4 px-6 py-3 bg-slate-800/50 hover:bg-gradient-to-r hover:from-blue-600/20 hover:to-purple-600/20 border border-slate-700/50 hover:border-blue-500/50 text-slate-100 hover:text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            Execute
          </button>
          <div className="flex gap-4">
            <textarea
              className='w-1/2 h-60 bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm resize-none'
              placeholder='Enter Input here...'
              onChange={(e) => setInput(e.target.value)}
              value={input}
            ></textarea>
            <textarea
              value={output}
              placeholder="Output will appear here..."
              className="w-1/2 h-60 bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 backdrop-blur-sm resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
}

export default App;
