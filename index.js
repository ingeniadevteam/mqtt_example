'use strict';

require('dotenv').config()


const demo = require('./lib/demo');

const state = {
    // Whether to wait with exponential backoff before publishing.
    shouldBackoff: false,
    // Whether an asynchronous publish chain is in progress.
    publishChainInProgress: false,
};


(async () => {

    demo(state)

    setInterval(() => {}, 1000);
})();