/// <reference types="node" />
import pty from "node-pty";
import EventEmitter from "events";
import Player from './Player';
export default class TerrariaServer extends EventEmitter {
    path: string;
    file: string;
    worldId: number;
    maxPlayers: number;
    port: number;
    autoForwardPort: boolean;
    password: string;
    motd: string;
    ready: boolean;
    readyTimestamp: number | null;
    server: pty.IPty;
    constructor({ path, file, worldId, maxPlayers, port, autoForwardPort, password, motd }: {
        path: any;
        file: any;
        worldId?: number;
        maxPlayers?: number;
        port?: number;
        autoForwardPort?: boolean;
        password?: string;
        motd?: string;
    });
    command(command: string): Promise<string>;
    start(): void;
    stop(): void;
    say(message: string): void;
    get players(): Promise<Player[]>;
    get uptime(): number;
}
