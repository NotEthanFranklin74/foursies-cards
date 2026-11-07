export interface RoomPlayer {
    id: string;
    username: string;
    isHost: boolean;
    connected: boolean;
}

export interface GameRoomState {
    code: string;
    hostId: string;
    players: RoomPlayer[];
    maxPlayers: number;
    status: "WAITING" | "IN_PROGRESS" | "FINISHED";
}

export class GameRoom {
    public readonly code: string;
    public hostId: string;

    public players: RoomPlayer[] = [];

    public readonly maxPlayers = 2;
    public status: GameRoomState["status"] = "WAITING";

    constructor(code: string, host: RoomPlayer) {
        this.code = code;
        this.hostId = host.id;

        this.players.push({
            ...host,
            isHost: true,
            connected: true,
        });
    }

    get playerCount(): number {
        return this.players.length;
    }

    get isFull(): boolean {
        return this.playerCount >= this.maxPlayers;
    }

    get canStart(): boolean {
        return this.playerCount >= 2 &&
            this.status === "WAITING";
    }
}