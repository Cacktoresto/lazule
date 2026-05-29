function handler(req, res) {
  const payload = {
    ok: true,
    hasToken: Boolean((process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN)),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  };

  return res.status(200).json(payload);
}

module.exports = handler;
