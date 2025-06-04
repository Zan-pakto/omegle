import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "./Navbar";
import { Camera, Mic, Video, Volume2, VolumeX, VideoOff, RefreshCw, LogOut } from "lucide-react";

declare global {
  interface Window {
    pcr?: RTCPeerConnection;
  }
}

interface RoomCreatedData {
  roomId: string;
  partnerName: string;
}

interface Socket {
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

export const Room = ({
  name,
  localAudioTrack,
  localVideoTrack,
  socket,
}: {
  name: string;
  localAudioTrack: MediaStreamTrack | null;
  localVideoTrack: MediaStreamTrack | null;
  socket: Socket;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lobby, setLobby] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [sendingPc, setSendingPc] = useState<null | RTCPeerConnection>(null);
  const [receivingPc, setReceivingPc] = useState<null | RTCPeerConnection>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteMediaStream, setRemoteMediaStream] = useState<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    socket.on("room_created", ({ roomId, partnerName }: RoomCreatedData) => {
      console.log("Room created:", roomId, "with partner:", partnerName);
      setRoomId(roomId);
      setPartnerName(partnerName);
      setLobby(false);
    });

    socket.on("send-offer", async ({ roomId }: { roomId: string }) => {
      console.log("sending offer");
      setLobby(false);
      setRoomId(roomId);
      const pc = new RTCPeerConnection();
      setSendingPc(pc);

      if (localVideoTrack) pc.addTrack(localVideoTrack);
      if (localAudioTrack) pc.addTrack(localAudioTrack);

      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: e.candidate,
            type: "sender",
            roomId,
          });
        }
      };

      pc.onnegotiationneeded = async () => {
        const sdp = await pc.createOffer();
        pc.setLocalDescription(sdp);
        socket.emit("offer", {
          sdp,
          roomId,
        });
      };
    });

    socket.on(
      "offer",
      async ({
        roomId,
        sdp: remoteSdp,
      }: {
        roomId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        console.log("received offer");
        setLobby(false);
        const pc = new RTCPeerConnection();
        pc.setRemoteDescription(remoteSdp);
        const sdp = await pc.createAnswer();
        pc.setLocalDescription(sdp);

        const stream = new MediaStream();
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }

        setRemoteMediaStream(stream);
        setReceivingPc(pc);
        window.pcr = pc;

        pc.ontrack = (e) => {
          console.log("ontrack triggered");
        };

        pc.onicecandidate = async (e) => {
          if (e.candidate) {
            socket.emit("add-ice-candidate", {
              candidate: e.candidate,
              type: "receiver",
              roomId,
            });
          }
        };

        socket.emit("answer", {
          roomId,
          sdp: sdp,
        });

        setTimeout(() => {
          const track1 = pc.getTransceivers()[0].receiver.track;
          const track2 = pc.getTransceivers()[1].receiver.track;
          if (track1.kind === "video") {
            setRemoteAudioTrack(track2);
            setRemoteVideoTrack(track1);
          } else {
            setRemoteAudioTrack(track1);
            setRemoteVideoTrack(track2);
          }

          if (remoteVideoRef.current?.srcObject instanceof MediaStream) {
            remoteVideoRef.current.srcObject.addTrack(track1);
            remoteVideoRef.current.srcObject.addTrack(track2);
            remoteVideoRef.current.play();
          }
        }, 5000);
      }
    );

    socket.on(
      "answer",
      ({
        roomId,
        sdp: remoteSdp,
      }: {
        roomId: string;
        sdp: RTCSessionDescriptionInit;
      }) => {
        setLobby(false);
        setSendingPc((pc) => {
          pc?.setRemoteDescription(remoteSdp);
          return pc;
        });
      }
    );

    socket.on("lobby", () => {
      setLobby(true);
    });

    socket.on("partner_disconnected", () => {
      setLobby(true);
      setRoomId(null);
      setPartnerName(null);
      window.location.reload();
    });

    socket.on(
      "add-ice-candidate",
      ({
        candidate,
        type,
        roomId,
      }: {
        candidate: RTCIceCandidateInit;
        type: "sender" | "receiver";
        roomId: string;
      }) => {
        if (type === "sender") {
          setReceivingPc((pc) => {
            pc?.addIceCandidate(candidate);
            return pc;
          });
        } else {
          setSendingPc((pc) => {
            pc?.addIceCandidate(candidate);
            return pc;
          });
        }
      }
    );

    const handleUnload = () => {
      localStorage.removeItem("userName");
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      socket.off("room_created");
      socket.off("send-offer");
      socket.off("offer");
      socket.off("answer");
      socket.off("lobby");
      socket.off("partner_disconnected");
      socket.off("add-ice-candidate");
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [socket, localVideoTrack, localAudioTrack]);

  useEffect(() => {
    if (localVideoRef.current && localVideoTrack) {
      localVideoRef.current.srcObject = new MediaStream([localVideoTrack]);
      localVideoRef.current.play();
    }
  }, [localVideoTrack]);

  const toggleAudio = () => {
    if (localAudioTrack) {
      const newState = !localAudioTrack.enabled;
      localAudioTrack.enabled = newState;
      setIsAudioEnabled(newState);
      console.log("Audio track enabled:", newState);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      const newState = !localVideoTrack.enabled;
      localVideoTrack.enabled = newState;
      setIsVideoEnabled(newState);
      console.log("Video track enabled:", newState);
    }
  };

  const handleNext = () => {
    // Disconnect from current room
    if (sendingPc) {
      sendingPc.close();
    }
    if (receivingPc) {
      receivingPc.close();
    }
    // Reset states
    setSendingPc(null);
    setReceivingPc(null);
    setRemoteVideoTrack(null);
    setRemoteAudioTrack(null);
    setRemoteMediaStream(null);
    setRoomId(null);
    setPartnerName(null);
    // Emit event to server to remove from current room
    if (roomId) {
      socket.emit("leave_room", { roomId });
    }
    // Reload page to get new connection
    window.location.reload();
  };

  const handleEndChat = () => {
    // Clean up connections
    if (sendingPc) {
      sendingPc.close();
    }
    if (receivingPc) {
      receivingPc.close();
    }
    // Stop all tracks
    if (localVideoTrack) {
      localVideoTrack.stop();
    }
    if (localAudioTrack) {
      localAudioTrack.stop();
    }
    // Clear localStorage
    localStorage.removeItem("userName");
    // Reload page to go back to landing
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-800">
            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Local Video */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <video
                  autoPlay
                  ref={localVideoRef}
                  className="w-full aspect-video object-cover rounded-2xl shadow-lg ring-2 ring-gray-800 transition-all duration-300 group-hover:ring-blue-500/50"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-gray-800">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <Mic className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">You</span>
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="p-2 bg-black/90 backdrop-blur-sm rounded-lg border border-gray-800">
                    <Camera className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="p-2 bg-black/90 backdrop-blur-sm rounded-lg border border-gray-800">
                    <Mic className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Remote Video */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <video
                  autoPlay
                  ref={remoteVideoRef}
                  className="w-full aspect-video object-cover rounded-2xl shadow-lg ring-2 ring-gray-800 transition-all duration-300 group-hover:ring-blue-500/50"
                  style={{ transform: "scaleX(-1)" }}
                />
                {partnerName && (
                  <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 border border-gray-800">
                    <Camera className="w-4 h-4 text-blue-400" />
                    <Mic className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">{partnerName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            <div className="mt-8 text-center">
              {lobby ? (
                <div className="text-gray-400">
                  <div className="animate-pulse flex items-center justify-center gap-3">
                    <div className="p-2 bg-gray-900 rounded-full">
                      <Camera className="w-6 h-6 text-blue-400 animate-bounce" />
                    </div>
                    <span className="text-lg font-medium">Waiting to connect you to someone...</span>
                  </div>
                </div>
              ) : (
                <div className="text-green-400 font-medium flex items-center justify-center gap-3">
                  <div className="p-2 bg-gray-900 rounded-full">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-lg">Connected with: {partnerName}</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={toggleVideo}
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center gap-3 text-white border border-gray-800 group"
              >
                {isVideoEnabled ? (
                  <>
                    <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                      <Video className="w-5 h-5 text-blue-400" />
                    </div>
                    <span>Video On</span>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                      <VideoOff className="w-5 h-5 text-red-400" />
                    </div>
                    <span>Video Off</span>
                  </>
                )}
              </button>
              <button
                onClick={toggleAudio}
                className="px-6 py-3 bg-gray-900 hover:bg-gray-800 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center gap-3 text-white border border-gray-800 group"
              >
                {isAudioEnabled ? (
                  <>
                    <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                      <Volume2 className="w-5 h-5 text-blue-400" />
                    </div>
                    <span>Audio On</span>
                  </>
                ) : (
                  <>
                    <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-gray-700 transition-colors">
                      <VolumeX className="w-5 h-5 text-red-400" />
                    </div>
                    <span>Audio Off</span>
                  </>
                )}
              </button>
              {!lobby && (
                <button
                  onClick={handleNext}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 flex items-center gap-3 border border-blue-500/50 group"
                >
                  <div className="p-2 bg-black/20 rounded-lg group-hover:bg-black/30 transition-colors">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <span>Next</span>
                </button>
              )}
              <button
                onClick={handleEndChat}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400/50 flex items-center gap-3 border border-red-500/50 group"
              >
                <div className="p-2 bg-black/20 rounded-lg group-hover:bg-black/30 transition-colors">
                  <LogOut className="w-5 h-5" />
                </div>
                <span>End Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
