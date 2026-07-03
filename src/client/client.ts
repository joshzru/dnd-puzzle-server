import { request } from 'express';
import type { ServerToClientEvents, ClientToServerEvents } from '../SocketTypes.js';
import { io, Socket } from 'socket.io-client';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

// Testing dial rotation, this will be given to us from the server in the final
// version
const state: ClientState = {
    meters: {
        left: {
            element: document.querySelector<SVGElement>('#meter-left'),
            solutionPercent: 0.5,
            currentPercent: 0,
            targetPercent: 0,
        },
        center: {
            element: document.querySelector<SVGElement>('#meter-center'),
            solutionPercent: 0.5,
            currentPercent: 0,
            targetPercent: 0,
        },
        right: {
            element: document.querySelector<SVGElement>('#meter-right'),
            solutionPercent: 0.5,
            currentPercent: 0,
            targetPercent: 0,
        },
    },
    dials: {
        left: {
            element: document.querySelector<SVGElement>('#dial-left'),
            pointerAngle: 0,
            referenceAngle: -Math.PI / 2,
            clientDelta: 0,
            currentAngle: -Math.PI / 2,
            getTargetAngle: () => normalizeAngle(state.dials.left.referenceAngle + state.dials.left.clientDelta),
            dragging: false,
        },
        top: {
            element: document.querySelector<SVGElement>('#dial-top'),
            pointerAngle: 0,
            referenceAngle: -Math.PI / 2,
            clientDelta: 0,
            currentAngle: -Math.PI / 2,
            getTargetAngle: () => normalizeAngle(state.dials.top.referenceAngle + state.dials.top.clientDelta),
            dragging: false,
        },
        right: {
            element: document.querySelector<SVGElement>('#dial-right'),
            pointerAngle: 0,
            referenceAngle: -Math.PI / 2,
            clientDelta: 0,
            currentAngle: -Math.PI / 2,
            getTargetAngle: () => normalizeAngle(state.dials.right.referenceAngle + state.dials.right.clientDelta),
            dragging: false,
        }
    },
    relationMatrix: [
        [1, 2, -1],
        [2, -1, 1],
        [-1, 1, 2],
    ],
}

const dialList = [
    state.dials.left,
    state.dials.top,
    state.dials.right,
]

for ( const dial of dialList ) {
    dial.element?.addEventListener('pointerdown', function (e) {
        if ( dial.dragging ) return;
        dial.dragging = true;
        const rect = this.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        dial.pointerAngle = getAngle(cx, cy, e.clientX, e.clientY);
    })
}

window.addEventListener('pointerup', function (e) {
    for ( const dial of dialList ) {
        if ( !dial.dragging ) continue;
        dial.referenceAngle = normalizeAngle(dial.referenceAngle + dial.clientDelta);
        dial.clientDelta = 0;
        dial.dragging = false;
    }
})

window.addEventListener('pointermove', function (e) {
    for ( const dial of dialList) {
        if ( !dial.dragging ) continue;
        const rect = dial.element?.getBoundingClientRect();
        if ( typeof rect === 'undefined' ) continue;

        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const newAngle = getAngle(cx, cy, e.clientX, e.clientY);
        const delta = newAngle - dial.pointerAngle;
        // For testing, replace with emitting delta to server via socket.
        dial.clientDelta = delta;
        //const newTarget = dial.getTargetAngle();
        //const nearestDeadzone = getNearestDeadzone(newTarget);
        //if ( newTarget === nearestDeadzone ) continue;
        // target = current + delta -> delta = target - current
        //dial.clientDelta = nearestDeadzone - dial.currentAngle;
    }
})

function animateDials() {
    for ( const dial of dialList ) {
        animateDial(dial);
    }
    requestAnimationFrame(animateDials);
}

function animateDial(dial: ClientDialState) {
    let velocity = getShortestDelta(dial.getTargetAngle(), dial.currentAngle);
    if ( Math.abs(velocity) <= 1e-4 ) {
        dial.currentAngle = dial.getTargetAngle();
    }
    else {
        velocity *= 0.1;
        dial.currentAngle += velocity;
    }
    if ( dial.element !== null ) dial.element.style.transform = `rotate(${dial.currentAngle}rad)`;
}

function getShortestDelta(to: number, from: number) {
    let delta = (to - from) % (2 * Math.PI);
    if ( delta > Math.PI ) delta -= (2 * Math.PI);
    if ( delta < -Math.PI ) delta += (2 * Math.PI);
    return delta;
}

function normalizeAngle(angle: number) {
    angle %= (2 * Math.PI);
    angle = (angle + (2 * Math.PI)) % (2 * Math.PI);
    if (angle > Math.PI) angle -= 2 * Math.PI;
    return angle;
}

requestAnimationFrame(animateDials);

function getAngle(cx: number, cy: number, px: number, py: number) {
    return Math.atan2(py-cy, px-cx);
}

function getNearestDeadzone(angle: number) {
    const leftDeadzone = Math.PI * (3/4)
    const rightDeadzone = Math.PI * (1/4)
    if ( angle <= rightDeadzone || angle >= leftDeadzone ) return angle;
    if ( Math.abs(angle - rightDeadzone) <= Math.abs(angle - leftDeadzone) ) return rightDeadzone;
    return leftDeadzone;
}

interface ClientState {
    meters: ClientMetersState;
    dials: ClientDialsState;
    relationMatrix: number[][];
}

interface ClientMetersState {
    left: ClientMeterState;
    center: ClientMeterState;
    right: ClientMeterState;
}

interface ClientMeterState {
    element: SVGElement | null;
    solutionPercent: number;
    currentPercent: number;
    targetPercent: number;
}


interface ClientDialsState {
    left: ClientDialState;
    top: ClientDialState;
    right: ClientDialState;
}

interface ClientDialState {
    element: SVGElement | null;
    pointerAngle: number;
    referenceAngle: number;
    clientDelta: number;
    currentAngle: number;
    getTargetAngle: () => number;
    dragging: boolean
}
