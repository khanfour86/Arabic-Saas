import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import router from "./routes";

const app: Express = express();

const configuredOrigins = (process.env["ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "https://arabic-saas-tailoring-saas.vercel.app",
  ...configuredOrigins,
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // السماح إذا كان الطلب محلياً، أو من القائمة، أو من أي Preview/Production URL على Vercel
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
