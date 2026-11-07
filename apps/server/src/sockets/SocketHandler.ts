import { Server, Socket } from "socket.io";
import { GameRoomManager } from "../rooms/GameRoomManager.js";
import { RoomEvents } from "../rooms/RoomEvents.js";
import { GameRoom } from "../rooms/GameRoom.js";

export class SocketHandler {
    constructor(
        private io: Server,
        private roomManager: GameRoomManager,
    ) {}

    initialise(): void {
        this.io.on("connection", (socket) => {
            this.registerRoomEvents(socket);

            socket.on("disconnect", () => {
                this.removePlayer(socket);
            });
        });
    }

    private registerRoomEvents(socket: Socket): void {
        socket.on(RoomEvents.CREATE, async (username: string) => {
            try {
                if (socket.data.roomCode) {
                    throw new Error("You are already in a room");
                }

                const validUsername = this.validateUsername(username);

                const room = this.roomManager.createRoom({
                    id: socket.id,
                    username: validUsername,
                    isHost: true,
                    connected: true,
                });

                await socket.join(room.code);

                socket.data.roomCode = room.code;

                socket.emit(RoomEvents.CREATED, this.getRoomState(room));

                this.io.to(room.code).emit(
                    RoomEvents.UPDATED,
                    this.getRoomState(room),
                );
            } catch (error) {
                this.sendError(socket, error);
            }
        });

        socket.on(RoomEvents.JOIN, async (data: { code: string, username: string }) => {
            try {
                if (socket.data.roomCode) throw new Error("You are already in a room");

                const username = this.validateUsername(data.username);

                const room = this.roomManager.joinRoom(data.code, {
                    id: socket.id,
                    username,
                    isHost: false,
                    connected: true,
                });

                await socket.join(room.code);

                socket.data.roomCode = room.code;

                socket.emit(RoomEvents.JOINED, this.getRoomState(room));

                this.io.to(room.code).emit(
                    RoomEvents.UPDATED,
                    this.getRoomState(room),
                );
            } catch (error) {
                this.sendError(socket, error);
            }
        });

        socket.on(RoomEvents.LEAVE, () => {
            this.removePlayer(socket);
        });
    }

    private removePlayer(socket: Socket): void {
        const code = socket.data.roomCode as string | undefined;

        if (!code) return;

        const room = this.roomManager.leaveRoom(code, socket.id);

        socket.leave(code);
        delete socket.data.roomCode;
        
        socket.emit(RoomEvents.LEFT);

        if (room) {
            const state = this.getRoomState(room);
            this.io.to(code).emit(
                RoomEvents.UPDATED,
                state,
            );
        }
    }

    private getRoomState(room: GameRoom) {
        return {
            code: room.code,
            hostId: room.hostId,
            players: room.players,
            playerCount: room.playerCount,
            maxPlayers: room.maxPlayers,
            canStart: room.canStart,
            status: room.status,
        };
    }

    private validateUsername(username: string): string {
        if (typeof username !== "string") throw new Error("A username is required");

        const trimmed = username.trim();

        if(trimmed.length < 2 || trimmed.length > 20) throw new Error("Username must be between 2 and 20 characters");

        return trimmed;
    }

    private sendError(socket: Socket, error: unknown): void {
        const message = error instanceof Error 
            ? error.message
            : "An unexpected error occured";

        socket.emit(RoomEvents.ERROR, { message });
    }
}