"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerrariaServer = exports.defaultDownloadConfig = exports.defaultTerrariaServerConfig = void 0;
const node_os_1 = __importDefault(require("node:os"));
const node_events_1 = __importDefault(require("node:events"));
const node_pty_1 = require("node-pty");
const lodash_defaultsdeep_1 = __importDefault(require("lodash.defaultsdeep"));
const functions_1 = require("./functions");
const adm_zip_1 = __importDefault(require("adm-zip"));
const promises_1 = require("node:fs/promises");
const node_fs_1 = require("node:fs");
const shell = node_os_1.default.platform() === 'win32' ? 'cmd.exe' : 'bash';
exports.defaultTerrariaServerConfig = {
    version: '1.4.4.9',
    path: 'server',
    file: 'start-server.bat',
    worldId: 1,
    maxPlayers: 16,
    port: 7777,
    autoForwardPort: true,
    password: "",
    motd: ""
};
exports.defaultDownloadConfig = {
    removeOther: false,
    alwaysDownloadCurrent: false
};
class TerrariaServer extends node_events_1.default {
    config;
    ready = false;
    readyTimestamp = null;
    events = [];
    server;
    constructor(config = {}) {
        super();
        this.config = config;
        if (!config.path && !config.file && !config.version)
            throw new Error('No version or path provided');
        if (config.path && config.file && config.version)
            throw new Error('A path and a version were provided a the same time');
        config = (0, lodash_defaultsdeep_1.default)(config, exports.defaultTerrariaServerConfig);
        this.on('console', (data) => {
            if (data.trim().startsWith('Server started')) {
                this.ready = true;
                this.events.push('start');
                this.emit('start');
            }
            if (data.trim().startsWith('Error Logging Enabled.') && this.ready) {
                this.server.kill();
                this.ready = false;
                this.readyTimestamp = null;
                this.events.push('stop');
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
        });
        this.on('start', () => {
            if (this.config.motd != "")
                this.command(`motd ${this.config.motd}\r`);
            this.readyTimestamp = Date.now();
        });
    }
    async download(config) {
        if (!this.config.version)
            throw new Error('No version provided');
        config = (0, lodash_defaultsdeep_1.default)(config, exports.defaultDownloadConfig);
        if (config.alwaysDownloadCurrent || !(0, node_fs_1.existsSync)(`${__dirname}/versions/${this.config.version.replaceAll('.', '')}`)) {
            await (0, functions_1.download)(`https://terraria.org/api/download/pc-dedicated-server/terraria-server-${this.config.version.replace(/\./g, '')}.zip`, `${__dirname}/server.zip`).catch(() => { throw new Error('Error during the download'); });
            const zip = new adm_zip_1.default(`${__dirname}/server.zip`);
            zip.extractAllTo(`${__dirname}/versions`);
            await (0, promises_1.unlink)(`${__dirname}/server.zip`);
        }
        if (config.removeOther) {
            const folders = await (0, promises_1.readdir)(`${__dirname}/versions`);
            folders.filter(folder => folder != this.config.version.replace(/\./g, '')).forEach(async (folder) => await (0, promises_1.rm)(`${__dirname}/versions/${folder}`, { recursive: true, force: true }));
        }
        this.config.path = `${__dirname}/versions/${this.config.version.replace(/\./g, '')}/Windows/`;
    }
    command(command) {
        if (!command)
            throw new Error('No command provided');
        if (!this.ready)
            return;
        this.server.write(command + '\r');
        return new Promise((resolve, reject) => {
            const result = [];
            let started = false;
            const listener = (data) => {
                if (data.startsWith(':')) {
                    clearTimeout(timeout);
                    this.removeListener('console', listener);
                    resolve(result.join(' ').replaceAll('', " "));
                }
                if (started)
                    result.push(data);
                if (data.split(command)[1] != undefined)
                    started = true;
            };
            this.on('console', listener);
            const timeout = setTimeout(() => {
                if (this.server)
                    reject(new Error('Timeout'));
            }, 5000);
        });
    }
    start() {
        this.server = (0, node_pty_1.spawn)(shell, [], {
            name: 'Terraria',
            cols: 1000,
            rows: 500,
            cwd: process.env.HOME,
            env: process.env
        });
        this.server.write(`cd ${this.config.path}\r`);
        this.server.write(`${this.config.file}\r`);
        this.server.write(this.config.worldId + '\r');
        this.server.write(this.config.maxPlayers + '\r');
        this.server.write(this.config.port + '\r');
        this.server.write((this.config.autoForwardPort == true ? "y" : "n") + '\r');
        this.server.write(this.config.password + '\r');
        this.server.onData((data) => {
            data.split('\n').filter(line => line != "[K\r").forEach(line => { if (line != "")
                this.emit('console', line); });
        });
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.events.includes('start')) {
                    this.events.splice(this.events.indexOf('start'), 1);
                    clearTimeout(timeout);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'));
            }, 45000);
        });
    }
    stop() {
        if (!this.ready)
            throw new Error('The server is not started');
        this.command('exit').catch(() => { });
        return new Promise((resolve, reject) => {
            const interval = setInterval(() => {
                if (this.events.includes('stop')) {
                    this.events.splice(this.events.indexOf('stop'), 1);
                    clearTimeout(timeout);
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'));
            }, 5000);
        });
    }
    async restart() {
        if (!this.ready)
            throw new Error('The server is not started');
        await this.stop().catch(() => { });
        this.start();
    }
    say(message) {
        if (!this.ready)
            return;
        if (!message)
            throw new Error('No message provided');
        this.command(`say ${message}`);
    }
    get players() {
        if (!this.ready)
            return;
        return (async () => {
            return await new Promise(async (resolve, reject) => {
                const response = await this.command('playing');
                const lines = response.startsWith("No players connected.") ? [] : response.split('\r').filter(line => line != '').map(line => line.trim());
                lines.pop();
                resolve(lines.map(line => ({ name: line.split('(')[0].trim(), ip: line.split('(')[1].split(')')[0] })));
                setTimeout(() => {
                    reject(new Error('No response'));
                }, 2000);
            });
        })();
    }
    get uptime() {
        if (!this.ready || !this.readyTimestamp)
            return null;
        return Date.now() - this.readyTimestamp;
    }
}
exports.TerrariaServer = TerrariaServer;
