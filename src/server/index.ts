import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { initSocket } from './socket.js';
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '../SocketTypes.js';
import { DialPuzzle } from './dial-puzzle.js';

interface PuzzleClass {
    id: string;
    open: (io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => boolean;
    close: () => void;
}

class PuzzleHandler {
    private queue: PuzzleClass[] = []

    constructor(initQueue?: PuzzleClass[]) {
        if ( initQueue !== undefined ) this.queue = initQueue;
    }

    enqueue(puzzle: PuzzleClass): void {
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
