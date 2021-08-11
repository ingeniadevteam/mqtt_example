'use strict';

const mqtt = require('mqtt');
const {readFileSync} = require('fs');
const jwt = require('./jwt');
const publish = require('./publish');

module.exports = (
    state,
    deviceId = process.env.GOOGLE_CLOUD_IOT_DEVICE,
    registryId = process.env.GOOGLE_CLOUD_IOT_REGISTRY,
    projectId = process.env.GOOGLE_CLOUD_PROJECT,
    region = process.env.GOOGLE_CLOUD_REGION,
    mqttBridgeHostname = process.env.MQTT_BRIDGE_HOSTNAME,
    mqttBridgePort = process.env.MQTT_BRIDGE_PORT,
    numMessages = 1
) => {
    // The mqttClientId is a unique string that identifies this device. For Google
    // Cloud IoT Core, it must be in the format below.
    const mqttClientId = `projects/${projectId}/locations/${region}/registries/${registryId}/devices/${deviceId}`;

    // Create a Cloud IoT Core JWT for the given project id
    const password = jwt();
    if (password.error) {
        console.log(password.error);
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
        password: password,
        protocol: 'mqtts',
        secureProtocol: 'TLSv1_2_method',
        ca: [readFileSync(process.env.SERVER_CERT_FILE)],
    };

    const iatTime = parseInt(Date.now() / 1000);

    // Create a client, and connect to the Google MQTT bridge.
    const client = mqtt.connect(connectionArgs);
    
    // Subscribe to the /devices/{device-id}/config topic to receive config updates.
    // Config updates are recommended to use QoS 1 (at least once delivery)
    client.subscribe(`/devices/${deviceId}/config`, {qos: 1});

    // Subscribe to the /devices/{device-id}/commands/# topic to receive all
    // commands or to the /devices/{device-id}/commands/<subfolder> to just receive
    // messages published to a specific commands folder; we recommend you use
    // QoS 0 (at most once delivery)
    client.subscribe(`/devices/${deviceId}/commands/#`, {qos: 0});

    client.on('connect', success => {
        console.log('connect');
        if (!success) {
            console.log('Client not connected...');
        } else if (!state.publishChainInProgress) {
            publish(state, client, iatTime, 1, numMessages, connectionArgs);
        }
    });
    
    client.on('close', () => {
        console.log('close');
        state.shouldBackoff = true;
    });
    
    client.on('error', err => {
        console.log('error', err);
    });
    
    client.on('message', (topic, message) => {
        let messageStr = 'Message received: ';
        if (topic === `/devices/${deviceId}/config`) {
            messageStr = 'Config message received: ';
        } else if (topic.startsWith(`/devices/${deviceId}/commands`)) {
            messageStr = 'Command message received: ';
        }
    
        messageStr += Buffer.from(message, 'base64').toString('ascii');
        console.log(messageStr);
    });
    
    client.on('packetsend', () => {
        // Note: logging packet send is very verbose
    });

};
