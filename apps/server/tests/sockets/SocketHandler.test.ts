import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";

import { GameRoomManager } from "../../src/rooms/GameRoomManager.js";
import { RoomEvents } from "../../src/rooms/RoomEvents.js";
import { SocketHandler } from "../../src/sockets/SocketHandler.js";

interface RoomState {
    code: string;
    hostId: string;
    players: {
        id: string;
        username: string;
        isHost: boolean;
        connected: boolean;
    }[];
    playerCount: number;
    maxPlayers: number;
    canStart: boolean;
    status: string;
};

let httpServer: HttpServer;
let io: Server;
let serverUrl: string;

let clients: ClientSocket[] = [];

function nextEvent<T>(socket: ClientSocket, event: string): Promise<T> {
    return new Promise((resolve) => {
        socket.once(event, (data: T) => resolve(data));
    });
}

function nextEventWhere<T>(socket: ClientSocket, event: string, predicate: (data: T) => boolean): Promise<T> {
    return new Promise((resolve) => {
        const handler = (data: T) => {
            if (!predicate(data)) return;

            socket.off(event, handler);
            resolve(data);
        }

        socket.on(event, handler);
    })
}

async function connectClient(): Promise<ClientSocket> {
    const client = createClient(serverUrl, {
        autoConnect: false,
        forceNew: true,
        reconnection: false,
    });

    const connected = new Promise<void>((resolve, reject) => {
        client.once("connect", resolve);
        client.once("connect_error", (error) => {
            console.error("Message:", error.message);
            console.error("Desc:", error.description);
            console.error("Context:", error.context);
        });
    });

    client.connect();

    await connected;

    clients.push(client);

    return client;
}

beforeEach(async () => {
    httpServer = createServer();
    io = new Server(httpServer);

    const roomManager = new GameRoomManager();
    const socketHandler = new SocketHandler(io, roomManager);

    socketHandler.initialise();

    await new Promise<void>((resolve) => {
        httpServer.listen(0, "127.0.0.1", resolve);
    });

    const address = httpServer.address();

    if (!address || typeof address === "string") {
        throw new Error("Could not determine test server address");
    }

    serverUrl = `http://127.0.0.1:${address.port}`;
    
    clients = [];
});

afterEach(async () => {
    clients.forEach(client => client.disconnect());

    await new Promise<void>((resolve) => {
        io.close(() => resolve());
    });
});

describe("SocketHandler", () => {
    describe("room:create", () => {
        it("should allow a client to create a room", async () => {
            const client = await connectClient();

            const created = nextEvent<RoomState>(
                client, 
                RoomEvents.CREATED,
            );

            client.emit(RoomEvents.CREATE, "Host");

            const room = await created;

            expect(room).toBeDefined();
            expect(room.code).toHaveLength(6);
            expect(room.players).toHaveLength(1);
            expect(room.playerCount).toBe(1);
            expect(room.hostId).toBe(client.id);
            expect(room.players[0].username).toBe("Host");  
            expect(room.players[0].isHost).toBe(true);
        });

        it("should reject an invalid username", async () => {
            const client = await connectClient();

            const error = nextEvent<{ message: string }>(
                client,
                RoomEvents.ERROR,
            );

            client.emit(RoomEvents.CREATE, "A");

            const response = await error;

            expect(response.message).toBe("Username must be between 2 and 20 characters");
        });

        it("should not allow a client to create multiple rooms", async () => {
            const client = await connectClient();

            const created = nextEvent<RoomState>(
                client,
                RoomEvents.CREATED,
            );

            client.emit(RoomEvents.CREATE, "Host");

            await created;

            const error = nextEvent<RoomState>(
                client, 
                RoomEvents.ERROR,
            );

            client.emit(RoomEvents.CREATE, "Host");

            const response = await error;

            expect(response.message).toBe("You are already in a room");
        });
    });

    describe("room:join", () => {
        it("should allow a client to join an existing room", async () => {
            const host = await connectClient();
            const player = await connectClient();

            const created = nextEvent<RoomState>(
                host,
                RoomEvents.CREATED,
            );

            host.emit(RoomEvents.CREATE, "Host");

            const room = await created;

            const joined = nextEvent<RoomState>(
                player,
                RoomEvents.JOINED,
            );

            const hostUpdate = nextEvent<RoomState>(
                host,
                RoomEvents.UPDATED,
            );

            player.emit(RoomEvents.JOIN, {
                code: room.code,
                username: "Test",
            });

            const [joinedRoom, updatedRoom] = await Promise.all([
                joined,
                hostUpdate,
            ]);

            expect(joinedRoom.players).toHaveLength(2);
            expect(updatedRoom.players).toHaveLength(2);

            expect(updatedRoom.players[0].username).toBe("Host");
            expect(updatedRoom.players[1].username).toBe("Test");
        });

        it("should reject holding a nonexistant room", async () => {
            const player = await connectClient();

            const error = nextEvent<{ message: string }>(
                player,
                RoomEvents.ERROR,
            );

            player.emit(RoomEvents.JOIN, {
                code: "ABC123",
                username: "Test",
            });

            const response = await error;

            expect(response.message).toBe("Room not found");
        });

        it("should not allow a player to join multiple rooms", async () => {
            const player = await connectClient();

            const created = nextEvent<RoomState>(
                player,
                RoomEvents.CREATED,
            );

            player.emit(RoomEvents.CREATE, "Host");

            await created;

            const error = nextEvent<{ message: string }>(
                player,
                RoomEvents.ERROR,
            );

            player.emit(RoomEvents.JOIN, {
                code: "ABC123",
                username: "Test"
            });

            const response = await error;

            expect(response.message).toBe("You are already in a room");
        });
    });

    describe("room:leave", () => {
        it("should remove a player and leave the remaining players", async () => {
            const host = await connectClient();
            const player = await connectClient();

            const created = nextEvent<RoomState>(
                host,
                RoomEvents.CREATED,
            );

            host.emit(RoomEvents.CREATE, "Host");

            const room = await created;

            const joined = nextEvent<RoomState>(
                player,
                RoomEvents.JOINED,
            );

            player.emit(RoomEvents.JOIN, {
                code: room.code,
                username: "Player",
            });

            await joined;

            const left = nextEvent<void>(
                player,
                RoomEvents.LEFT
            );

            const hostUpdate = nextEventWhere<RoomState>(
                host,
                RoomEvents.UPDATED,
                room => room.playerCount === 1
            );

            player.emit(RoomEvents.LEAVE);
            
            const [_, updatedRoom] = await Promise.all([
                left,
                hostUpdate
            ]); 

            expect(updatedRoom.players).toHaveLength(1);
            expect(updatedRoom.players[0].username).toBe("Host");
        });
    });

    describe("disconnect", () => {
        it("should remove a disconnected player", async () => {
            const host = await connectClient();
            const player = await connectClient();

            const created = nextEvent<RoomState>(
                host,
                RoomEvents.CREATED,
            );

            host.emit(RoomEvents.CREATE, "Host");
            
            const room = await created;

            const joined = nextEvent<RoomState>(
                player,
                RoomEvents.JOINED,
            );

            player.emit(RoomEvents.JOIN, {
                code: room.code,
                username: "Player",
            });

            await joined;

            const updated = nextEventWhere<RoomState>(
                host,
                RoomEvents.UPDATED,
                room => room.playerCount === 1,
            );

            player.disconnect();

            const updatedRoom = await updated;

            expect(updatedRoom.players).toHaveLength(1);
            expect(updatedRoom.players[0].username).toBe("Host");
        });

        it("should transfer ownership if host disconnects", async () => {
            const host = await connectClient();
            const player = await connectClient();

            const created = nextEvent<RoomState>(
                host,
                RoomEvents.CREATED
            );

            host.emit(RoomEvents.CREATE, "Host");

            const room = await created;

            const joined = nextEvent<RoomState>(
                player,
                RoomEvents.JOINED,
            );

            player.emit(RoomEvents.JOIN, {
                code: room.code,
                username: "Player",
            });

            await joined;

            const updated = nextEventWhere<RoomState>(
                player,
                RoomEvents.UPDATED,
                room => room.playerCount === 1
            );

            host.disconnect();

            const updatedRoom = await updated;

            expect(updatedRoom.hostId).toBe(player.id);
            expect(updatedRoom.players[0].username).toBe("Player");
            expect(updatedRoom.playerCount).toBe(1);
        });
    });
});