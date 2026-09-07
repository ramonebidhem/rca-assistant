import multer from 'multer';
import { AppError } from '../lib/errors.js';

// Keep uploads in memory so sharp can process the buffer before writing.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB raw upload cap (compressed after)
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|bmp|tiff)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, 'bad_request', 'Only image files are allowed'));
    }
  },
});
