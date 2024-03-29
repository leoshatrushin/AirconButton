import { EventEmitter } from 'node:events';
import http from 'node:http';

export class StreamReader {
    private buffer: Uint8Array;
    private offset: number;
    bytesLeft: number;
    constructor(initialData?: Uint8Array) {
        this.buffer = initialData ? initialData : new Uint8Array(0);
        this.offset = 0;
        this.bytesLeft = initialData ? initialData.byteLength : 0;
    }
    readInto(data: Uint8Array) {
        const newBuffer = new Uint8Array(this.buffer.byteLength + data.byteLength);
        newBuffer.set(this.buffer);
        newBuffer.set(data, this.buffer.byteLength);
        this.buffer = newBuffer;
        this.bytesLeft += data.byteLength;
    }
    readBytes(numBytes: number) {
        if (this.buffer.length - this.offset < numBytes) return null;
        const res = this.buffer.subarray(this.offset, this.offset + numBytes);
        this.offset += numBytes;
        this.bytesLeft -= numBytes;
        return res;
    }
    eraseProcessedBytes() {
        const newBuffer = new Uint8Array(this.buffer.byteLength - this.offset);
        newBuffer.set(this.buffer.subarray(this.offset));
        this.buffer = newBuffer;
        this.offset = 0;
        this.bytesLeft = this.buffer.byteLength;
    }
}

export const appEvent = new EventEmitter();

const CLIENT_API_KEY = process.env.CLIENT_API_KEY;

export function authenticateRequest(req: http.IncomingMessage) {
    const cookies = parseCookies(req);
    return cookies && cookies.apiKey === CLIENT_API_KEY;
}

function parseCookies(req: http.IncomingMessage) {
    const cookies: { [key: string]: string } = {};
    const cookieHeader = req.headers.cookie;
    cookieHeader &&
        cookieHeader.split(';').forEach(function addCookie(cookie) {
            const [name, value] = cookie.split('=');
            cookies[name.trim()] = decodeURI(value);
        });
    return cookies;
}
