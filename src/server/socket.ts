import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../SocketTypes.js';

export function initSocket(server: HttpServer) {
    const io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
        >(server);
    
    io.on("connection", (socket) => {
        console.log("Connected:", socket.id);
    });

    return io;
}
