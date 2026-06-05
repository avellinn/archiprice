import mongoose from 'mongoose';
import User from '../models/User.js';

function getSuperAdminConfig() {
  const firstName = process.env.SUPER_ADMIN_FIRSTNAME || '';
  const lastName = process.env.SUPER_ADMIN_LASTNAME || '';

  return {
    email: (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase().trim(),
    password: process.env.SUPER_ADMIN_PASSWORD || '',
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name: `${firstName} ${lastName}`.trim(),
  };
}

export default async function seedSuperAdmin() {
  if (mongoose.connection.readyState !== 1) {
    console.log('[seed] MongoDB non connecté — seed Super Admin ignoré');
    return;
  }

  const config = getSuperAdminConfig();

  if (!config.email || !config.password) {
    console.warn('[seed] SUPER_ADMIN_EMAIL ou SUPER_ADMIN_PASSWORD manquant — seed Super Admin ignoré');
    return;
  }

  const existingUserWithEmail = await User.findOne({ email: config.email });
  if (existingUserWithEmail) {
    existingUserWithEmail.firstName = config.firstName;
    existingUserWithEmail.lastName = config.lastName;
    existingUserWithEmail.name = config.name;
    existingUserWithEmail.password = config.password;
    existingUserWithEmail.role = 'admin';
    existingUserWithEmail.type = 'Super Admin';
    existingUserWithEmail.status = 'Actif';
    existingUserWithEmail.subscription = 'Interne';
    await existingUserWithEmail.save();
    console.log(`[seed] Super Admin synchronisé : ${config.email}`);
    return;
  }

  await User.create({
    firstName: config.firstName,
    lastName: config.lastName,
    name: config.name,
    email: config.email,
    password: config.password,
    role: 'admin',
    type: 'Super Admin',
    status: 'Actif',
    subscription: 'Interne',
  });

  console.log(`[seed] Super Admin créé : ${config.email}`);
}
