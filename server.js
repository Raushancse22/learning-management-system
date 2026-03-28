const express = require("express");

const { PUBLIC_DIR, UPLOADS_DIR, initializeDatabase } = require("./src/db");
const { seedDatabase } = require("./src/seed");
const { ensureStorageReady } = require("./src/storage");
const { cleanupRequestFiles } = require("./src/uploads");

const publicRoutes = require("./src/routes/public");
const learningRoutes = require("./src/routes/learning");
const manageRoutes = require("./src/routes/manage");
const adminRoutes = require("./src/routes/admin");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

app.use("/api", publicRoutes);
app.use("/api", learningRoutes);
app.use("/api", manageRoutes);
app.use("/api", adminRoutes);

app.use((request, response) => {
  if (request.path.startsWith("/api")) {
    response.status(404).json({ message: "API route not found." });
    return;
  }

  response.sendFile(`${PUBLIC_DIR}/index.html`);
});

app.use((error, request, response, _next) => {
  cleanupRequestFiles(request);
  response.status(error.statusCode || 500).json({
    message: error.message || "Something went wrong while handling the request.",
  });
});

async function startServer() {
  await initializeDatabase();
  await ensureStorageReady();
  await seedDatabase();

  app.listen(PORT, () => {
    console.log(`Gatemate Learning running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Gatemate Learning:", error);
  process.exit(1);
});
