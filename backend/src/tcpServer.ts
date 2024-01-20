import net from 'net';
import { StreamReader } from './utils.js';
import { state } from './state.js';
import { EventEmitter } from 'node:events';

const SENSOR_TIMEOUT = 500;
const SENSOR_SUCCESS = 1;

const SENSOR_PORT = process.env.SENSOR_PORT;
const SENSOR_API_KEY = process.env.SENSOR_API_KEY;
const decoder = new TextDecoder();
const tcpEvent = new EventEmitter();

let currentSocket: net.Socket = null;
const tcpServer = net.createServer(socket => {
    let sensorAuthenticated = false;
    let streamReader = new StreamReader();

    socket.on('data', async data => {
        // concatenate data to buffer
        streamReader.readInto(data);
        console.log('data');

        // handle authentication
        if (!sensorAuthenticated) {
            // wait for api key
            const apiKeyBuf = streamReader.readBytes(SENSOR_API_KEY.length);
            if (!apiKeyBuf) return;

            // compare api key
            if (decoder.decode(apiKeyBuf) == SENSOR_API_KEY) {
                sensorAuthenticated = true;
                if (currentSocket) currentSocket.destroy();
                currentSocket = socket;
                currentSocket.setNoDelay(true);
                console.log('sensor authenticated');
            } else {
                socket.destroy();
                console.log('sensor authentication failed');
                return;
            }
        }

        // handle toggle status response
        while (streamReader.bytesLeft > 0) {
            const statusBuf = streamReader.readBytes(1);
            const sensorStatus = statusBuf[0];
            tcpEvent.emit('response', sensorStatus);
        }

        streamReader.eraseProcessedBytes();
    });

    socket.on('end', () => {
        console.log('sensor disconnected');
        sensorAuthenticated = false;
        currentSocket = null;
    });

    socket.on('error', () => {
        console.log('sensor disconnected with error');
        sensorAuthenticated = false;
        currentSocket = null;
    });
});

export async function sendToggle() {
    return new Promise<void>((resolve, reject) => {
        let settled = false;
        if (currentSocket) {
            currentSocket.write('1');
            const timeout = setTimeout(() => {
                if (settled) return;
                settled = true;
                reject('sensor not responding');
                tcpEvent.removeListener('response', onResponse);
            }, SENSOR_TIMEOUT);
            function onResponse(status: number) {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);
                if (status == SENSOR_SUCCESS) {
                    tcpEvent.emit('success');
                } else {
                    tcpEvent.emit('failure');
                }
            }
            tcpEvent.once('response', onResponse);
        } else {
            reject('sensor not connected');
        }
    });
}

tcpServer.listen(SENSOR_PORT);
