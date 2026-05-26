import { Readable } from 'node:stream';
import { assertCloudinaryConfig, cloudinary } from '../config/cloudinary.js';

const CLOUDINARY_PRODUCT_FOLDER = 'archiprice/products';

function buildOptimizedUrl(publicId) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { fetch_format: 'auto', quality: 'auto' },
    ],
  });
}

function uploadBufferToCloudinary(file, options = {}) {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_PRODUCT_FOLDER,
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        use_filename: false,
        tags: ['archiprice', 'product'],
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

    Readable.from(file.buffer).pipe(uploadStream);
  });
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
      cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' })
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

  return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export {
  CLOUDINARY_PRODUCT_FOLDER,
  deleteProductImage,
  uploadProductImages,
};
