'use strict';

const jwt = require('jsonwebtoken');

// Create a Cloud IoT Core JWT for the given project id, signed with the given
// private key.
// [START iot_mqtt_jwt]
module.exports = (
    projectId = process.env.GOOGLE_CLOUD_PROJECT,
    algorithm = process.env.ALGORITHM
) => {
  // Create a JWT to authenticate this device. The device will be disconnected
  // after the token expires, and will have to reconnect with a new token. The
  // audience field should always be set to the GCP project id.
  const token = {
    iat: parseInt(Date.now() / 1000),
    exp: parseInt(Date.now() / 1000) + 20 * 60, // 20 minutes
    aud: projectId,
  };

  try {
      return jwt.sign(token, process.env.PRIVATE_KEY, {algorithm});
  } catch (error) {
      return { error }
  }
};