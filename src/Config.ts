type File = `${string}.bat` 
type TerrariaVersion = `${number}.${number}.${number}` | `${number}.${number}.${number}.${number}`

export interface Config {
    version?: TerrariaVersion
    path?: string
    file?: File
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