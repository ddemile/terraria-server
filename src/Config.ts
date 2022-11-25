type File = `${string}.bat`

export interface Config {
    path: string
    file: File
    worldId: number
    maxPlayers?: number
    port?: number
    autoForwardPort?: boolean
    password?: string
    motd?: string
}

export type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};