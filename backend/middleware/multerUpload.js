import multer from 'multer';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 10;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: MAX_IMAGE_COUNT,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }

    cb(null, true);
  },
});

function handleMulterError(err, _req, res, next) {
  if (!err) {
    next();
    return;
  }

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: 'Image trop lourde. Taille maximale : 5 Mo',
      LIMIT_FILE_COUNT: 'Maximum 10 images par article',
      LIMIT_UNEXPECTED_FILE: 'Format image non autorisé. Utilisez JPG, PNG ou WebP',
    };

    res.status(400).json({ error: messages[err.code] || 'Upload image invalide' });
    return;
  }

  next(err);
}

export { MAX_IMAGE_COUNT, MAX_IMAGE_SIZE, upload, handleMulterError };
