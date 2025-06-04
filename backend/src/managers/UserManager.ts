import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
  socket: Socket;
  name: string;
}

export class UserManager {
  private users: User[];
  private queue: string[];
  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.queue = [];
    this.roomManager = new RoomManager();
  }

  addUser(name: string, socket: Socket) {
    const existingUser = this.users.find(u => u.socket.id === socket.id);
    if (existingUser) return;

    if (this.roomManager.isUserInRoom(socket.id)) return;

    this.users.push({ name, socket });
    this.queue.push(socket.id);
    
    socket.emit("lobby");
    this.clearQueue();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    const user = this.users.find((x) => x.socket.id === socketId);
    if (!user) return;

    const wasInRoom = this.roomManager.isUserInRoom(socketId);
    const { remainingUser } = this.roomManager.removeUserFromRooms(socketId);

    this.users = this.users.filter((x) => x.socket.id !== socketId);
    this.queue = this.queue.filter((x) => x !== socketId);

    if (wasInRoom && this.users.some(u => u.socket.id === socketId)) {
      this.queue.push(socketId);
      this.clearQueue();
    }
  }

  clearQueue() {
    if (this.queue.length < 2) return;

    const id1 = this.queue.pop();
    const id2 = this.queue.pop();
    
    const user1 = this.users.find((x) => x.socket.id === id1);
    const user2 = this.users.find((x) => x.socket.id === id2);

    if (!user1 || !user2) {
      if (user1) this.queue.push(id1!);
      if (user2) this.queue.push(id2!);
      return;
    }

    if (this.roomManager.isUserInRoom(user1.socket.id) || this.roomManager.isUserInRoom(user2.socket.id)) {
      this.queue.push(id1!, id2!);
      return;
    }

    const roomId = this.roomManager.createRoom(user1, user2);
    
    if (!roomId) {
      this.queue.push(id1!, id2!);
    }
  }

  initHandlers(socket: Socket) {
    socket.on("offer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("answer", ({ sdp, roomId }: { sdp: string; roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
      this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
    });
  }
}
