export interface DialOptions {
    deadZoneLeft: number;
    deadZoneRight: number;
}

export interface DialState {
    id: string;
    angle: number;
    options: DialOptions;
}

export interface MeterState {
    id: string;
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
    dialMove: (dial: string, pointerDelta: number) => void;
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