import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io"

import { GameRoomManager } from './rooms/GameRoomManager.js';
import { SocketHandler } from './sockets/SocketHandler.js';

const app = express();
const PORT = 3000;

app.use(express.json());

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

app.get("/", (_req, res) => {
    res.send("Foursies server is running")
});

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "Server is healthy",
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});