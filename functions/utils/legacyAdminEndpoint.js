function buildRetiredAdminEndpointResponse(method) {
  if (String(method || '').toUpperCase() !== 'POST') {
    return {
      status: 405,
      body: {
        ok: false,
        error: 'method_not_allowed',
      },
    };
  }

  return {
    status: 410,
    body: {
      ok: false,
      error: 'endpoint_retired',
      message: 'This endpoint has been retired. Use the authenticated manageUserAccount callable.',
    },
  };
}

module.exports = { buildRetiredAdminEndpointResponse };
