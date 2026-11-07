import express from "express";

const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        status: "ok",
        message: "foursies server is online",
    });
});

export default app;