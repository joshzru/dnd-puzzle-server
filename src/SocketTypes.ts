export type DialId = "left" | "top" | "right";
export type MeterId = "left" | "center" | "right";

export interface DialOptions {
    deadZoneLeft: number;
    deadZoneRight: number;
}

export interface DialState {
    id: DialId;
    angle: number;
    options: DialOptions;
}

export interface MeterState {
    id: MeterId;
    percent: number;
    target: number;
}

export interface PuzzleInitState {
    dials: DialState[];
    meters: MeterState[];
}

export interface PuzzleStateUpdate {
    dial: DialState;
    meters: MeterState[];
    solved: boolean;
}

export interface ClientToServerEvents {
    dialMove: (dial: DialId, pointerDelta: number) => void;
}

export interface ServerToClientEvents {
    puzzleInit: (state: PuzzleInitState) => void;
    puzzleState: (state: PuzzleStateUpdate) => void;
    puzzleSolved: () => void;
    startAudio: () => void;
    stopAudio: () => void;
}

export interface InterServerEvents {}

export interface SocketData {}