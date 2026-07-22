const { buildRetiredAdminEndpointResponse } = require('./legacyAdminEndpoint');

describe('legacy createAdminUser retirement contract', () => {
  test('returns 410 for POST without processing credentials or Auth operations', () => {
    expect(buildRetiredAdminEndpointResponse('POST')).toEqual({
      status: 410,
      body: {
        ok: false,
        error: 'endpoint_retired',
        message: 'This endpoint has been retired. Use the authenticated manageUserAccount callable.',
      },
    });
  });

  test('retains method rejection for non-POST requests', () => {
    expect(buildRetiredAdminEndpointResponse('GET')).toEqual({
      status: 405,
      body: {
        ok: false,
        error: 'method_not_allowed',
      },
    });
  });
});
