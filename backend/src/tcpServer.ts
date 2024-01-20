import net from 'net';
import { StreamReader } from './utils.js';
import { state } from './state.js';
import { EventEmitter } from 'node:events';

const SENSOR_TIMEOUT = 500;
const SENSOR_STATUS_SUCCESS = 1;

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
            if (sensorStatus == SENSOR_STATUS_SUCCESS) {
                tcpEvent.emit('success');
            } else {
                tcpEvent.emit('failure');
            }
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
        if (currentSocket) {
            currentSocket.write('1');
            const timeout = setTimeout(() => {
                reject('sensor not responding');
            }, SENSOR_TIMEOUT);
            tcpEvent.on('success', () => {
                clearTimeout(timeout);
                state.status = state.status ? 0 : 1;
                resolve();
            });
            tcpEvent.on('failure', () => {
                clearTimeout(timeout);
                reject('sensor failed to toggle');
            });
        } else {
            reject('sensor not connected');
        }
    });
}

tcpServer.listen(SENSOR_PORT);
