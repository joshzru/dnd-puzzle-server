import { DialPuzzle } from "./dial-puzzle.js";
import { Puzzle } from "./Puzzle.js";
import type { SocketIOServer } from "../types/socket.js";

type PuzzleConstructor = new (io: SocketIOServer) => Puzzle;

export class PuzzleQueue {
    private queue: string[] = [];

    constructor(initQueue?: string[]) {
        if ( initQueue !== undefined ) this.queue = initQueue;
    }

    setQueue(q: string[]) {
        this.queue = q;
    }

    clear() {
        this.queue = [];
    }

    advance() {

    }

    getCurrentId(): string | null {
        return this.queue.length === 0 ? null : this.queue[0];
    }
}

export class PuzzleManager {
    private puzzleQueue: PuzzleQueue;
    private io: SocketIOServer;
    private currentPuzzle: Puzzle | null = null;

    constructor(puzzleQueue: PuzzleQueue, io: SocketIOServer) {
        this.puzzleQueue = puzzleQueue;
        this.io = io;
    }

    resetPuzzle(): void {
        if ( this.io === undefined ) throw new Error("Socket not attached.");
        const id = this.puzzleQueue.getCurrentId();
        if ( id === null ) throw new Error("No puzzle to reset");
        this.uninstall();
        this.install();
        this.io.emit("reset");
    }

    private uninstall(): void {
        if ( this.currentPuzzle === null ) return;
        this.currentPuzzle.uninstall();
        this.currentPuzzle = null;
    }

    private install(): void {
        if ( this.io === undefined ) throw new Error("Socket not attached");
        const id = this.puzzleQueue.getCurrentId();
        if ( id === null ) throw new Error("No puzzle to install");

        // Uninstall current puzzle
        if ( this.currentPuzzle !== null ) this.uninstall();
        this.currentPuzzle = PuzzleFactory.create(id, this.io);
        this.currentPuzzle.install(this.io);
    }
}

export class PuzzleFactory {

    private static readonly registry = new Map<string, PuzzleConstructor>([
        [DialPuzzle.id, DialPuzzle],
    ])

    static create(id: string, io: SocketIOServer): Puzzle {
        const constructor = this.registry.get(id);
        if ( constructor === undefined )
            throw new Error(`Unknown puzzle '${id}`);
        return new constructor(io);
    }
}