import express from 'express';
import { authenticateRequest } from './utils.js';
import { sendToggle } from './tcpServer.js';
import { EventEmitter } from 'node:events';
import { state } from './state.js';

const WEB_ROOT_PATH = process.env.WEB_ROOT_PATH;
const CLIENT_API_KEY = process.env.CLIENT_API_KEY;
const FRONTEND_PORT = process.env.FRONTEND_PORT;
const appEvent = new EventEmitter();

const app = express();

app.post('/', express.json(), function checkApiKey(req, res) {
    const { apiKey } = req.body;
    if (apiKey === CLIENT_API_KEY) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Set-Cookie', `apiKey=${apiKey}; HttpOnly`);
        res.end(JSON.stringify({ authenticated: true }));
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(401, { Location: '/' });
        res.end(JSON.stringify({ authenticated: false }));
    }
});

app.use(function authenticate(req, res, next) {
    if (authenticateRequest(req)) next();
    else res.sendFile(WEB_ROOT_PATH + '/login.html');
});

app.get('/stream', function streamToggles(_, res) {
    console.log('stream request');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.write(`data: ${state.status}\n\n`);
    function onToggle(toggle: number) {
        res.write(`data: ${toggle}\n\n`);
    }
    appEvent.on('success', (toggle: number) => {
        onToggle(toggle);
    });
    res.on('close', () => {
        appEvent.removeListener('success', onToggle);
    });
});

let toggleInProgress = false;
app.post('/toggle', express.json(), async function toggle(_, res) {
    console.log('toggle request');
    if (toggleInProgress) {
        res.writeHead(429);
        res.end();
        return;
    }
    toggleInProgress = true;
    try {
        await sendToggle();
        // await new Promise(resolve => setTimeout(resolve, 5000));
        // state.status = state.status ? 0 : 1;
        // throw new Error('not implemented');
        appEvent.emit('success', state.status);
        res.writeHead(200);
    } catch (e) {
        console.error(e);
        res.writeHead(500);
    } finally {
        res.end();
        toggleInProgress = false;
    }
});

app.use(express.static(WEB_ROOT_PATH));

app.listen(FRONTEND_PORT);
