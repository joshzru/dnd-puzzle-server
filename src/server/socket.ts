import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../SocketTypes.js';
import { DialPuzzle } from './dial-puzzle.js';

export function initSocket(server: HttpServer): SocketIOServer {
    const io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
        >(server);
    
    const puzzle = new DialPuzzle(io);
    io.on("connection", (socket) => {
        puzzle.connect(socket);
    });

    return io;
}
