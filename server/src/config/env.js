const path = require('path');
const dotenv = require('dotenv');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);
  return process.env[key];
};

// boleh longgar untuk dev (PASS_PLAIN opsional)
module.exports = {
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_PASS_PLAIN: process.env.ADMIN_PASS_PLAIN || '',
  ADMIN_PASS_HASH: process.env.ADMIN_PASS_HASH || '$2b$12$86OHu1DxQ1lT7A1zPeZw9OV2QsFSdmNajsSLbpOOQSLg0m2sHKmqa',
  JWT_SECRET: required('JWT_SECRET'),
  PORT: parseInt(process.env.PORT || '4000', 10)
};
