import type { SocketIOServer } from "../types/socket.js"

export abstract class Puzzle {
    static readonly id: string
    abstract install(io: SocketIOServer): void;
    abstract uninstall(): void;
}