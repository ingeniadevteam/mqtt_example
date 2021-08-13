'use strict';

require('dotenv').config();

const queues = require('./lib/queues');
const connect = require('./lib/connect');

const app = {
    mqtt_queue: null,
    mqtt_client: null,
    mqtt_ready: false,
};

(async () => {
    queues(app);
    connect(app);

    setInterval(() => {
        const timestamp = Math.floor((new Date()).getTime() / 1000);
        const payload = {
            deviceID: process.env.GOOGLE_CLOUD_IOT_DEVICE,
            timestamp: timestamp,
            value: timestamp
        };

        app.mqtt_queue.push(payload);
    }, 3000);
})();