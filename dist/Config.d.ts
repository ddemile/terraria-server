declare type File = `${string}.bat`;
declare type TerrariaVersion = `${number}.${number}.${number}` | `${number}.${number}.${number}.${number}` | `${number}.${number}.${number}.${number}.${number}`;
export interface Config {
    version?: TerrariaVersion;
    path?: string;
    file?: File;
    worldId: number;
    maxPlayers?: number;
    port?: number;
    autoForwardPort?: boolean;
    password?: string;
    motd?: string;
}
export interface DownloadConfig {
    removeOther?: boolean;
    alwaysDownloadCurrent?: boolean;
}
export declare type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
export {};
