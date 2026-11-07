import { describe, it, expect } from "vitest";
import { GameRoom } from '../../src/rooms/GameRoom.js';

describe("GameRoom", () => {
    it("should create a room with a host", () => {
        const host = {
            id: "player-1",
            username: "host",
            isHost: true,
            connected: true,
        };

        const room = new GameRoom("ABC123", host);

        expect(room.code).toBe("ABC123");
        expect(room.hostId).toBe("player-1");
        expect(room.players).toHaveLength(1);
        expect(room.players[0].username).toBe("host");
        expect(room.players[0].isHost).toBe(true);
    });

    it("should initially have one player", () => {
        const room = new GameRoom("ABC123", {
            id: "player-1",
            username: "host",
            isHost: true,
            connected: true,
        });

        expect(room.playerCount).toBe(1);
    });

    it("should not allow a game to start with one player", () => {
        const room = new GameRoom("ABC123", {
            id: "player-1",
            username: "host",
            isHost: true,
            connected: true,
        });

        expect(room.canStart).toBe(false);
    });

    it("should allow player to join", () => {
        const room = new GameRoom("ABC123", {
            id: "player-1",
            username: "host",
            isHost: true,
            connected: true,
        });

        room.players.push({
            id: "player-2",
            username: "Max",
            isHost: false,
            connected: true,
        })

        expect(room.playerCount).toBe(2);
    });

    it("should allow game to start with 2 or more players", () => {
        const room = new GameRoom("ABC123", {
            id: "player-1",
            username: "host",
            isHost: true,
            connected: true,
        });

        room.players.push({
            id: "player-2",
            username: "Max",
            isHost: false,
            connected: true,
        })

        expect(room.canStart).toBe(true);
    })
})