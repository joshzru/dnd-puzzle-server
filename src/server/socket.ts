import type { Server as HttpServer } from 'node:http';
import { Namespace, Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types/socket.js';

export interface IONamespaces {
    default: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
    admin: Namespace<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
}

export function initSocket(server: HttpServer): IONamespaces {
    const io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
        >(server);

    return {
        default: io,
        admin: io.of("/admin"),
    }
}
