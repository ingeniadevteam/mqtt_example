'use strict';

const mqtt = require('mqtt');
const { readFileSync } = require('fs');

const jwt = require('./jwt');

module.exports = (
    app,
    deviceId = process.env.GOOGLE_CLOUD_IOT_DEVICE,
    registryId = process.env.GOOGLE_CLOUD_IOT_REGISTRY,
    projectId = process.env.GOOGLE_CLOUD_PROJECT,
    region = process.env.GOOGLE_CLOUD_REGION,
    mqttBridgeHostname = process.env.MQTT_BRIDGE_HOSTNAME,
    mqttBridgePort = process.env.MQTT_BRIDGE_PORT,
) => {
    // The mqttClientId is a unique string that identifies this device. For Google
    // Cloud IoT Core, it must be in the format below.
    const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`;

    // Create a Cloud IoT Core JWT for the given project id
    const token = jwt();
    if (token.error) {
        console.error(token.error);
        return;
    }

    // With Google Cloud IoT Core, the username field is ignored, however it must be
    // non-empty. The password field is used to transmit a JWT to authorize the
    // device. The "mqtts" protocol causes the library to connect using SSL, which
    // is required for Cloud IoT Core.
    const connectionArgs = {
        host: mqttBridgeHostname,
        port: mqttBridgePort,
        clientId: mqttClientId,
        username: 'unused',
        password: token,
        protocol: 'mqtts',
        secureProtocol: 'TLSv1_2_method',
        ca: [readFileSync(process.env.SERVER_CERT_FILE)],
    };

    // Create a client, and connect to the Google MQTT bridge.
    app.mqtt_client = mqtt.connect(connectionArgs);

    app.mqtt_client.on('connect', success => {
        console.log('MQTT connected');
        if (!success) {
            console.log('MQTT not connected...');
            app.mqtt_ready = false;
        } else {
            // Subscribe to the /devices/{device-id}/config topic to receive config updates.
            // Config updates are recommended to use QoS 1 (at least once delivery)
            app.mqtt_client.subscribe(`/devices/${deviceId}/config`, {qos: 1});

            // Subscribe to the /devices/{device-id}/commands/# topic to receive all
            // commands or to the /devices/{device-id}/commands/<subfolder> to just receive
            // messages published to a specific commands folder; we recommend you use
            // QoS 0 (at most once delivery)
            app.mqtt_client.subscribe(`/devices/${deviceId}/commands/#`, {qos: 0});

            console.log("ready to publish...");
            app.mqtt_ready = true;
        }
    });
    
    app.mqtt_client.on('close', () => {
        console.log('MQTT connection closed');
        app.mqtt_ready = false;
    });
    
    app.mqtt_client.on('error', err => {
        console.log('error', err);
    });
    
    app.mqtt_client.on('message', (topic, message) => {
        let messageStr = 'Message received: ';
        if (topic === `/devices/${deviceId}/config`) {
            messageStr = 'Config message received: ';
        } else if (topic.startsWith(`/devices/${deviceId}/commands`)) {
            messageStr = 'Command message received: ';
        }
    
        messageStr += Buffer.from(message, 'base64').toString('ascii');
        console.log(messageStr);
    });
    
    app.mqtt_client.on('packetsend', () => {
        // Note: logging packet send is very verbose
    });
};