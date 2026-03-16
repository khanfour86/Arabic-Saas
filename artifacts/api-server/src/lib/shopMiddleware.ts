import { type RequestHandler } from "express";
import { requireAuth, requireShopRole } from "./auth";

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
