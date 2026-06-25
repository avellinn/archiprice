import { randomUUID } from 'node:crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import { assertCloudinaryConfig, cloudinary } from '../config/cloudinary.js';

const CLOUDINARY_PRODUCT_FOLDER = 'archiprice/products';
const CLOUDINARY_SUPPLIER_MEDIA_FOLDER = 'archiprice/supplier-media';
const DEFAULT_UPLOAD_TIMEOUT_MS = 120000;
const DEFAULT_UPLOAD_ATTEMPT_TIMEOUT_MS = 20000;
const DEFAULT_UPLOAD_RETRIES = 5;
const DNS_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_CLOUDINARY_API_HOST = 'api.cloudinary.com';

let cachedUploadAddresses = [];
let uploadAddressesExpireAt = 0;
let preferredUploadAddress = '';

function getInteger(value, fallback, minimum = 0) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue >= minimum ? parsedValue : fallback;
}

const CLOUDINARY_UPLOAD_TIMEOUT_MS = getInteger(
  process.env.CLOUDINARY_UPLOAD_TIMEOUT_MS,
  DEFAULT_UPLOAD_TIMEOUT_MS,
  1000,
);
const CLOUDINARY_UPLOAD_ATTEMPT_TIMEOUT_MS = getInteger(
  process.env.CLOUDINARY_UPLOAD_ATTEMPT_TIMEOUT_MS,
  DEFAULT_UPLOAD_ATTEMPT_TIMEOUT_MS,
  1000,
);
const CLOUDINARY_UPLOAD_RETRIES = getInteger(
  process.env.CLOUDINARY_UPLOAD_RETRIES,
  DEFAULT_UPLOAD_RETRIES,
);

function getCloudinaryApiHost() {
  try {
    return new URL(cloudinary.config().upload_prefix || `https://${DEFAULT_CLOUDINARY_API_HOST}`).hostname;
  } catch {
    return DEFAULT_CLOUDINARY_API_HOST;
  }
}

async function getUploadAddresses() {
  if (cachedUploadAddresses.length > 0 && Date.now() < uploadAddressesExpireAt) {
    return cachedUploadAddresses;
  }

  try {
    cachedUploadAddresses = await dns.resolve4(getCloudinaryApiHost());
    uploadAddressesExpireAt = Date.now() + DNS_CACHE_TTL_MS;
  } catch (error) {
    console.warn(`[cloudinary] Résolution DNS directe indisponible : ${error.message}`);
    cachedUploadAddresses = [];
  }

  return cachedUploadAddresses;
}

function prioritizeUploadAddresses(addresses) {
  if (!preferredUploadAddress || !addresses.includes(preferredUploadAddress)) return addresses;
  return [preferredUploadAddress, ...addresses.filter((address) => address !== preferredUploadAddress)];
}

function createPinnedAgent(address) {
  if (!address) return undefined;

  return new https.Agent({
    keepAlive: true,
    lookup(_hostname, options, callback) {
      if (options.all) {
        callback(null, [{ address, family: 4 }]);
        return;
      }
      callback(null, address, 4);
    },
  });
}

function buildOptimizedUrl(publicId) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { fetch_format: 'auto', quality: 'auto' },
    ],
  });
}

function uploadBufferOnce(file, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType || 'image',
        overwrite: true,
        unique_filename: false,
        use_filename: false,
        timeout: options.timeoutMs,
        agent: options.agent,
        tags: ['archiprice', options.tag || 'product'],
        context: {
          original_name: file.originalname || 'image',
          source: options.source || 'product-upload',
        },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(file.buffer);
  });
}

function isRetryableUploadError(error) {
  const httpCode = Number(error?.http_code || error?.statusCode || error?.status);
  return [408, 420, 429, 499].includes(httpCode)
    || httpCode >= 500
    || ['ECONNRESET', 'EPIPE', 'ETIMEDOUT'].includes(error?.code)
    || /timeout|socket hang up|connection reset/i.test(String(error?.message || ''));
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function uploadBufferToCloudinary(file, options = {}) {
  assertCloudinaryConfig();

  const folder = options.folder || CLOUDINARY_PRODUCT_FOLDER;
  const publicId = options.publicId || `${options.tag || 'product'}-${randomUUID()}`;
  const startedAt = Date.now();
  const uploadAddresses = prioritizeUploadAddresses(await getUploadAddresses());
  let lastError;

  for (let attempt = 0; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
    const uploadAddress = uploadAddresses.length > 0
      ? uploadAddresses[attempt % uploadAddresses.length]
      : '';
    const agent = createPinnedAgent(uploadAddress);

    try {
      const remainingTimeMs = Math.max(1000, CLOUDINARY_UPLOAD_TIMEOUT_MS - (Date.now() - startedAt));
      const result = await uploadBufferOnce(file, {
        ...options,
        folder,
        publicId,
        timeoutMs: Math.min(CLOUDINARY_UPLOAD_ATTEMPT_TIMEOUT_MS, remainingTimeMs),
        agent,
      });
      if (uploadAddress) preferredUploadAddress = uploadAddress;
      return result;
    } catch (error) {
      lastError = error;
      const elapsedTimeMs = Date.now() - startedAt;
      if (!isRetryableUploadError(error)
        || attempt === CLOUDINARY_UPLOAD_RETRIES
        || elapsedTimeMs >= CLOUDINARY_UPLOAD_TIMEOUT_MS) break;

      const delayMs = 500 * (2 ** attempt);
      if (elapsedTimeMs + delayMs >= CLOUDINARY_UPLOAD_TIMEOUT_MS) break;
      console.warn(
        `[cloudinary] Upload temporairement indisponible (${error.http_code || error.code || error.name || 'erreur'}), nouvelle tentative ${attempt + 2}/${CLOUDINARY_UPLOAD_RETRIES + 1} dans ${delayMs} ms`,
      );
      await wait(delayMs);
    } finally {
      agent?.destroy();
    }
  }

  const fullPublicId = `${folder}/${publicId}`;
  const cleanupAgent = createPinnedAgent(preferredUploadAddress || uploadAddresses[0]);
  await cloudinary.uploader.destroy(fullPublicId, {
    resource_type: options.resourceType === 'auto' ? 'image' : options.resourceType || 'image',
    invalidate: true,
    agent: cleanupAgent,
  }).catch(() => {}).finally(() => cleanupAgent?.destroy());

  const timeoutError = new Error(
    isRetryableUploadError(lastError)
      ? 'Le stockage des images est temporairement indisponible. Réessayez dans quelques instants.'
      : 'Cloudinary a refusé une image. Vérifiez son format et réessayez.',
    { cause: lastError },
  );
  timeoutError.name = 'CloudinaryUploadError';
  timeoutError.statusCode = isRetryableUploadError(lastError) ? 504 : 502;
  timeoutError.expose = true;
  throw timeoutError;
}

function toMediaDocument(result, file) {
  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    resourceType: result.resource_type || 'raw',
    metadata: {
      originalName: file.originalname,
      mimeType: file.mimetype,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
      provider: 'cloudinary',
      folder: CLOUDINARY_SUPPLIER_MEDIA_FOLDER,
    },
  };
}

async function uploadSupplierMedia(files = []) {
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file, {
        source: 'supplier-files',
        folder: CLOUDINARY_SUPPLIER_MEDIA_FOLDER,
        resourceType: 'auto',
        tag: 'supplier-media',
      });
      uploaded.push({ result, file });
    }
    return uploaded.map(({ result, file }) => toMediaDocument(result, file));
  } catch (error) {
    await Promise.allSettled(uploaded.map(({ result }) => (
      deleteCloudinaryAsset(result.public_id, result.resource_type || 'image')
    )));
    throw error;
  }
}

async function deleteSupplierMedia(publicId, resourceType = 'image') {
  assertCloudinaryConfig();
  return deleteCloudinaryAsset(publicId, resourceType);
}

async function deleteCloudinaryAsset(publicId, resourceType = 'image') {
  const addresses = prioritizeUploadAddresses(await getUploadAddresses());
  const agent = createPinnedAgent(addresses[0]);
  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image',
      agent,
    });
  } finally {
    agent?.destroy();
  }
}

function toImageDocument(result, file) {
  return {
    secure_url: buildOptimizedUrl(result.public_id),
    public_id: result.public_id,
    metadata: {
      originalName: file.originalname,
      mimeType: file.mimetype,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      format: result.format,
      provider: 'cloudinary',
      folder: CLOUDINARY_PRODUCT_FOLDER,
    },
  };
}

async function uploadProductImages(files = [], options = {}) {
  const uploaded = [];

  try {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file, options);
      uploaded.push({ result, file });
    }

    return uploaded.map(({ result, file }) => toImageDocument(result, file));
  } catch (error) {
    await Promise.allSettled(uploaded.map(({ result }) => (
      deleteCloudinaryAsset(result.public_id, 'image')
    )));
    throw error;
  }
}

async function deleteProductImage(publicId) {
  assertCloudinaryConfig();

  if (!publicId) {
    const error = new Error('public_id requis');
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }

  return deleteCloudinaryAsset(publicId, 'image');
}

export {
  deleteProductImage,
  deleteSupplierMedia,
  uploadProductImages,
  uploadSupplierMedia,
};
