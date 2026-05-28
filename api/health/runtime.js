function handler(req, res) {
  return res.status(200).json({
    ok: true,
    runtime: 'vercel-node',
    env: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });
}

module.exports = handler;
