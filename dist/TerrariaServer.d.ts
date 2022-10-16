/// <reference types="node" />
import pty from "node-pty";
import EventEmitter from "events";
declare type File = `${string}.bat`;
interface Player {
    name: string;
    ip: string;
}
export declare const defaultTerrariaServerConfig: Config;
export interface Config {
    path: string;
    file: File;
    worldId: number;
    maxPlayers?: number;
    port?: number;
    autoForwardPort?: boolean;
    password?: string;
    motd?: string;
}
export declare class TerrariaServer extends EventEmitter {
    config: Config;
    ready: boolean;
    readyTimestamp: number | null;
    server: pty.IPty;
    constructor(config: Config);
    command(command: string): Promise<string>;
    start(): void;
    stop(): void;
    say(message: string): void;
    get players(): Promise<Player[]>;
    get uptime(): number;
}
export {};