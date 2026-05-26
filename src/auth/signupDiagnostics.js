function safePreview(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

export function diagnoseSignupFlow({
  provider,
  env,
  request,
  response,
  error,
  phase = 'signup',
} = {}) {
  const providerAvailable = Boolean(provider?.isConfigured);
  const envConfigured = Boolean(env?.url && env?.anonKey);
  const user = response?.data?.user || null;
  const session = response?.data?.session || null;
  const message = String(error?.message || '').toLowerCase();
  const emailConfirmationRequired = Boolean(user && !session);

  const report = {
    phase,
    providerAvailable,
    envConfigured,
    authEnabled: providerAvailable,
    signupEnabled: providerAvailable && envConfigured,
    metadataAccepted: !error,
    sessionCreated: Boolean(session?.access_token),
    emailConfirmationRequired,
    finalState: error
      ? 'failed'
      : emailConfirmationRequired
        ? 'email_confirmation_required'
        : session
          ? 'authenticated'
          : 'completed_without_session',
    request: safePreview(request),
    response: safePreview(response),
    error: error
      ? {
        message: error.message || 'unknown_error',
        code: error.code || null,
        status: error.status || null,
        name: error.name || 'Error',
      }
      : null,
  };

  if (import.meta.env.DEV) {
    console.groupCollapsed('[auth/signup/diagnostics]');
    console.debug('providerAvailable', report.providerAvailable);
    console.debug('envConfigured', report.envConfigured);
    console.debug('request', report.request);
    console.debug('response', report.response);
    console.debug('error', report.error);
    console.debug('finalState', report.finalState);
    console.groupEnd();
  }

  return report;
}

export function mapSignupErrorForUx(error) {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('already') || message.includes('registered') || message.includes('already been registered') || message.includes('já está')) {
    return 'Este e-mail já possui uma identidade ativa. Tente entrar ou recuperar acesso.';
  }

  if (message.includes('invalid api key') || message.includes('apikey') || message.includes('jwt')) {
    return 'Configuração de autenticação inválida (API key).';
  }

  if (message.includes('signup') && message.includes('disabled')) {
    return 'Signup está desativado neste ambiente.';
  }

  if (message.includes('database')) {
    return 'Erro de banco ao salvar sua identidade inicial.';
  }

  if (message.includes('unavailable') || message.includes('configurado') || error?.status === 503) {
    return 'Auth provider indisponível agora.';
  }

  return error?.message || 'Não conseguimos iniciar sua identidade agora.';
}
