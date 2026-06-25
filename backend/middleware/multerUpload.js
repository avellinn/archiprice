import multer from 'multer';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
  },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }

    cb(null, true);
  },
});

const MAX_MEDIA_SIZE = 20 * 1024 * 1024;
const ALLOWED_MEDIA_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_MIME_TYPES,
  'video/mp4',
  'video/webm',
  'application/pdf',
]);

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MEDIA_SIZE },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MEDIA_MIME_TYPES.has(file.mimetype)) {
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
      LIMIT_UNEXPECTED_FILE: 'Format image non autorisé. Utilisez JPG, PNG ou WebP',
    };

    res.status(400).json({ error: messages[err.code] || 'Upload image invalide' });
    return;
  }

  next(err);
}

export { upload, mediaUpload, handleMulterError };
