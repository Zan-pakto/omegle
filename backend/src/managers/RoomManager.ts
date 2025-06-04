import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User;
  user2: User;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, Room>;
  private userToRoom: Map<string, string>;

  constructor() {
    this.rooms = new Map<string, Room>();
    this.userToRoom = new Map<string, string>();
  }

  isUserInRoom(socketId: string): boolean {
    return this.userToRoom.has(socketId);
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generate().toString();

    this.rooms.set(roomId, {
      user1,
      user2,
      createdAt: Date.now(),
    });

    this.userToRoom.set(user1.socket.id, roomId);
    this.userToRoom.set(user2.socket.id, roomId);

    const storedRoom = this.rooms.get(roomId);
    if (!storedRoom) return null;

    user1.socket.emit("room_created", {
      roomId,
      partnerName: user2.name,
    });

    user2.socket.emit("room_created", {
      roomId,
      partnerName: user1.name,
    });

    user1.socket.emit("send-offer", { roomId });
    user2.socket.emit("send-offer", { roomId });

    return roomId;
  }

  onOffer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser?.socket.emit("offer", { sdp, roomId });
  }

  onAnswer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser?.socket.emit("answer", { sdp, roomId });
  }

  onIceCandidates(roomId: string, senderSocketid: string, candidate: any, type: "sender" | "receiver") {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser.socket.emit("add-ice-candidate", { candidate, type });
  }

  removeUserFromRooms(socketId: string): { roomId?: string; remainingUser?: User } {
    const roomId = this.userToRoom.get(socketId);
    if (!roomId) return {};

    const room = this.rooms.get(roomId);
    if (!room) return {};

    let remainingUser: User | undefined;

    if (room.user1.socket.id === socketId) {
      remainingUser = room.user2;
    } else if (room.user2.socket.id === socketId) {
      remainingUser = room.user1;
    }

    if (remainingUser) {
      remainingUser.socket.emit("partner_disconnected", { roomId });
    }

    this.userToRoom.delete(room.user1.socket.id);
    this.userToRoom.delete(room.user2.socket.id);
    this.rooms.delete(roomId);

    return { roomId, remainingUser };
  }

  private generate() {
    return GLOBAL_ROOM_ID++;
  }
}
