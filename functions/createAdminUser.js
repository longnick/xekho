const { onRequest } = require('firebase-functions/v2/https');
const { buildRetiredAdminEndpointResponse } = require('./utils/legacyAdminEndpoint');

/**
 * Retired legacy HTTP endpoint.
 * Account provisioning is now only available through the authenticated
 * manageUserAccount callable in functions/index.js.
 */
exports.createAdminUser = onRequest(
  { cors: true, region: 'asia-southeast1' },
  (req, res) => {
    const response = buildRetiredAdminEndpointResponse(req.method);
    return res.status(response.status).json(response.body);
  }
);
