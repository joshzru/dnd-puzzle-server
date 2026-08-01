import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { initSocket } from './socket.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../SocketTypes.js';

interface Puzzle {
    readonly id: string;
    install(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>): void;
    uninstall(): void;
}

class PuzzleManager {
    private queue: Puzzle[] = []

    constructor(initQueue?: Puzzle[]) {
        if ( initQueue !== undefined ) this.queue = initQueue;
    }

    enqueue(puzzle: Puzzle): void {
        this.queue.push(puzzle);
    }

    getNextId(): string | null {
        return this.queue.length === 0 ? null : this.queue[0].id;
    }
}

const server = createServer(createApp());
const io = initSocket(server);

server.listen(80, '0.0.0.0', () => {
    console.log("server running at http://192.168.0.105");
})
