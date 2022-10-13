import os from "os";
import pty from "node-pty";
import EventEmitter from "events";
let shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

export default class TerrariaServer extends EventEmitter {
    constructor({ path, file, worldId = 1, maxPlayers = 16, port = 7777, autoForwardPort = true, password = "", motd = "" }) {
        super()

        if (!path) throw new Error('No path provided')
        if (!file) throw new Error('No file provided')

        this.path = path
        this.file = file
        this.worldId = worldId
        this.maxPlayers = maxPlayers
        this.port = port
        this.autoForwardPort = autoForwardPort
        this.password = password
        this.motd = motd
        this.ready = false

        this.on('console', (data) => {
            if (data.trim().startsWith('Server started')) {
                this.ready = true
                this.emit('start')
            }
            if (data.trim().startsWith('Error Logging Enabled.') && this.ready) {
                this.emit('stop')
            }
            if (data.split(' has joined.')[1]) {
                this.emit('join', data.split(' has joined.')[0])
            }
            if (data.split(' has left.')[1]) {
                this.emit('left', data.split(' has left.')[0])
            }
            if (data.startsWith('<') && data.split('>')[1]) {
                const message = data.split('>').splice(1).join('').trim()
                const player = data.split('<')[1].split('>')[0]
                this.emit('message', message, player)
            }
        })

        this.on('start', () => { if (this.motd != "") this.command(`motd ${this.motd}\r`) })
    }
    
    command(command) {
        if (!command) throw new Error('No command provided')
        if (!this.ready) return new Error('The server is not started')

        this.server.write(command + '\r')

        return new Promise((resolve, reject) => {
            const result = []
            let started = false
            this.on('console', (data) => {
                if (data.startsWith(':')) {
                    clearTimeout(timeout)
                    resolve(result.join(' ').replaceAll('', " "))
                }

                if (started) result.push(data)

                if (data.split(command)[1] != undefined) started = true
            })

            const timeout = setTimeout(() => {
                reject('Timeout')
            }, 5000)
        })
    }

    start() {
        this.server = pty.spawn(shell, [], {
            name: 'Terraria',
            cols: 1000,
            rows: 500,
            cwd: process.env.HOME,
            env: process.env
        });

        this.server.write(`cd ${this.path}\r`);
        this.server.write(`${this.file}\r`);

        this.server.write(this.worldId + '\r')
        this.server.write(this.maxPlayers + '\r')
        this.server.write(this.port + '\r')
        this.server.write((this.autoForwardPort == true ? "y" : "n") + '\r')
        this.server.write(this.password + '\r')

        this.server.onData((data) => {
            data.split('\n').forEach(line => { if (line != "") this.emit('console', line) });
        });
    }

    stop() {
        if (!this.ready) throw new Error('The server is not started')
        this.command('exit').catch(() => {})
    }

    say(message) {
        if (!message) throw new Error('No message provided')

        this.command(`say ${message}`)
    }
}