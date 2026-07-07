import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Demande from '../models/Demande.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import Product from '../models/Product.js';
import Project from '../models/Project.js';
import Simulation from '../models/Simulation.js';
import Supplier from '../models/Supplier.js';
import SupportItem from '../models/SupportItem.js';
import User from '../models/User.js';
import { deleteProductImage } from './cloudinaryImageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CATALOGUE_CONFIG_FILE = path.join(__dirname, '..', 'data', 'catalogueConfig.json');

async function deleteProductsWithImages(filter, session = null) {
  let query = Product.find(filter);
  if (session) query = query.session(session);
  const products = await query;
  const productIds = products.map((product) => product._id);
  const publicIds = products
    .flatMap((product) => product.images || [])
    .map((image) => image.public_id)
    .filter(Boolean);

  await Promise.allSettled(publicIds.map((publicId) => deleteProductImage(publicId)));

  if (productIds.length > 0) {
    let deleteQuery = Product.deleteMany({ _id: { $in: productIds } });
    if (session) deleteQuery = deleteQuery.session(session);
    await deleteQuery;
  }
}

async function runDbTransaction(action) {
  const session = await User.startSession();
  let transactionStarted = false;

  try {
    try {
      session.startTransaction();
      transactionStarted = true;
    } catch (error) {
      console.warn('[admin] MongoDB transaction unavailable:', error.message);
    }

    const result = await action(transactionStarted ? session : null);

    if (transactionStarted) {
      await session.commitTransaction();
    }

    return result;
  } catch (error) {
    if (transactionStarted) {
      await session.abortTransaction().catch(() => {});
    }
    throw error;
  } finally {
    session.endSession();
  }
}

async function purgeUserFromCatalogueConfig(user) {
  try {
    const rawConfig = await fs.readFile(CATALOGUE_CONFIG_FILE, 'utf8');
    const config = JSON.parse(rawConfig);
    const userId = String(user._id);
    const userEmail = String(user.email || '').toLowerCase();

    const matchesUser = (item) => {
      const itemUserId = String(item?.userId || item?.clientId || item?.supplierUserId || '');
      const itemEmail = String(item?.email || item?.clientEmail || '').toLowerCase();
      return itemUserId === userId || (userEmail && itemEmail === userEmail);
    };

    const nextConfig = {
      ...config,
      users: (config.users || []).filter((item) => !matchesUser(item)),
      simulations: (config.simulations || []).filter((item) => !matchesUser(item)),
      supportItems: (config.supportItems || []).filter((item) => !matchesUser(item)),
      supplierClientNotifications: (config.supplierClientNotifications || []).filter((item) => !matchesUser(item)),
      __updatedAt: Date.now(),
    };

    await fs.writeFile(CATALOGUE_CONFIG_FILE, JSON.stringify(nextConfig, null, 2));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[purgeUserFromCatalogueConfig] failed:', error.message);
    }
  }
}

async function cascadeDeleteUser(user) {
  const userId = user._id;
  const suppliers = await Supplier.find({ user: userId });
  const supplierIds = suppliers.map((supplier) => supplier._id);
  const projects = await Project.find({ user: userId }).select('_id');
  const projectIds = projects.map((project) => project._id);

  await runDbTransaction(async (session) => {
    await deleteProductsWithImages({
      $or: [
        { supplierUser: userId },
        ...(supplierIds.length ? [{ supplier: { $in: supplierIds } }] : []),
        ...(projectIds.length ? [{ project: { $in: projectIds } }] : []),
      ],
    }, session);

    await Project.deleteMany({ user: userId }).session(session);
    await Supplier.deleteMany({ _id: { $in: supplierIds } }).session(session);
    await SupportItem.deleteMany({ userId }).session(session);
    await Simulation.deleteMany({ userId }).session(session);
    await Demande.deleteMany({
      $or: [
        { user: userId },
        { supplierUser: userId },
        ...(supplierIds.length ? [{ supplier: { $in: supplierIds } }] : []),
      ],
    }).session(session);
    await PasswordResetToken.deleteMany({ user: userId }).session(session);
    await User.deleteOne({ _id: userId }).session(session);
  });

  await purgeUserFromCatalogueConfig(user);
}

export { cascadeDeleteUser, deleteProductsWithImages, purgeUserFromCatalogueConfig, runDbTransaction };
