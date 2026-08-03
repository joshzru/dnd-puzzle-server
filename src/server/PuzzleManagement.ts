import { DialPuzzle } from "./dial-puzzle.js";
import { Puzzle } from "./Puzzle.js";
import type { SocketIOServer } from "../types/socket.js";

type PuzzleConstructor = new (io: SocketIOServer) => Puzzle;

export class PuzzleManager {
    private queue: string[] = [];
    private io: SocketIOServer | undefined = undefined;
    private currentPuzzle: Puzzle | null = null;

    constructor(initQueue?: string[]) {
        if ( initQueue !== undefined ) this.queue = initQueue;
    }

    attachSocket(io: SocketIOServer) {
        this.io = io;
    }

    setQueue(q: string[]): void {
        this.queue = q;
    }

    clearQueue(): void {
        this.queue.length = 0;
    }

    resetPuzzle(): void {
        if ( this.io === undefined ) throw new Error("Socket not attached.");
        const id = this.getCurrentId();
        if ( id === null ) throw new Error("No puzzle to reset");
        this.uninstall();
        this.install();
        this.io.emit("reset");
    }

    getCurrentId(): string | null {
        return this.queue.length === 0 ? null : this.queue[0];
    }

    advance(): void {
        if ( this.io === undefined ) throw new Error("Socket not attached.");
        // uninstall the current puzzle and install the next in the queue if one
        // exists
    }

    private uninstall(): void {
        if ( this.currentPuzzle === null ) return;
        this.currentPuzzle.uninstall();
        this.currentPuzzle = null;
    }

    private install(): void {
        if ( this.io === undefined ) throw new Error("Socket not attached");
        const id = this.getCurrentId();
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