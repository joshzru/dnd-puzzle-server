import type { ServerToClientEvents, ClientToServerEvents } from '../SocketTypes.js';
import { io, Socket } from 'socket.io-client';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const EPSILON = 1e-4;

interface DialOptions {
    deadZoneLeft: number;
    deadZoneRight: number;
}

class Meter {
    readonly element: SVGElement | null;

    solutionPercent = 0.5;
    currentPercent = 0;
    targetPercent = 0;

    constructor(selector: string) {
        this.element = document.querySelector(selector);
    }

    update() {
        const velocity = (this.targetPercent - this.currentPercent) * 0.1;

        if (Math.abs(velocity) < EPSILON)
            this.currentPercent = this.targetPercent;
        else
            this.currentPercent += velocity;

        // Update SVG here
    }
}

class Dial {

    readonly element: SVGElement | null;

    currentAngle = 0;
    
    targetAngle = 0;

    lastPointerAngle = 0;

    dragging = false;

    deadZoneLeft: number;

    deadZoneRight: number;

    damping = 0.1;

    get atLeftDeadZone() {
        return Math.abs(this.targetAngle - this.deadZoneLeft) < EPSILON;
    }

    get atRightDeadZone() {
        return Math.abs(this.targetAngle - this.deadZoneRight) < EPSILON;
    }

    constructor(selector: string, options: DialOptions) {
        this.element = document.querySelector(selector);
        this.deadZoneLeft = normalizeAngle(options.deadZoneLeft);
        this.deadZoneRight = normalizeAngle(options.deadZoneRight);
        this.installListeners();
    }

    update() {
        let velocity = getShortestDelta(this.targetAngle, this.currentAngle);

        if ( Math.abs(velocity) < EPSILON )
            this.currentAngle = this.targetAngle;
        else
            this.currentAngle += velocity * this.damping;

        this.element?.style.setProperty(
            "transform",
            `rotate(${this.currentAngle}rad)`
        );
    }

    private clampToDeadZone(angle: number): number {
        if ( !isAngleBetween(angle, this.deadZoneLeft, this.deadZoneRight) )
            return angle;

        const leftDist = Math.abs(getShortestDelta(this.deadZoneLeft, angle));
        const rightDist = Math.abs(getShortestDelta(this.deadZoneRight, angle));

        return leftDist < rightDist
            ? this.deadZoneLeft
            : this.deadZoneRight;
    }

    private installListeners() {

        this.element?.addEventListener("pointerdown", e => {

            if ( this.dragging )
                return;

            this.dragging = true;

            const rect = this.element?.getBoundingClientRect();

            if ( !rect ) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            this.lastPointerAngle = getAngle(
                cx,
                cy,
                e.clientX,
                e.clientY
            );
        });

        window.addEventListener("pointermove", e => {
            if ( !this.dragging ) return;

            const rect = this.element?.getBoundingClientRect();

            if ( !rect ) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const newAngle = getAngle(cx, cy, e.clientX, e.clientY);
            let delta =  getShortestDelta(newAngle, this.lastPointerAngle);

            if (this.atLeftDeadZone && delta > 0) delta = 0;
            if (this.atRightDeadZone && delta < 0) delta = 0;

            const proposed = normalizeAngle(this.targetAngle + delta);
            this.targetAngle = this.clampToDeadZone(proposed);
            this.lastPointerAngle = newAngle;
        });

        window.addEventListener("pointerup", () => {
            if ( !this.dragging ) return;
            this.dragging = false;
        });
    }
}

class ClientState {

    readonly dials = {
        left: new Dial("#dial-left", {
            deadZoneLeft: 3 * Math.PI / 4,
            deadZoneRight: -3 * Math.PI / 4
        }),
        top: new Dial("#dial-top", {
            deadZoneLeft: 3 * Math.PI / 4,
            deadZoneRight: -3 * Math.PI / 4
        }),
        right: new Dial("#dial-right", {
            deadZoneLeft: 3 * Math.PI / 4,
            deadZoneRight: -3 * Math.PI / 4
        })
    };

    readonly meters = {
        left: new Meter("#meter-left"),
        center: new Meter("#meter-center"),
        right: new Meter("#meter-right")
    };

    relationMatrix = [
        [1, 2, -1],
        [2, -1, 1],
        [-1, 1, 2]
    ];

    update() {
        Object.values(this.dials).forEach(d => d.update());
        Object.values(this.meters).forEach(m => m.update());
        requestAnimationFrame(() => this.update());
    }
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

const state = new ClientState();
state.update();