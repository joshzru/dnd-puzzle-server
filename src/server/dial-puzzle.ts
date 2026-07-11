import type { Server, Socket } from "socket.io";

import type {ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    DialId,
    DialState,
    MeterState,
    MeterId
} from "../SocketTypes.js";

export class DialPuzzle {

    readonly dials = new Map<DialId, Dial>();
    readonly meters = new Map<MeterId, MeterState>();
    readonly relationMatrix = [
        [1, 2, -1],
        [2, -1, 1],
        [-1, 1, 2]
    ];

    solved = false;

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

        this.meters.set("left",{
            id: "left",
            percent: 0.2,
            target: 0.5,
        });

        this.meters.set("center",{
            id: "center",
            percent: 0.2,
            target: 0.5,
        });

        this.meters.set("right",{
            id: "right",
            percent: 0.2,
            target: 0.5,
        });
    }

    connect(socket: Socket<ClientToServerEvents, ServerToClientEvents>) {
        socket.on("dialMove", (id, pointerDelta)=>{
                this.moveDial(id, pointerDelta);
            });
        
        socket.emit("puzzleInit",{
            dials: [...this.dials.values()].map(d=>d.state),
            meters: [...this.meters.values()]
        });
    }

    private moveDial(id: DialId, pointerDelta: number) {
        const dial = this.dials.get(id);

        if(!dial) return;

        dial.move(pointerDelta);
        this.computeMeters();
        this.checkSolved();
        this.io.emit("puzzleState", {
                dial: dial.state,
                meters: [...this.meters.values()],
                solved: this.solved
            });

        if(this.solved) this.io.emit("puzzleSolved");
    }

    private computeMeters() {

        const angles = [...this.dials.values()].map(d=>d.state.angle);

        const percents =
            this.relationMatrix.map(row => {
                    let value = 0;
                    for( let i = 0; i < 3 ; i++ )
                        value += row[i] * angles[i];

                    return value;
                }
            );

        const ids = [
            "left",
            "center",
            "right"
        ] as const;

        ids.forEach((id,index) => {
                const meter = this.meters.get(id);
                if ( !meter ) return;
                meter.percent = Math.min(1, Math.max(0, percents[index]));
            }
        );
    }

    private checkSolved() {
        this.solved = [...this.meters.values()].every(m => Math.abs(m.percent - m.target) < 0.01);
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

        if ( !isAngleBetween(angle, deadZoneLeft, deadZoneRight )) return angle;

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