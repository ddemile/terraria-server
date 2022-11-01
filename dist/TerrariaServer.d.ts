/// <reference types="node" />
import EventEmitter from "events";
import { Config, DeepPartial } from './Config';
declare type Player = {
    name: string;
    ip: string;
};
export declare const defaultTerrariaServerConfig: Config;
export declare class TerrariaServer extends EventEmitter {
    config: DeepPartial<Config>;
    ready: boolean;
    readyTimestamp: number | null;
    private events;
    private server;
    constructor(config?: DeepPartial<Config>);
    command(command: string): Promise<string>;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    say(message: string): void;
    get players(): Promise<Player[]>;
    get uptime(): number;
}
export {};
