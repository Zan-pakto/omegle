"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
let GLOBAL_ROOM_ID = 1;
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.userToRoom = new Map();
        console.log("RoomManager initialized");
    }
    isUserInRoom(socketId) {
        return this.userToRoom.has(socketId);
    }
    createRoom(user1, user2) {
        const roomId = this.generate().toString();
        console.log(`Creating new room ${roomId} with users:`, {
            user1: user1.socket.id,
            user2: user2.socket.id,
        });
        // Store the room
        this.rooms.set(roomId, {
            user1,
            user2,
            createdAt: Date.now(),
        });
        // Map users to room
        this.userToRoom.set(user1.socket.id, roomId);
        this.userToRoom.set(user2.socket.id, roomId);
        // Verify room was stored
        const storedRoom = this.rooms.get(roomId);
        if (!storedRoom) {
            console.error("Failed to store room:", roomId);
            return null;
        }
        console.log("Room stored successfully:", {
            roomId,
            currentRooms: Array.from(this.rooms.keys()),
            userMappings: Array.from(this.userToRoom.entries()),
        });
        // Notify both users about the room creation and their pairing
        user1.socket.emit("room_created", {
            roomId,
            partnerName: user2.name,
        });
        user2.socket.emit("room_created", {
            roomId,
            partnerName: user1.name,
        });
        // Log all current rooms for debugging
        console.log("Current rooms after creation:", Array.from(this.rooms.keys()));
        user1.socket.emit("send-offer", {
            roomId,
        });
        user2.socket.emit("send-offer", {
            roomId,
        });
        return roomId;
    }
    onOffer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.socket.emit("offer", {
            sdp,
            roomId,
        });
    }
    onAnswer(roomId, sdp, senderSocketid) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser === null || receivingUser === void 0 ? void 0 : receivingUser.socket.emit("answer", {
            sdp,
            roomId,
        });
    }
    onIceCandidates(roomId, senderSocketid, candidate, type) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
        receivingUser.socket.emit("add-ice-candidate", { candidate, type });
    }
    removeUserFromRooms(socketId) {
        console.log("Removing user from rooms:", socketId);
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
        // Notify the remaining user
        if (remainingUser) {
            remainingUser.socket.emit("partner_disconnected", { roomId });
        }
        // Clean up
        this.userToRoom.delete(room.user1.socket.id);
        this.userToRoom.delete(room.user2.socket.id);
        this.rooms.delete(roomId);
        console.log("Removed room:", roomId);
        console.log("Remaining rooms:", Array.from(this.rooms.keys()));
        console.log("Remaining user mappings:", Array.from(this.userToRoom.entries()));
        return { roomId, remainingUser };
    }
    generate() {
        return GLOBAL_ROOM_ID++;
    }
    // Debug method to check room status
    debugRooms() {
        console.log("Current rooms in system:", Array.from(this.rooms.entries()).map(([id, room]) => ({
            roomId: id,
            user1: room.user1.socket.id,
            user2: room.user2.socket.id,
            createdAt: new Date(room.createdAt).toISOString(),
        })));
        console.log("User to room mappings:", Array.from(this.userToRoom.entries()));
    }
}
exports.RoomManager = RoomManager;
