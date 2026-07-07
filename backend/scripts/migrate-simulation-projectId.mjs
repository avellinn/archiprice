import mongoose from 'mongoose';
import '../config/env.js';
import Simulation from '../models/Simulation.js';

const MIGRATION_NAME = 'migrate-simulation-projectId';

function parseObjectId(value) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  const str = String(value || '').trim();
  if (!str) return null;
  if (mongoose.Types.ObjectId.isValid(str)) return new mongoose.Types.ObjectId(str);
  return 'invalid';
}

async function migrate() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(`[${MIGRATION_NAME}] MONGODB_URI manquant dans l'environnement.`);
    process.exit(1);
  }

  console.log(`[${MIGRATION_NAME}] Connexion à MongoDB...`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      maxPoolSize: 10,
    });
    console.log(`[${MIGRATION_NAME}] Connecté.`);
  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Échec connexion : ${error.message}`);
    process.exit(1);
  }

  let total = 0;
  let alreadyOk = 0;
  let migrated = 0;
  let setToNull = 0;
  let errors = 0;

  try {
    const simulations = await Simulation.find({}).lean().exec();
    total = simulations.length;
    console.log(`[${MIGRATION_NAME}] ${total} simulation(s) trouvée(s).`);

    for (const sim of simulations) {
      const raw = sim.projectId;

      if (raw === null || raw === undefined || raw === '') {
        alreadyOk += 1;
        continue;
      }

      const parsed = parseObjectId(raw);

      if (parsed === null) {
        alreadyOk += 1;
        continue;
      }

      if (parsed === 'invalid') {
        try {
          await Simulation.findByIdAndUpdate(sim._id, { projectId: null });
          setToNull += 1;
        } catch (err) {
          console.error(`[${MIGRATION_NAME}] Erreur update ${sim._id} : ${err.message}`);
          errors += 1;
        }
        continue;
      }

      if (raw instanceof mongoose.Types.ObjectId) {
        alreadyOk += 1;
        continue;
      }

      try {
        await Simulation.findByIdAndUpdate(sim._id, { projectId: parsed });
        migrated += 1;
      } catch (err) {
        console.error(`[${MIGRATION_NAME}] Erreur update ${sim._id} : ${err.message}`);
        errors += 1;
      }
    }
  } catch (error) {
    console.error(`[${MIGRATION_NAME}] Erreur lecture simulations : ${error.message}`);
    process.exit(1);
  }

  console.log(`\n=== ${MIGRATION_NAME} ===`);
  console.log(`Total            : ${total}`);
  console.log(`Déjà OK (null/OBJ): ${alreadyOk}`);
  console.log(`Migrées (str→OBJ) : ${migrated}`);
  console.log(`Mises à null     : ${setToNull}`);
  console.log(`Erreurs          : ${errors}`);
  console.log(`=========================\n`);

  await mongoose.disconnect();
  console.log(`[${MIGRATION_NAME}] Déconnecté.`);
}

migrate().catch((error) => {
  console.error(`[${MIGRATION_NAME}] Erreur fatale : ${error.message}`);
  process.exit(1);
});
