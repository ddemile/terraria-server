import os from "os";
import { spawn, IPty } from "node-pty";
import EventEmitter from "events";
let shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

type File = `${string}.bat`

type Player = {
    name: string,
    ip: string
}

export const defaultTerrariaServerConfig: Config = {
    path: 'Server',
    file: 'start-server.bat',
    worldId: 1,
    maxPlayers: 16,
    port: 7777,
    autoForwardPort: true,
    password: "",
    motd: ""
}

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

export class TerrariaServer extends EventEmitter {
    ready: boolean
    readyTimestamp: number | null
    private server: IPty

    constructor(public config: Config) {
        super()

        if (!config.path) throw new Error('No path provided')
        if (!config.file) throw new Error('No file provided')

        this.config = {
            path: config.path || defaultTerrariaServerConfig.path,
            file: config.file || defaultTerrariaServerConfig.file,
            worldId: config.worldId || defaultTerrariaServerConfig.worldId,
            maxPlayers: config.maxPlayers || defaultTerrariaServerConfig.maxPlayers,
            port: config.port || defaultTerrariaServerConfig.port,
            autoForwardPort: config.autoForwardPort || defaultTerrariaServerConfig.autoForwardPort,
            password: config.password || defaultTerrariaServerConfig.password,
            motd: config.motd || defaultTerrariaServerConfig.motd
        }
        this.ready = false
        this.readyTimestamp = null
        this.setMaxListeners(12)

        this.on('console', (data) => {
            if (data.trim().startsWith('Server started')) {
                this.ready = true;
                this.emit('start');
            }
            if (data.trim().startsWith('Error Logging Enabled.') && this.ready) {
                this.emit('stop');
            }
            if (data.split(' has joined.')[1]) {
                this.emit('join', data.split(' has joined.')[0]);
            }
            if (data.split(' has left.')[1]) {
                this.emit('leave', data.split(' has left.')[0]);
            }
            if (data.startsWith('<') && data.split('>')[1]) {
                const dataArray = data.split('');
                dataArray.splice(0, data.split('>')[0].length + 1);
                const message = dataArray.join('').trim();
                const player = data.split('<')[1].split('>')[0];
                this.emit('message', message, player);
            }
        })

        this.on('start', () => {
            if (this.config.motd != "") this.command(`motd ${this.config.motd}\r`)
            this.readyTimestamp = Date.now()
        })
    }

    command(command: string) {
        if (!command) throw new Error('No command provided')
        if (!this.ready) return;

        this.server.write(command + '\r')

        return new Promise<string>((resolve, reject) => {
            const result: string[] = []
            let started = false
            this.on('console', (data: string) => {
                if (data.startsWith(':')) {
                    clearTimeout(timeout)
                    resolve(result.join(' ').replaceAll('', " "))
                }

                if (started) result.push(data)

                if (data.split(command)[1] != undefined) started = true
            })

            const timeout = setTimeout(() => {
                if (this.server) reject(new Error('Timeout'))
            }, 5000)
        })
    }

    start() {
        this.server = spawn(shell, [], {
            name: 'Terraria',
            cols: 1000,
            rows: 500,
            cwd: process.env.HOME,
            env: process.env
        });

        this.server.write(`cd ${this.config.path}\r`);
        this.server.write(`${this.config.file}\r`);

        this.server.write(this.config.worldId + '\r')
        this.server.write(this.config.maxPlayers + '\r')
        this.server.write(this.config.port + '\r')
        this.server.write((this.config.autoForwardPort == true ? "y" : "n") + '\r')
        this.server.write(this.config.password + '\r')

        this.server.onData((data) => {
            data.split('\n').forEach(line => { if (line != "") this.emit('console', line) });
        });
    }

    stop() {
        if (!this.ready) throw new Error('The server is not started')
        this.command('exit').catch(() => { })
    }

    say(message: string) {
        if (!message) throw new Error('No message provided')

        this.command(`say ${message}`)
    }

    get players() {
        if (!this.ready) return;
        return (async () => {
            return await new Promise<Player[]>(async (resolve, reject) => {
                const reponse = await this.command('playing')
                let lines = reponse.startsWith("No players connected.") ? [] : reponse.split('\r').filter(line => line != '').map(line => line.trim())
                lines.pop()

                resolve(lines.map(line => ({ name: line.split('(')[0].trim(), ip: line.split('(')[1].split(')')[0] })))

                setTimeout(() => {
                    reject(new Error('No response'))
                }, 2000)
            });
        })();
    }

    get uptime() {
        if (!this.ready) return null
        return Date.now() - (this.readyTimestamp as number)
    }
}