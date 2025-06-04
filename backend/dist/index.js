"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const UserManager_1 = require("./managers/UserManager");
const RoomManager_1 = require("./managers/RoomManager");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
const userManager = new UserManager_1.UserManager();
const roomManager = new RoomManager_1.RoomManager();
io.on("connection", (socket) => {
    console.log("New socket connected:", socket.id);
    // Wait for user to register with a name
    socket.on("register_user", (name) => {
        console.log("User registering:", name, "with socket:", socket.id);
        userManager.addUser(name, socket);
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        userManager.removeUser(socket.id);
    });
    // Handle errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});
// Handle server errors
server.on("error", (error) => {
    console.error("Server error:", error);
});
server.listen(3000, () => {
    console.log("listening on *:3000");
});
