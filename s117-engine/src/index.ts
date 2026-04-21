import app from "./app";

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Legal Decision Agent v0.5.0 running on http://localhost:${PORT}`);
  console.log(`Health:              GET  http://localhost:${PORT}/api/health`);
  console.log(`Agent:               POST http://localhost:${PORT}/api/agent/evaluate`);
  console.log(`s117 (legacy):       POST http://localhost:${PORT}/api/s117/evaluate`);
  console.log(`Direct infringement: POST http://localhost:${PORT}/api/direct-infringement/evaluate`);
});
