import os from "node:os";
import EventEmitter from "node:events";
import { spawn, IPty } from "node-pty";
import { Config, DeepPartial, DownloadConfig } from './Config';
import defaultsDeep from 'lodash.defaultsdeep';
import { download } from "./functions";
import Zip from 'adm-zip';
import { unlink, rm, readdir } from "node:fs/promises";
import { existsSync } from 'node:fs'
const shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

type Player = {
    name: string,
    ip: string
}

export const defaultTerrariaServerConfig: Config = {
    version: '1.4.4.9',
    path: 'server',
    file: 'start-server.bat',
    worldId: 1,
    maxPlayers: 16,
    port: 7777,
    autoForwardPort: true,
    password: "",
    motd: ""
}

export const defaultDownloadConfig: DownloadConfig = {
    removeOther: false,
    alwaysDownloadCurrent: false
}

export class TerrariaServer extends EventEmitter {
    ready: boolean = false
    readyTimestamp: number | null = null
    private events: string[] = []
    private server: IPty

    constructor(public config: DeepPartial<Config> = {}) {
        super()

        if (!config.path && !config.file && !config.version) throw new Error('No version or path provided')
        if (config.path && config.file && config.version) throw new Error('A path and a version were provided a the same time')

        config = defaultsDeep(config, defaultTerrariaServerConfig)
        
        this.on('console', (data: string) => {
            if (data.trim().startsWith('Server started')) {
                this.ready = true;
                this.events.push('start')
                this.emit('start');
            }
            if (data.trim().startsWith('Error Logging Enabled.') && this.ready) {
                this.server.kill();
                this.ready = false;
                this.readyTimestamp = null;
                this.events.push('stop')
                this.emit('stop');
            }
            if (data.split(' has joined.')[1]) {
                this.emit('join', data.split(' has joined.')[0]);
            }
            if (data.split(' has left.')[1]) {
                this.emit('leave', data.split(' has left.')[0]);
            }
            if (/^<[^>]+>./.test(data)) {
                const dataArray = data.split('');
                dataArray.splice(0, data.split('>')[0].length + 1);
                const message = dataArray.join('').trim();
                const player = /<([^>]+)>/.exec(data)[1];
                this.emit('message', message, player);
            }
        })

        this.on('start', () => {
            if (this.config.motd != "") this.command(`motd ${this.config.motd}\r`)
            this.readyTimestamp = Date.now()
        })
    }

    async download(config: DeepPartial<DownloadConfig>) {
        if (!this.config.version) throw new Error('No version provided')

        config = defaultsDeep(config, defaultDownloadConfig)

        if (config.alwaysDownloadCurrent || !existsSync(`${__dirname}/versions/${this.config.version.replaceAll('.', '')}`)) {
            await download(`https://terraria.org/api/download/pc-dedicated-server/terraria-server-${this.config.version.replace(/\./g, '')}.zip`, `${__dirname}/server.zip`).catch(() => { throw new Error('Error during the download') })

            const zip = new Zip(`${__dirname}/server.zip`)

            zip.extractAllTo(`${__dirname}/versions`)

            await unlink(`${__dirname}/server.zip`)
        }

        if (config.removeOther) {
            const folders = await readdir(`${__dirname}/versions`)
            folders.filter(folder => folder != this.config.version.replace(/\./g, '')).forEach(async (folder) => await rm(`${__dirname}/versions/${folder}`, { recursive: true, force: true }))
        }

        this.config.path = `${__dirname}/versions/${this.config.version.replace(/\./g, '')}/Windows/`
    }

    command(command: string) {
        if (!command) throw new Error('No command provided')
        if (!this.ready) return;

        this.server.write(command + '\r')

        return new Promise<string>((resolve, reject) => {
            const result: string[] = []
            let started: boolean = false
            
            const listener = (data: string) => {
                if (data.startsWith(':')) {
                    clearTimeout(timeout)
                    this.removeListener('console', listener)
                    resolve(result.join(' ').replaceAll('', " "))
                }

                if (started) result.push(data)

                if (data.split(command)[1] != undefined) started = true
            }
            this.on('console', listener)
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
            data.split('\n').filter(line => line != "[K\r").forEach(line => { if (line != "") this.emit('console', line) });
        });

        return new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.events.includes('start')) {
                    this.events.splice(this.events.indexOf('start'), 1)
                    clearTimeout(timeout)
                    clearInterval(interval)
                    resolve()
                }
            }, 100)
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'))
            }, 45000)
        })
    }

    stop() {
        if (!this.ready) throw new Error('The server is not started')
        this.command('exit').catch(() => { })
        return new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.events.includes('stop')) {
                    this.events.splice(this.events.indexOf('stop'), 1)
                    clearTimeout(timeout)
                    clearInterval(interval)
                    resolve()
                }
            }, 100)
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'))
            }, 5000)
        })
    }

    async restart() {
        if (!this.ready) throw new Error('The server is not started')
        await this.stop().catch(() => { })
        this.start()
    }

    say(message: string) {
        if (!this.ready) return;

        if (!message) throw new Error('No message provided')

        this.command(`say ${message}`)
    }

    get players() {
        if (!this.ready) return;
        return (async () => {
            return await new Promise<Player[]>(async (resolve, reject) => {
                const response = await this.command('playing')
                const lines = response.startsWith("No players connected.") ? [] : response.split('\r').filter(line => line != '').map(line => line.trim())
                lines.pop()

                resolve(lines.map(line => ({ name: line.split('(')[0].trim(), ip: line.split('(')[1].split(')')[0] })))

                setTimeout(() => {
                    reject(new Error('No response'))
                }, 2000)
            });
        })();
    }

    get uptime() {
        if (!this.ready || !this.readyTimestamp) return null
        return Date.now() - this.readyTimestamp
    }
}