import { Camera, Video, Users } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="w-full py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 shadow-xl backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Camera className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                StrangerMeet
              </h1>
              <span className="text-xs text-gray-400">Connect with strangers</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 hover:bg-gray-800 transition-all duration-300 cursor-pointer">
                <Video className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300 font-medium">
                  Video Chat
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 hover:bg-gray-800 transition-all duration-300 cursor-pointer">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300 font-medium">
                  Online Users
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
