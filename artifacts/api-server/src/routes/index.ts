import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ownerRouter from "./owner";
import customersRouter from "./customers";
import invoicesRouter from "./invoices";
import subordersRouter from "./suborders";
import shopRouter from "./shop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ownerRouter);
router.use(customersRouter);
router.use(invoicesRouter);
router.use(subordersRouter);
router.use(shopRouter);

export default router;
