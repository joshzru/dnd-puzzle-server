import { type ServerToClientEvents, type ClientToServerEvents, type DialId, MeterId, PuzzleInitState, DialState, MeterState } from '../SocketTypes.js';
import { io, Socket } from 'socket.io-client';

const EPSILON = 1e-4;
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

interface RGB {
    r: number;
    g: number;
    b: number;
}

class Meter {
    readonly element: SVGElement | null;
    readonly volume: SVGRectElement | null;

    readonly minHeight = 5;
    readonly maxHeight = 290;
    readonly bottomY = 295;

    currentPercent: number;
    targetPercent: number;
    solutionPercent: number;
    damping = 0.1;

    green: RGB = {
        r: 166,
        g: 209,
        b: 137,
    };
    red: RGB = {
        r: 231,
        g: 130,
        b: 132,
    }

    constructor(m: MeterState) {
        this.element = document.querySelector(`#meter-${m.id}`);
        this.volume = this.element?.querySelector(".meter-volume") ?? null;
        this.currentPercent = m.percent;
        this.targetPercent = m.percent;
        this.solutionPercent = m.target;
    }

    update() {
        let velocity = (this.targetPercent - this.currentPercent);
        velocity *= this.damping;

        if (Math.abs(velocity) < EPSILON)
            this.currentPercent = this.targetPercent;
        else
            this.currentPercent += velocity;

        const height = lerp(this.minHeight, this.maxHeight, this.currentPercent);
        const y = this.bottomY - height;

        const difference = Math.abs(this.currentPercent - this.solutionPercent);
        const t = 1 - clamp(0, 1, difference / 0.5);
        const color = rgbLerp(this.red, this.green, t);

        this.volume?.setAttribute("height", `${height}`);
        this.volume?.setAttribute("y", `${y}`);
        this.volume?.setAttribute("fill", `rgb(${color.r},${color.g},${color.b})`);
    }
}

class Dial {
    readonly id: DialId;

    readonly element: SVGElement | null;

    currentAngle: number;
    targetAngle: number;
    lastPointerAngle: number;
    deadZoneLeft: number;
    deadZoneRight: number;
    
    dragging = false;

    damping = 0.1;

    get atLeftDeadZone() {
        return Math.abs(this.targetAngle - this.deadZoneLeft) < EPSILON;
    }

    get atRightDeadZone() {
        return Math.abs(this.targetAngle - this.deadZoneRight) < EPSILON;
    }

    constructor(dial: DialState) {
        this.element = document.querySelector(`#dial-${dial.id}`);
        this.id = dial.id;
        this.currentAngle = dial.angle;
        this.targetAngle = dial.angle;
        this.lastPointerAngle = dial.angle;
        this.deadZoneLeft = normalizeAngle(dial.options.deadZoneLeft);
        this.deadZoneRight = normalizeAngle(dial.options.deadZoneRight);
        this.installListeners(socket);
    }

    update() {
        let velocity = getShortestDelta(this.targetAngle, this.currentAngle);

        if ( Math.abs(velocity) < EPSILON )
            this.currentAngle = this.targetAngle;
        else
            this.currentAngle += normalizeAngle(velocity * this.damping);

        this.element?.style.setProperty(
            "transform",
            `rotate(${this.currentAngle}rad)`
        );
    }

    private installListeners(socket: Socket) {

        this.element?.addEventListener("pointerdown", e => {

            if ( this.dragging ) return;

            this.dragging = true;

            const rect = this.element?.getBoundingClientRect();

            if ( !rect ) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            this.lastPointerAngle = getAngle(cx, cy, e.clientX, e.clientY);
        });

        window.addEventListener("pointermove", e => {
            if ( !this.dragging ) return;

            const rect = this.element?.getBoundingClientRect();

            if ( !rect ) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const newAngle = getAngle(cx, cy, e.clientX, e.clientY);
            const delta =  getShortestDelta(newAngle, this.lastPointerAngle);
            this.lastPointerAngle = newAngle;

            socket.emit("dialMove", this.id, delta);
        });

        window.addEventListener("pointerup", () => {
            if ( !this.dragging ) return;
            this.dragging = false;
        });
    }
}

class ClientState {

    dials = new Map<DialId, Dial>();
    meters = new Map<MeterId, Meter>();

    constructor() {
        socket.on("puzzleInit", state => clientState.initialize(state));
        socket.on("puzzleSolved", () => {
            console.log("solved!");
        })
        socket.on("puzzleState", state => {
            const dial = this.dials.get(state.dial.id);
            if ( !dial ) return;
            dial.targetAngle = state.dial.angle;
            
            for ( const meter of state.meters.values()) {
                const m = this.meters.get(meter.id);
                if ( !m ) return;
                m.targetPercent = meter.percent;
            }
        })
    }

    initialize(state: PuzzleInitState) {
        state.dials.forEach(d => {
            this.dials.set(d.id, new Dial(d));
        })

        state.meters.forEach(m => {
            this.meters.set(m.id, new Meter(m));
        })

        this.update();
    }

    update() {
        for ( const dial of this.dials.values() )
            dial.update();

        for ( const meter of this.meters.values() )
            meter.update();

        requestAnimationFrame(() => this.update());
    }
}

function clamp(min: number, max: number, value: number): number {
    return Math.min(Math.max(value, min), max);
}

function lerp(min: number, max: number, t: number): number {
    return min + (max - min) * clamp(0, 1, t);
}

function rgbLerp(min: RGB, max: RGB, t: number): RGB {
    t = clamp(0, 1, t);
    return {
        r: lerp(min.r, max.r, t),
        g: lerp(min.g, max.g, t),
        b: lerp(min.b, max.b, t),
    }
}

function getShortestDelta(to: number, from: number): number {
    let delta = (to - from) % (2 * Math.PI);
    if ( delta > Math.PI ) delta -= (2 * Math.PI);
    if ( delta < -Math.PI ) delta += (2 * Math.PI);
    return delta;
}

function normalizeAngle(angle: number): number {
    angle %= (2 * Math.PI);
    angle = (angle + (2 * Math.PI)) % (2 * Math.PI);
    if (angle > Math.PI) angle -= 2 * Math.PI;
    return angle;
}

function getAngle(cx: number, cy: number, px: number, py: number): number {
    return Math.atan2(py-cy, px-cx);
}

const clientState = new ClientState();