function handler(req, res) {
  const payload = {
    ok: true,
    hasToken: Boolean(process.env.MP_ACCESS_TOKEN),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
  };

  if (process.env.VERCEL_ENV !== 'production' && process.env.MP_ACCESS_TOKEN) {
    payload.tokenPrefix = process.env.MP_ACCESS_TOKEN.slice(0, 4);
  }

  return res.status(200).json(payload);
}

module.exports = handler;
