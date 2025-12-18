export function errorMiddleware(err, req, res, next) {
  console.error(err.message);

  res.status(400).json({
    ok: false,
    message: err.message || 'Erro interno'
  });
}
