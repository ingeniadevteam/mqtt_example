"use strict";

const Queue = require('better-queue');

module.exports = (app) => {
    // The MQTT topic that this device will publish data to. The MQTT topic name is
    // required to be in the format below. The topic name must end in 'state' to
    // publish state and 'events' to publish telemetry. Note that this is not the
    // same as the device registry's Cloud Pub/Sub topic.
    const mqttTopic = `/devices/${process.env.GOOGLE_CLOUD_IOT_DEVICE}/${process.env.MESSAGE_TYPE}`;

    app.mqtt_queue = new Queue( (payload, cb) => {
        // Publish "payload" to the MQTT topic. qos=1 means at least once delivery.
        // Cloud IoT Core also supports qos=0 for at most once delivery.
        console.log('Publishing message to', mqttTopic, payload.value);
        app.mqtt_client.publish(mqttTopic, JSON.stringify(payload), {qos: 1}, err => {
            if (!err) {
              cb(null, payload);
            } else {
              cb(err.message, '❗️');
            }
        });
    }, {
      // store: {
      //   type: 'sql',
      //   dialect: 'sqlite',
      //   path: process.env.NODE_ENV === 'development' ? 
      //     `/tmp/mqtt_queue.sqlite` : 
      //     `/home/${process.env.USER}/mqtt_queue.sqlite`
      // },
      // will delay processing between tasks
      afterProcessDelay: 500,
      precondition: function (cb) {
        if (app.mqtt_ready) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      },
      // If we go offline, retry every 10s
      preconditionRetryTimeout: 10*1000
    });

    app.mqtt_queue.on('task_finish', function (taskId, payload) {
      // Handle finished payload
      console.log("debug", `task ${taskId} done`, payload.timestamp);
    });

    app.mqtt_queue.on('task_failed', function (taskId, errorMessage) {
      // Handle error
      console.log("debug", `task ${taskId} failed:`, errorMessage);
      console.log("debug", `stats`, app.mqtt_queue.getStats());
    });

};
