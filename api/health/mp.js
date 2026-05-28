export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    hasToken: Boolean(process.env.MP_ACCESS_TOKEN),
    env: process.env.VERCEL_ENV,
  });
}
