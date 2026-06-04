import express from "express";
import path from "path";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security with helmet (configured to work well with Vite in dev)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite uses inline scripts, so we don't enforce strict CSP in helmet for the server yet or let index.html handle it.
      crossOriginEmbedderPolicy: false
    })
  );

  // Apply rate limiting to all requests
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
  });
  app.use(limiter);

  // Implement CORS restrictivo para las rutas API
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://tu-dominio-produccion.com', 'https://*.run.app'] // Ajusta a tus dominios en producción
      : '*', // Permisivo en desarrollo
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  // Rutas API predeterminadas con protección CORS y limitación
  const apiRouter = express.Router();
  apiRouter.use(cors(corsOptions));
  
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Dummy endpoints en un futuro para evitar alertas de vulnerabilidad
  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Statics para SPA
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
