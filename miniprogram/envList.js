const config = require('./utils/config');

const envList = [
  {
    envId: config.cloudEnvId,
    alias: 'cloud1',
  },
];

module.exports = {
  envList,
  isMac: false,
};
