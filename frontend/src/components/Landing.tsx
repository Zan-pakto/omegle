import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Room } from "./Room";
import Navbar from "./Navbar";
import { Manager } from "socket.io-client";
import { Camera, Mic, User, Video, ArrowRight } from "lucide-react";

const socket = new Manager("http://localhost:3000").socket("/");

export const Landing = () => {
  const [name, setName] = useState(() => {
    // Initialize name from localStorage if it exists
    return localStorage.getItem("userName") || "";
  });
  const [localAudioTrack, setLocalAudioTrack] =
    useState<MediaStreamTrack | null>(null);
  const [localVideoTrack, setlocalVideoTrack] =
    useState<MediaStreamTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [joined, setJoined] = useState(false);

  const getCam = async () => {
    try {
      const stream = await window.navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // MediaStream
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      setLocalAudioTrack(audioTrack);
      setlocalVideoTrack(videoTrack);
      if (!videoRef.current) {
        return;
      }
      videoRef.current.srcObject = new MediaStream([videoTrack]);
      videoRef.current.play();
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Please allow camera and microphone access to use this app.");
    }
  };

  useEffect(() => {
    if (videoRef && videoRef.current) {
      getCam();
    }
  }, [videoRef]);

  // Auto-join if name exists in localStorage
  useEffect(() => {
    const savedName = localStorage.getItem("userName");
    if (savedName) {
      handleJoin(savedName);
    }
  }, []);

  const handleJoin = (nameToUse?: string) => {
    const nameToJoin = nameToUse || name;
    if (!nameToJoin.trim()) {
      alert("Please enter your name");
      return;
    }
    // Save name to localStorage
    localStorage.setItem("userName", nameToJoin);
    // Register user with the socket server
    socket.emit("register_user", nameToJoin);
    setJoined(true);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700/50">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Start Video Chatting</h2>
                <p className="text-gray-400">Connect with people from around the world</p>
              </div>

              <div className="aspect-video w-full max-w-2xl mx-auto mb-8 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <video
                  autoPlay
                  ref={videoRef}
                  className="w-full h-full object-cover rounded-2xl shadow-lg ring-2 ring-gray-700/50 transition-all duration-300 group-hover:ring-blue-500/50"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-gray-700/50">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span>Preview</span>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-6">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border-2 border-gray-700/50 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all duration-300 text-white placeholder-gray-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => handleJoin()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center gap-3 font-medium group"
                >
                  <Video className="w-5 h-5" />
                  <span>Start Video Chat</span>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <span>Video Chat</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-blue-400" />
                    <span>Voice Chat</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span>Random Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Room
      name={name}
      localAudioTrack={localAudioTrack}
      localVideoTrack={localVideoTrack}
      socket={socket}
    />
  );
};
