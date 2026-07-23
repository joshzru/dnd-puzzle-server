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

interface jsonConfig {
    meterSettings: {
        max: number;
        min: number;
        meters: {
            percent: number;
            target: number;
        }[]
    };
    dialSettings: {
        max: number;
        min: number;
        dials: {
            angle: number;
            options: DialOptions;
        }[]
    };
    relationMatrix: number[][];
}

export class DialPuzzle {

    readonly config: {
        maxDials: number;
        minDials: number;
        maxMeters: number;
        minMeters: number;
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
    nextId = 0;

    private audioOwnerId?: string

    constructor(readonly io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) {
        const validConfig = this.parseConfig(puzzleConfig);
        this.config = {
            maxDials: validConfig.dialSettings.max,
            minDials: validConfig.dialSettings.min,
            maxMeters: validConfig.meterSettings.max,
            minMeters: validConfig.meterSettings.min,
        };

        for ( const dial of validConfig.dialSettings.dials ) {
            const stringId = `dial-${this.nextId++}`;
            this.createDial(stringId, dial.angle, dial.options);
        }

        for ( const meter of validConfig.meterSettings.meters ) {
            const stringId = `meter-${this.nextId++}`;
            this.createMeter({
                id: stringId,
                percent: meter.percent,
                target: meter.target,
            })
        }
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

    const ids = [...this.meters.values()].map(
        m => m.id
    )

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

    private parseConfig(config: any): jsonConfig {
        // Get base valid config
        const valid = this.getDefaultConfig();
        return valid;
    }

    private getDefaultConfig(): jsonConfig {
        return {
            meterSettings: {
                max: 20,
                min: 1,
                meters: [
                    {
                        percent: 0,
                        target: 0.28,
                    },
                    {
                        percent: 0,
                        target: 0.46,
                    },
                    {
                        percent: 0,
                        target: 0.65,
                    },
                ],
            },
            dialSettings: {
                max: 12,
                min: 1,
                dials: [
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        },
                    },
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        },
                    },
                    {
                        angle: 0,
                        options: {
                            deadZoneLeft: 2.35619449,
                            deadZoneRight: -2.35619449,
                        },
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