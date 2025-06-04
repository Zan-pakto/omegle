"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = void 0;
const RoomManager_1 = require("./RoomManager");
class UserManager {
    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager_1.RoomManager();
        console.log("UserManager initialized");
    }
    addUser(name, socket) {
        console.log("Adding user:", socket.id, "with name:", name);
        // Check if user already exists
        const existingUser = this.users.find(u => u.socket.id === socket.id);
        if (existingUser) {
            console.log("User already exists:", socket.id);
            return;
        }
        // Check if user is already in a room
        if (this.roomManager.isUserInRoom(socket.id)) {
            console.log("User already in room:", socket.id);
            return;
        }
        this.users.push({
            name,
            socket,
        });
        this.queue.push(socket.id);
        console.log("Current queue:", this.queue);
        socket.emit("lobby");
        this.clearQueue();
        this.initHandlers(socket);
    }
    removeUser(socketId) {
        console.log("Removing user:", socketId);
        console.log("Current users before removal:", this.users.map(u => u.socket.id));
        console.log("Current queue before removal:", this.queue);
        const user = this.users.find((x) => x.socket.id === socketId);
        if (user) {
            // Check if user was in a room
            const wasInRoom = this.roomManager.isUserInRoom(socketId);
            // Notify the room manager to clean up any rooms this user was in
            const { remainingUser } = this.roomManager.removeUserFromRooms(socketId);
            // Remove from users array and queue first
            this.users = this.users.filter((x) => x.socket.id !== socketId);
            this.queue = this.queue.filter((x) => x !== socketId);
            console.log("Users after removal:", this.users.map(u => u.socket.id));
            console.log("Queue after removal:", this.queue);
            // If user was in a room, add them back to the queue
            if (wasInRoom) {
                console.log("User was in a room, adding back to queue:", socketId);
                // Only add back to queue if they still exist in users array
                if (this.users.some(u => u.socket.id === socketId)) {
                    this.queue.push(socketId);
                    console.log("Added back to queue. New queue:", this.queue);
                    // Try to match them with another user immediately
                    this.clearQueue();
                }
                else {
                    console.log("User no longer exists in users array, skipping queue addition");
                }
            }
            // If user wasn't in a room, try to rematch remaining users
            if (!wasInRoom) {
                this.rematchUsers();
            }
        }
        else {
            console.log("User not found in users array:", socketId);
        }
    }
    rematchUsers() {
        console.log("Attempting to rematch users after disconnection");
        console.log("Current users:", this.users.map(u => u.socket.id));
        console.log("Current queue:", this.queue);
        // Get all users not currently in a room
        const availableUsers = this.users.filter(user => !this.roomManager.isUserInRoom(user.socket.id));
        console.log("Available users for rematching:", availableUsers.map(u => u.socket.id));
        // Clear the queue and add all available users
        this.queue = availableUsers.map(user => user.socket.id);
        console.log("Updated queue for rematching:", this.queue);
        // Try to create new pairs
        this.clearQueue();
    }
    clearQueue() {
        console.log("Queue length:", this.queue.length);
        console.log("Current queue:", this.queue);
        console.log("Current users:", this.users.map(u => u.socket.id));
        if (this.queue.length < 2) {
            return;
        }
        const id1 = this.queue.pop();
        const id2 = this.queue.pop();
        console.log("Pairing users:", id1, "and", id2);
        const user1 = this.users.find((x) => x.socket.id === id1);
        const user2 = this.users.find((x) => x.socket.id === id2);
        if (!user1 || !user2) {
            console.log("One or both users not found, skipping room creation");
            // Put users back in queue if they still exist
            if (user1)
                this.queue.push(id1);
            if (user2)
                this.queue.push(id2);
            return;
        }
        // Check if either user is already in a room
        if (this.roomManager.isUserInRoom(user1.socket.id) || this.roomManager.isUserInRoom(user2.socket.id)) {
            console.log("One or both users already in a room, skipping room creation");
            // Put users back in queue
            this.queue.push(id1, id2);
            return;
        }
        console.log("Creating room for users:", user1.socket.id, "and", user2.socket.id);
        const roomId = this.roomManager.createRoom(user1, user2);
        if (!roomId) {
            console.error("Failed to create room");
            // Put users back in queue
            this.queue.push(id1, id2);
            return;
        }
        console.log("Created room with ID:", roomId);
        // Debug current state
        this.roomManager.debugRooms();
    }
    initHandlers(socket) {
        socket.on("offer", ({ sdp, roomId }) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        });
        socket.on("answer", ({ sdp, roomId }) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        });
        socket.on("add-ice-candidate", ({ candidate, roomId, type }) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });
    }
}
exports.UserManager = UserManager;
