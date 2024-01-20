await new Promise<void>(resolve => {
    window.addEventListener('DOMContentLoaded', function onDOMReadyToManipulate() {
        resolve();
    });
});

const PROTOCOL = import.meta.env.VITE_PROTOCOL;
const HOST = import.meta.env.VITE_HOST;
const PORT = import.meta.env.VITE_PORT;

let state = 0;

const airconButton = document.getElementById('aircon-button');

const sse = new EventSource(`${PROTOCOL}://${HOST}:${PORT}/stream`);
sse.addEventListener('message', event => {
    state = Number(event.data);
    airconButton.innerText = state ? 'ON' : 'OFF';
    airconButton.classList.toggle('on', !!state);
    airconButton.classList.toggle('off', !state);
});

async function sendToggleRequest() {
    const response = await fetch(`${PROTOCOL}://${HOST}:${PORT}/toggle`, {
        method: 'POST',
    });
    if (!response.ok) {
        airconButton.removeEventListener('click', sendToggleRequest);
        airconButton.innerText = 'ERROR';
        airconButton.classList.add('error');
        setTimeout(() => {
            airconButton.classList.remove('error');
            airconButton.innerText = state ? 'ON' : 'OFF';
            airconButton.addEventListener('click', sendToggleRequest);
        }, 1000);
    }
}

airconButton.addEventListener('click', sendToggleRequest);

export {};
