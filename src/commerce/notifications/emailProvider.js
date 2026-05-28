export function createEmailProvider({ provider = process.env.EMAIL_PROVIDER || 'log' } = {}) {
  async function send(message) {
    if (provider === 'resend' || provider === 'brevo' || provider === 'sendgrid') {
      return { ok: false, provider, skipped: 'credentials_not_configured', messageId: null };
    }
    console.info('[EmailProvider:log]', { to: message.to, subject: message.subject });
    return { ok: true, provider: 'log', messageId: `log_${Date.now()}` };
  }
  return { send };
}
