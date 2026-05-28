export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    hasToken: Boolean(process.env.MP_ACCESS_TOKEN),
    tokenPrefix: process.env.MP_ACCESS_TOKEN?.slice(0, 8),
    env: process.env.VERCEL_ENV,
  });
}
