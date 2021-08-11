# Google Cloud IoT Core NodeJS MQTT example

This sample app publishes data to Cloud Pub/Sub using the MQTT bridge provided
as part of Google Cloud IoT Core.

# Setup

```sh
npm install
```

Create cerificates:

```sh
cd scripts
./generate_keys.sh
```

Create a `.env` file like this:
```env
MQTT_BRIDGE_HOSTNAME=mqtt.googleapis.com
MQTT_BRIDGE_PORT=8883
MESSAGE_TYPE=events
TOKEN_EXP_MINS=20
GOOGLE_CLOUD_PROJECT=<the_project_id>
GOOGLE_CLOUD_IOT_REGISTRY=<the_registry_id>
GOOGLE_CLOUD_IOT_DEVICE=<the_device_id>
GOOGLE_CLOUD_REGION=europe-west1
ALGORITHM=RS256
SERVER_CERT_FILE=resources/roots.pem
CA_CERT="<full_public_key_using_\n_as_new_line_character>"
PRIVATE_KEY="<full_private_key_using_\n_as_new_line_character>"
```

# Running the sample

Usage: `npm start` or `npm run dev`
