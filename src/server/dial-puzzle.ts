import puzzleConfig from "./dial-puzzle.json" with { type: "json" };
import type { Server, Socket } from "socket.io";
import type {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    DialState,
    DialOptions,
    MeterState,
} from "../SocketTypes.js";

interface puzzleConfig {
    meterSettings: {
        max: number;
        min: number;
        num: number;
    };
    dialSettings: {
        max: number;
        min: number;
        num: number;
        dials: {
            angle: number,
            options: DialOptions;
        }[]
    };
    relationMatrix: number[][];
}

export class DialPuzzle {

    readonly config = {
        maxDials: 12,
        minDials: 1,
        maxMeters: 20,
        minMeters: 1,
    }
    readonly dials = new Map<string, Dial>();
    readonly meters = new Map<string, MeterState>();
    readonly bias = [0.5, 0.5, 0.5];
    readonly relationMatrix = [
        [0.25, 0.10, -0.15],
        [-0.15, 0.25, 0.10],
        [0.10, -0.15, 0.25]
    ];

    solved = false;

    private audioOwnerId?: string

    constructor(readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
        this.dials.set("left", new Dial({
                id: "left",
                angle: 0,
                options: {
                    deadZoneLeft: 3 * Math.PI / 4,
                    deadZoneRight: -3 * Math.PI / 4
                }
            })
        );

        this.dials.set("top", new Dial({
                id: "top",
                angle: 0,
                options: {
                    deadZoneLeft: 3 * Math.PI / 4,
                    deadZoneRight: -3 * Math.PI / 4
                }
            })
        );

        this.dials.set("right", new Dial({
                id: "right",
                angle: 0,
                options: {
                    deadZoneLeft: 3 * Math.PI / 4,
                    deadZoneRight: -3 * Math.PI / 4
                }
            })
        );

        this.meters.set("left", {
            id: "left",
            percent: 0,
            target: 0.28,
        });

        this.meters.set("center", {
            id: "center",
            percent: 0,
            target: 0.46,
        });

        this.meters.set("right", {
            id: "right",
            percent: 0,
            target: 0.65,
        });
        this.computeMeters();
    }

    createDial(id: string, angle = 0, options: DialOptions = {
        deadZoneLeft: 3 * Math.PI / 4,
        deadZoneRight: -3 * Math.PI / 4
    }): void {
        this.dials.set(id, new Dial({
            id: id,
            angle: angle,
            options: options
        }));
    }

    createMeter(state: MeterState): void {
        this.meters.set(state.id, state);
    }

    connect(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
        socket.on("dialMove", (id, pointerDelta)=>{
            this.moveDial(id, pointerDelta);
        });
        
        socket.on("disconnect", () => {
            if ( socket.id !== this.audioOwnerId ) return;
            this.audioOwnerId = undefined;
            this.assignAudioOwner();
        })
        
        socket.emit("puzzleInit",{
            dials: [...this.dials.values()].map(d=>d.state),
            meters: [...this.meters.values()]
        });

        if ( this.solved ) this.assignAudioOwner();
    }

    private moveDial(id: string, pointerDelta: number) {
        const dial = this.dials.get(id);

        if( !dial ) return;

        dial.move(pointerDelta);
        this.computeMeters();
        this.checkSolved();
        this.io.emit("puzzleState", {
                dial: dial.state,
                meters: [...this.meters.values()],
                solved: this.solved
        });

        if( this.solved ) {
            this.io.emit("puzzleSolved");
            this.assignAudioOwner();
        }
    }

    private computeMeters() {
    // Normalize dial angles to [-1, 1]
    const angles = [...this.dials.values()].map(
        d => d.state.angle / Math.PI
    );

    const ids = [
        "left",
        "center",
        "right"
    ] as const;

    ids.forEach((id, row) => {

        const meter = this.meters.get(id);

        if ( !meter ) return;

        let value = this.bias[row];

        for ( let col = 0; col < 3; col++ ) {
            value += this.relationMatrix[row][col] * angles[col];
        }

        meter.percent = Math.min(1, Math.max(0, value));
    });

    }

    private checkSolved() {
        if ( this.solved ) return;
        const tolerance = 0.05;
        this.solved = [...this.meters.values()].every(m => Math.abs(m.percent - m.target) <= tolerance);
    }

    private assignAudioOwner() {
        if ( !this.solved ) return;
        const current = this.audioOwnerId
            ? this.io.sockets.sockets.get(this.audioOwnerId)
            : undefined;
        
        if ( current ) return;

        const next = [...this.io.sockets.sockets.values()][0];

        if ( !next ) {
            this.audioOwnerId = undefined;
            return;
        }

        this.audioOwnerId = next.id;

        next.emit("startAudio");
    }

    private validateConfig(config: any): boolean {
        const valid = this.getDefaultConfig();
        return false;
    }

    private getDefaultConfig(): puzzleConfig {
        return {
            meterSettings: {
                max: 20,
                min: 1,
                num: 3,
            },
            dialSettings: {
                max: 12,
                min: 1,
                num: 3,
                dials: [
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        }
                    },
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        }
                    },
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        }
                    },
                ],
            },
            relationMatrix: [
                [0.25, 0.10, -0.15],
                [-0.15, 0.25, 0.10],
                [0.10, -0.15, 0.25],
            ],
        }
    }
}

class Dial {

    constructor(public readonly state: DialState) {}

    move(pointerDelta: number) {
        pointerDelta = Math.min(0.5, Math.max(-0.5, pointerDelta));
        let proposed = normalizeAngle(this.state.angle + pointerDelta);
        proposed = this.clamp(proposed);
        this.state.angle = proposed;
    }

    private clamp(angle: number): number {
        const {
            deadZoneLeft,
            deadZoneRight
        } = this.state.options;

        if ( !isAngleBetween(angle, deadZoneLeft, deadZoneRight) ) return angle;

        const left = Math.abs(getShortestDelta(deadZoneLeft, angle));
        const right = Math.abs(getShortestDelta(deadZoneRight, angle));

        return left < right
            ? deadZoneLeft
            : deadZoneRight;
    }
}

function normalizeAngle(angle: number): number {
    angle %= Math.PI * 2;
    angle = (angle + Math.PI * 2) % (Math.PI * 2);

    if (angle > Math.PI) angle -= Math.PI * 2;

    return angle;
}

function getShortestDelta(to: number, from: number): number {
    let delta = (to - from) % (Math.PI * 2);

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    return delta;
}

function isAngleBetween(angle: number, left: number, right: number): boolean {
    angle = normalizeAngle(angle);
    left = normalizeAngle(left);
    right = normalizeAngle(right);

    if (left <= right)
        return angle >= left && angle <= right;

    // interval wraps across ±π

    return angle >= left || angle <= right;
}