"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
let GLOBAL_ROOM_ID = 1;
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.userToRoom = new Map();
    }
    isUserInRoom(socketId) {
        return this.userToRoom.has(socketId);
    }
    createRoom(user1, user2) {
        const roomId = this.generate().toString();
        this.rooms.set(roomId, {
            user1,
            user2,
            createdAt: Date.now(),
        });
        this.userToRoom.set(user1.socket.id, roomId);
        this.userToRoom.set(user2.socket.id, roomId);
        const storedRoom = this.rooms.get(roomId);
        if (!storedRoom)
            return null;
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
    onOffer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.socket.emit("offer", { sdp, roomId });
    }
    onAnswer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.socket.emit("answer", { sdp, roomId });
    }
    onIceCandidates(roomId, senderSocketid, candidate, type) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser.socket.emit("add-ice-candidate", { candidate, type });
    }
    removeUserFromRooms(socketId) {
        const roomId = this.userToRoom.get(socketId);
        if (!roomId)
            return {};
        const room = this.rooms.get(roomId);
        if (!room)
            return {};
        let remainingUser;
        if (room.user1.socket.id === socketId) {
            remainingUser = room.user2;
        }
        else if (room.user2.socket.id === socketId) {
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
    generate() {
        return GLOBAL_ROOM_ID++;
    }
}
exports.RoomManager = RoomManager;
