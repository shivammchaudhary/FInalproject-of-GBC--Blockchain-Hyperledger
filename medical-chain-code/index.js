'use strict';

const medicalDataContract = require('./lib/medicalDataContract.js');

module.exports.AssetTransfer = medicalDataContract;
module.exports.contracts = [medicalDataContract];