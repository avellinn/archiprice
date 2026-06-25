import mongoose from 'mongoose';
import './config/env.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

console.log('🔍 Configuration MongoDB :', uri ? '✅ URI chargée' : '❌ AUCUNE URI TROUVÉE');

if (!uri) {
  console.error('❌ MONGODB_URI introuvable dans les fichiers .env du projet');
  process.exit(1);
}

console.log('🔄 Tentative de connexion à MongoDB Atlas...');

try {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log('✅ CONNEXION RÉUSSIE !');
} catch (error) {
  console.error('❌ ERREUR DÉTAILLÉE :', error.message);
  console.error('Type :', error.name);

  if (error.message.includes('whitelist') || error.message.includes('IP')) {
    console.log('→ Vérifie la liste d’accès IP dans MongoDB Atlas');
  }
  if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
    console.log('→ Vérifie le nom utilisateur et le mot de passe MongoDB');
  }
  if (/ENOTFOUND|ECONNREFUSED|getaddrinfo|querySrv/i.test(error.message)) {
    console.log('→ Vérifie la résolution DNS et la connexion réseau');
  }
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
