import cors from "cors";
import express, {Express, NextFunction, Request, Response} from "express";
import {Server} from "http";
import socketIO, {Socket} from "socket.io";
import config from "../../config";
import backtestController from "./controllers/backtest";
import dataController from "./controllers/data";
import strategyController from "./controllers/strategy";

export default function startWebServer() {
    const app: Express = express();
    const http = new Server(app);
    const io = socketIO(http);

    http.listen(config.webServer.port, () => console.log(`Listening on port: ${config.webServer.port}`));

    app.use(express.json());
    app.use(cors());

    app.use("/data", dataController);
    app.use("/strategy", strategyController);

    app.use((err: any, req: Request, res: Response, next: NextFunction) => next(res.status(err.output.statusCode).json(err.output.payload)));

    io.on("connection", (socket: Socket) => {
        backtestController(socket);
    });

    io.on("disconnect", (reason: any) => {
        console.log(reason);
    });
}
