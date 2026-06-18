import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Yorimo API listening on http://localhost:${env.PORT}`);
  console.log(`Swagger UI available at http://localhost:${env.PORT}/api-docs`);
});
