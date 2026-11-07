import { createServer } from "node:http";
import { Server } from "socket.io"

import app from './app.js';
import { GameRoomManager } from './rooms/GameRoomManager.js';
import { SocketHandler } from './sockets/SocketHandler.js';

const PORT = 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    }
});

const roomManager = new GameRoomManager();

const sockerHandler = new SocketHandler(io, roomManager);

sockerHandler.initialise();

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});