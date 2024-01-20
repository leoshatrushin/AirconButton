import { config } from 'dotenv';
import net from 'net';
import tls from 'tls';

config();

const HOST = process.env.HOST;
const PORT = Number(process.env.PORT);
const API_KEY = process.env.API_KEY;

let client: tls.TLSSocket | net.Socket;
let connectedEvent = 'connect';
if (process.env.mode === 'production') {
    client = tls.connect(Number(PORT), HOST);
    connectedEvent = 'secureConnect';
} else {
    client = new net.Socket().connect(Number(PORT), HOST);
}

client.on(connectedEvent, () => {
    client.write(API_KEY);
});
