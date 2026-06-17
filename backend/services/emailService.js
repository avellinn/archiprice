function getFirstEnv(names) {
  return names.map((name) => process.env[name]).find(Boolean);
}

function getSmtpConfig() {
  return {
    host: getFirstEnv(['SMTP_HOST', 'MAIL_HOST', 'EMAIL_HOST']),
    port: Number(getFirstEnv(['SMTP_PORT', 'MAIL_PORT', 'EMAIL_PORT']) || 587),
    user: getFirstEnv(['SMTP_USER', 'MAIL_USER', 'EMAIL_USER']),
    pass: getFirstEnv(['SMTP_PASS', 'MAIL_PASS', 'EMAIL_PASS', 'SMTP_PASSWORD', 'MAIL_PASSWORD', 'EMAIL_PASSWORD']),
    from: getFirstEnv(['SMTP_FROM', 'MAIL_FROM', 'EMAIL_FROM', 'SMTP_USER', 'MAIL_USER', 'EMAIL_USER']),
  };
}

function getMissingConfigKeys(config) {
  return [
    ['SMTP_HOST', config.host],
    ['SMTP_USER', config.user],
    ['SMTP_PASS', config.pass],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

async function getTransporter() {
  const config = getSmtpConfig();
  const missingKeys = getMissingConfigKeys(config);

  if (missingKeys.length > 0) {
    return { transporter: null, missingKeys, config };
  }

  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return { transporter, missingKeys: [], config };
}

export async function verifyEmailTransport() {
  try {
    const { transporter, missingKeys } = await getTransporter();

    if (!transporter) {
      return {
        ok: false,
        reason: `SMTP incomplet: ${missingKeys.join(', ')}`,
      };
    }

    await transporter.verify();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error.message,
    };
  }
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresInMinutes = 30 }) {
  const subject = 'Réinitialisation de votre mot de passe ArchiPrice';
  const text = [
    'Bonjour,',
    '',
    'Vous avez demandé la réinitialisation de votre mot de passe.',
    '',
    'Cliquez sur le lien ci-dessous :',
    resetUrl,
    '',
    `Ce lien expire dans ${expiresInMinutes} minutes.`,
  ].join('\n');

  try {
    const { transporter, missingKeys, config } = await getTransporter();
    if (!transporter) {
      console.info(`[email] SMTP incomplet (${missingKeys.join(', ')} manquant). Lien de réinitialisation :`, resetUrl);
      return { delivered: false, previewUrl: resetUrl, reason: `SMTP incomplet: ${missingKeys.join(', ')}` };
    }

    await transporter.verify();
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html: `
        <p>Bonjour${name ? ` ${name}` : ''},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans ${expiresInMinutes} minutes.</p>
      `,
    });

    return { delivered: true };
  } catch (error) {
    console.error(`[email] Échec d'envoi du reset password : ${error.message}`);
    console.info('[email] Lien de réinitialisation :', resetUrl);
    return { delivered: false, previewUrl: resetUrl, reason: error.message };
  }
}
