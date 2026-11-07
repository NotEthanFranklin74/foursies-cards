import { describe, it, expect, beforeEach } from "vitest";
import { GameRoomManager } from '../../src/rooms/GameRoomManager.js';

describe("GameRoomManager", () => {
    let manager: GameRoomManager;

    const createPlayer = (id: string, username: string): RoomPlayer => ({
        id,
        username,
        isHost: false,
        connected: true,
    });

    beforeEach(() => {
        manager = new GameRoomManager();
    });

    describe("createRoom()", () => {
        it("should create a room", () => {
            const host = createPlayer("player-1", "host");
            const room = manager.createRoom(host);

            expect(room).toBeDefined();
            expect(room.code).toHaveLength(6);
            expect(room.hostId).toBe(host.id);
        });

        it("should generate a unique game code", () => {
            const room1 = manager.createRoom(
                createPlayer("player-1", "host")
            );

            const room2 = manager.createRoom(
                createPlayer("player-2", "host")
            );

            expect(room1.code).not.toBe(room2.code);
        });

        it("should add the room to the manager", () => {
            const room = manager.createRoom(
                createPlayer("player-1", "host")
            );

            expect(manager.getRoom(room.code)).toBe(room);
        });

        it("should make the creator the host", () => {
            const player = createPlayer("player-1", "host");
            const room = manager.createRoom(player);

            expect(room.players[0].isHost).toBe(true);
            expect(room.hostId).toBe(player.id);
        });
    });

    describe("getRoom()", () => {
        let addedRoom;

        beforeEach(() => {
            addedRoom = manager.createRoom(createPlayer("player-1", "host"));
        });

        it("should return an existing room", () => {
            const room = manager.getRoom(addedRoom.code);

            expect(room).toBe(addedRoom);
        });

        it("should return undefined if no room found", () => {
            const room = manager.getRoom("Invalid-Code");

            expect(room).toBe(undefined);
        });

        it("should get the room regardless of case", () => {
            const room = manager.getRoom(addedRoom.code.toLowerCase());

            expect(room).toBe(addedRoom);
        });
    });

    describe("joinRoom()", () => {
        let addedPlayer;
        let addedRoom;

        beforeEach(() => {
            addedPlayer = createPlayer("player-1", "host")
            addedRoom = manager.createRoom(addedPlayer);
        })

        it("should allow player to join room", () => {
            const player = createPlayer("player-2", "test");

            addedRoom = manager.joinRoom(addedRoom.code, player);

            expect(addedRoom.playerCount).toBe(2);
            expect(addedRoom.players[1].id).toBe("player-2");
        });

        it("should not make the new player the host", () => {
            const player = createPlayer("player-2", "test");

            addedRoom = manager.joinRoom(addedRoom.code, player);

            expect(addedRoom.players[1].isHost).toBe(false);
            expect(addedRoom.hostId).not.toBe(player.id);
        })

        it("should throw error if no room found", () => {
            expect(() => manager.joinRoom("Invalid-Code", addedPlayer)).toThrow("Room not found");
        });

        it("should throw error if game has already started", () => {
            const roomCode = addedRoom.code;

            addedRoom.status = "IN_PROGRESS";

            expect(() => manager.joinRoom(roomCode, addedPlayer)).toThrow("Game has already started");
        });

        it("should throw error if room is full", () => {
            addedRoom.maxPlayers = 2;

            addedRoom = manager.joinRoom(addedRoom.code, createPlayer("player-2", "test"));

            expect(() => manager.joinRoom(addedRoom.code, createPlayer("player-3", "test-2"))).toThrow("Room is full");
        });

        it("should throw error if player is already in the room", () => {
            expect(() => manager.joinRoom(addedRoom.code, addedPlayer)).toThrow("Player is already in this room");
        });
    });

    describe("leaveRoom()", () => {
        let addedRoom;
        let host;
        let testPlayer;
    
        beforeEach(() => {
            host = createPlayer("player-1", "host");
            addedRoom = manager.createRoom(host);
            testPlayer = createPlayer("player-2", "test");
            addedRoom = manager.joinRoom(addedRoom.code, testPlayer);
        });

        it("should remove player on leave", () => {
            expect(addedRoom.players.some(player => player.id === testPlayer.id)).toBe(true);
            expect(addedRoom.playerCount).toBe(2);

            addedRoom = manager.leaveRoom(addedRoom.code, testPlayer.id);

            expect(addedRoom.players.some(player => player.id === testPlayer.id)).toBe(false);
            expect(addedRoom.playerCount).toBe(1);
        });

        it("should transfer host status if host leaves", () => {
            expect(addedRoom.hostId).toBe(host.id);
            expect(addedRoom.players[0].isHost).toBe(true);

            addedRoom = manager.leaveRoom(addedRoom.code, host.id);

            expect(addedRoom.hostId).toBe(testPlayer.id);
            expect(addedRoom.players[0].isHost).toBe(true);
        });

        it("should delete room if all players leave", () => {
            const roomCode = addedRoom.code;
            addedRoom = manager.leaveRoom(roomCode, testPlayer.id);
            addedRoom = manager.leaveRoom(roomCode, host.id);

            expect(addedRoom).toBe(undefined);
            expect(manager.getRoom(roomCode)).toBe(undefined);
        });

        it("should return undefined if room doesn't exist", () => {
            expect(manager.leaveRoom("Invalid-Code", host.id)).toBe(undefined);
        });
    });

    describe("getAllRooms()", () => {
        it("should return array of all rooms", () => {
            const host1 = createPlayer("player-1", "host-1");
            const room1 = manager.createRoom(host1);

            const host2 = createPlayer("player-2", "host-2");
            const room2 = manager.createRoom(host2);

            const allRooms = manager.getAllRooms();

            expect(allRooms.length).toBe(2);
            expect(allRooms).toContain(room1);
            expect(allRooms).toContain(room2);
        });
    });
});