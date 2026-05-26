export default function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const line = `[http] ${req.method} ${req.originalUrl} → ${statusCode} (${duration}ms)`;

    if (statusCode >= 500) {
      console.error(line);
    } else if (statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  next();
}
