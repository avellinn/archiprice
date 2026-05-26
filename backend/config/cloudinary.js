import { v2 as cloudinary } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

function assertCloudinaryConfig() {
  const missing = [
    ['CLOUDINARY_CLOUD_NAME', CLOUDINARY_CLOUD_NAME],
    ['CLOUDINARY_API_KEY', CLOUDINARY_API_KEY],
    ['CLOUDINARY_API_SECRET', CLOUDINARY_API_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    const error = new Error(`Configuration Cloudinary manquante : ${missing.join(', ')}`);
    error.statusCode = 500;
    error.expose = true;
    throw error;
  }
}

export { assertCloudinaryConfig, cloudinary };
