import { randomInt } from "node:crypto";
import { GameRoom, RoomPlayer } from "./GameRoom.js";

export class GameRoomManager {
    private rooms: Map<string, GameRoom> = new Map();

    private generateGameRoomCode(): string {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";

        let code = "";

        for (let i=0; i < 6; i++) {
            code += characters[randomInt(characters.length)];
        }

        return code;
    }

    createRoom(host: RoomPlayer): GameRoom {
        let code: string;

        do {
            code = this.generateGameRoomCode();
        } while (this.rooms.has(code));

        const room = new GameRoom(code, host);

        this.rooms.set(code, room);

        return room;
    }

    getRoom(code: string): GameRoom | undefined {
        return this.rooms.get(code.toUpperCase());
    }

    joinRoom(code: string, player: RoomPlayer): GameRoom {
        const room = this.getRoom(code);

        if (!room) {
            throw new Error("Room not found");
        }

        if (room.status !== "WAITING") {
            throw new Error("Game has already started");
        }

        if (room.isFull) {
            throw new Error("Room is full");
        }

        if (room.players.some(p => p.id === player.id)) {
            throw new Error("Player is already in this room");
        }

        room.players.push({
            ...player,
            isHost: false,
            connected: true,
        });

        return room;
    }

    leaveRoom(code: string, playerId: string): GameRoom | undefined {
        const room = this.getRoom(code);

        if (!room) return undefined;

        room.players = room.players.filter(
            player => player.id !== playerId
        );

        if (room.players.length === 0) {
            this.rooms.delete(code.toUpperCase());
            return undefined;
        }

        if (room.hostId === playerId) {
            const newHost = room.players[0];

            room.hostId = newHost.id;
            newHost.isHost = true;
        }

        return room;
    }

    getAllRooms(): GameRoom[] {
        return Array.from(this.rooms.values());
    }
}