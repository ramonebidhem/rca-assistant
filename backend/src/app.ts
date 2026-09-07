import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { env } from "./lib/env.js";
import { publicRouter } from "./routes/public.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { asyncHandler } from "./lib/asyncHandler.js";
import { getStoredImage } from "./lib/images.js";

export function createApp() {
    const app = express();

    app.use(
        cors({
            origin: env.corsOrigin.length ? env.corsOrigin : true,
        }),
    );
    app.use(express.json());

    // Uploaded images are stored in the database, so they survive redeploys on
    // hosts with an ephemeral filesystem.
    app.get(
        "/uploads/:file",
        asyncHandler(async (req, res) => {
            const id = path.parse(req.params.file).name;
            const file = await getStoredImage(id);
            if (!file) {
                res.status(404).json({ error: "not_found", message: "Image not found" });
                return;
            }
            res.setHeader("Content-Type", file.mimeType);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.send(Buffer.from(file.data));
        }),
    );

    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

    app.use("/api/auth", authRouter);
    app.use("/api", publicRouter);
    app.use("/api/admin", adminRouter);

    // In production the built frontend is served from the same origin, so the
    // whole app deploys as a single service behind one URL.
    if (env.clientDir && fs.existsSync(env.clientDir)) {
        const clientDir = env.clientDir;
        app.use(express.static(clientDir));
        // SPA fallback for client-side routes (never for /api or /uploads).
        app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
            res.sendFile(path.join(clientDir, "index.html"));
        });
    }

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
