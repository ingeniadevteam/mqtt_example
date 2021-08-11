'use strict';

const jwt = require('./jwt');

// The initial backoff time after a disconnection occurs, in seconds.
const MINIMUM_BACKOFF_TIME = 1;

// The maximum backoff time before giving up, in seconds.
const MAXIMUM_BACKOFF_TIME = 32;

// The current backoff time.
let backoffTime = 1;

const publish = (
    state,
    client,
    iatTime,
    messagesSent,
    numMessages = 1,
    connectionArgs
) => {
    // The MQTT topic that this device will publish data to. The MQTT topic name is
    // required to be in the format below. The topic name must end in 'state' to
    // publish state and 'events' to publish telemetry. Note that this is not the
    // same as the device registry's Cloud Pub/Sub topic.
    const mqttTopic = `/devices/${process.env.GOOGLE_CLOUD_IOT_DEVICE}/${process.env.MESSAGE_TYPE}`;

    // If we have published enough messages or backed off too many times, stop.
    if (messagesSent > numMessages || backoffTime >= MAXIMUM_BACKOFF_TIME) {
        if (backoffTime >= MAXIMUM_BACKOFF_TIME) {
            console.log('Backoff time is too high. Giving up.');
        }
        console.log('Closing connection to MQTT. Goodbye!');
        client.end();
        state.publishChainInProgress = false;
        return;
    }

    // Publish and schedule the next publish.
    state.publishChainInProgress = true;
    let publishDelayMs = 0;
    if (state.shouldBackoff) {
        publishDelayMs = 1000 * (backoffTime + Math.random());
        backoffTime *= 2;
        console.log(`Backing off for ${publishDelayMs}ms before publishing.`);
    }

    setTimeout(() => {
        const registryId = process.env.GOOGLE_CLOUD_IOT_REGISTRY;
        // const payload = `${registryId}/${process.env.GOOGLE_CLOUD_IOT_DEVICE}-payload-${messagesSent}`;
        const payload = {
          deviceID: process.env.GOOGLE_CLOUD_IOT_DEVICE,
          timestamp: (new Date()).getTime(),
          value: Math.floor(Math.random() * 100)
        };
    
        // Publish "payload" to the MQTT topic. qos=1 means at least once delivery.
        // Cloud IoT Core also supports qos=0 for at most once delivery.
        console.log('Publishing message to', mqttTopic, payload);
        client.publish(mqttTopic, JSON.stringify(payload), {qos: 1}, err => {
            if (!err) {
                state.shouldBackoff = false;
                backoffTime = MINIMUM_BACKOFF_TIME;
            }
        });
    
        const schedulePublishDelayMs = process.env.MESSAGE_TYPE === 'events' ? 1000 : 2000;
        setTimeout(() => { 
          // [START iot_mqtt_jwt_refresh]
          const secsFromIssue = parseInt(Date.now() / 1000) - iatTime;
          if (secsFromIssue > process.env.TOKEN_EXP_MINS * 60) {
            iatTime = parseInt(Date.now() / 1000);
            console.log(`\tRefreshing token after ${secsFromIssue} seconds.`);
    
            client.end();
            connectionArgs.password = jwt();
            if (connectionArgs.password.error) {
                console.log(connectionArgs.password.error);
                return;
            }
            connectionArgs.protocolId = 'MQTT'; 
            connectionArgs.protocolVersion = 4;
            connectionArgs.clean = true;
            client = mqtt.connect(connectionArgs);
            // [END iot_mqtt_jwt_refresh]
    
            client.on('connect', success => {
              console.log('connect');
              if (!success) {
                console.log('Client not connected...');
              } else if (!state.publishChainInProgress) {
                publish(
                  state,
                  client,
                  iatTime,
                  messagesSent,
                  numMessages,
                  connectionArgs
                );
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
              console.log(
                'message received: ',
                Buffer.from(message, 'base64').toString('ascii')
              );
            });
    
            client.on('packetsend', () => {
              // Note: logging packet send is very verbose
            });
          }
          publish(
            state,
            client,
            iatTime,
            messagesSent + 1,
            numMessages,
            connectionArgs
          );
        }, schedulePublishDelayMs);
      }, publishDelayMs);
};

module.exports = publish;