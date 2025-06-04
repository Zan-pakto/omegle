import { Socket } from "socket.io";
import http from "http";
import express from "express";
import { Server } from "socket.io";
import { UserManager } from "./managers/UserManager";
import { RoomManager } from "./managers/RoomManager";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const userManager = new UserManager();
const roomManager = new RoomManager();

io.on("connection", (socket: Socket) => {
  console.log("New socket connected:", socket.id);
  
  socket.on("register_user", (name: string) => {
    console.log("User registering:", name, "with socket:", socket.id);
    userManager.addUser(name, socket);
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    userManager.removeUser(socket.id);
  });
});

server.listen(3000, () => {
  console.log("listening on *:3000");
});
