import app from "./app.js";
import { initDb } from "./db.js";

const port = Number(process.env.PORT) || 4000;

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
