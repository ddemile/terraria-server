/// <reference types="node" />
import EventEmitter from "events";
declare type File = `${string}.bat`;
declare type Player = {
    name: string;
    ip: string;
};
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
    private events;
    private server;
    constructor(config: Config);
    command(command: string): Promise<string>;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    say(message: string): void;
    get players(): Promise<Player[]>;
    get uptime(): number;
}
export {};
