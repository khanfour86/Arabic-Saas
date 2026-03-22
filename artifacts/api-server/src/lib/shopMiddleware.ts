import { type RequestHandler } from "express";
import { requireAuth, requireShopRole, type AuthUser } from "./auth";
import { db, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const isShopUser: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    requireShopRole("shop_manager", "reception", "tailor")(req, res, next);
  });
};

export const isManagerOrReception: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    requireShopRole("shop_manager", "reception")(req, res, next);
  });
};

export const isManager: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    requireShopRole("shop_manager")(req, res, next);
  });
};

export const isTailor: RequestHandler = (req, res, next) => {
  requireAuth(req, res, () => {
    requireShopRole("shop_manager", "tailor")(req, res, next);
  });
};

export const requireActiveShop: RequestHandler = async (req, res, next) => {
  const user = (req as any).user as AuthUser;
  if (!user?.shopId) { next(); return; }
  try {
    const [shop] = await db
      .select({ subscriptionStatus: shopsTable.subscriptionStatus })
      .from(shopsTable)
      .where(eq(shopsTable.id, user.shopId));
    if (shop?.subscriptionStatus === 'expired' || shop?.subscriptionStatus === 'suspended') {
      const label = shop.subscriptionStatus === 'expired' ? 'منتهي' : 'موقوف';
      res.status(403).json({
        error: `المحل حالته ${label}، يمكنك فقط الاطلاع على البيانات السابقة وتصدير النسخة الاحتياطية.`,
        subscriptionStatus: shop.subscriptionStatus,
      });
      return;
    }
    next();
  } catch {
    next();
  }
};
