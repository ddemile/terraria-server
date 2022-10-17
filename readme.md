# terraria-server
## Installation
Please make sure you have [Python](https://www.python.org) and [Visual Studio](https://visualstudio.microsoft.com/) with C++ development

Install a Terraria server :
1. Download a Terraria server ([Server for 1.4.4.5](https://terraria.org/api/download/pc-dedicated-server/terraria-server-1445.zip))
2. Extract the zip
3. Go to 1445
4. Take the content of Windows and drop it into a folder in your project

## Class: TerrariaServer
TerrariaServer is a class that manages the terraria server itself, captures the process STDOUT

```js
import { TerrariaServer } from 'terraria-server';

// Or

const { TerrariaServer } = require('terraria-server')
```

Config: [Config](#interface-config)

```js
const server = new TerrariaServer({
    path: "./Server",
    file: "start-server.bat",
    worldId: 1,
    maxPlayers: 16,
    port: 7777,
    autoForwardPort: true,
    password: "",
    motd: ""
})

server.on('start', () => console.log('Server Started'))
```

### Methods
`server.start(): Promise<void>`

`server.stop(): Promise<void>`

`server.restart(): Promise<void>`

`server.command(command: string): Promise<string>`

`server.say(message: string): void`

### Events
`server.on('start', () => void)`

`server.on('stop', () => void)`

`server.on('message', (message: string, player: string) => void)`

`server.on('console', (data: string) => void)`

`server.on('join', (player: string) => void)`

`server.on('leave', (player: string) => void)`

### Properties
`server.config: Config`

`server.ready: boolean`

`server.readyTimestamp: number | null`

`server.uptime: number | null`

`server.players: Promise<Player[]>`

## Interface: `Config`
The config object is used to configure the Terraria server

```js
const config = {
    path: string,
    file: string,
    worldId: number,
    maxPlayers: number,
    port: number,
    autoForwardPort: boolean,
    password: string,
    motd: string
}

new TerrariaServer(config)
```