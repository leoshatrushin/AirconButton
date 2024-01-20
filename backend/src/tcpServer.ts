import net from 'net';
import { StreamReader } from './utils';
import { state } from './state';
import { EventEmitter } from 'node:events';

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
                console.log('sensor authenticated');
            } else {
                socket.destroy();
                console.log('sensor authentication failed');
                return;
            }
        }

        // handle toggle status responses
        const statusBuf = streamReader.readBytes(1);
        const sensorStatus = Number(decoder.decode(statusBuf));
        if (sensorStatus == SENSOR_STATUS_SUCCESS) {
            tcpEvent.emit('success');
        } else {
            tcpEvent.emit('failure');
        }
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
            currentSocket.write('toggle');
            const timeout = setTimeout(() => {
                reject('Sensor not responding');
            }, 1000);
            tcpEvent.on('success', () => {
                clearTimeout(timeout);
                state.status = state.status ? 0 : 1;
                resolve();
            });
            tcpEvent.on('failure', () => {
                clearTimeout(timeout);
                reject('Sensor failed to toggle');
            });
        } else {
            reject('Sensor not connected');
        }
    });
}

tcpServer.listen(SENSOR_PORT);
