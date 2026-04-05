import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// إعداد CORS ليكون مرناً مع روابط Vercel المختلفة
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://arabic-saas-tailoring-saas.vercel.app"
    ];

    // السماح إذا كان الطلب محلياً، أو من القائمة، أو ينتهي بـ .vercel.app
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تأكد أن هذا السطر يطابق ما يتوقعه الـ Frontend (سواء / أو /api)
app.use("/api", router);

export default app;
