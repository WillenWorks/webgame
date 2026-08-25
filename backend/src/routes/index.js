import devRoutes from "./dev.routes.js";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import caseRoutes from "./case.routes.js";
import routeRoutes from "./route.routes.js";
import warrantRoutes from "./warrant.routes.js";
import suspectRoutes from "./suspect.routes.js";
import dossierRoutes from "./dossier.routes.js";
import cityRoutes from "./city.routes.js";
import capturedRoutes from "../controllers/captured.controller.js";

export default function registerRoutes(app) {
  app.use("/api/v1/dev", devRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/profiles", profileRoutes);
  app.use("/api/v1/cases", caseRoutes);
  app.use("/api/v1/routes", routeRoutes);
  app.use("/api/v1", warrantRoutes);
  app.use("/api/v1/cases", suspectRoutes);
  app.use("/api/v1/cases", dossierRoutes);
  app.use("/api/v1/city", cityRoutes);
  app.use("/api/v1/captured", capturedRoutes);
}
