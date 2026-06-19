import { Router, type IRouter } from "express";
import healthRouter from "./health";
import puzzleRouter from "./puzzle";
import playersRouter from "./players";
import statsRouter from "./stats";
import ugcRouter from "./ugc";
import partnerRouter from "./partner";

const router: IRouter = Router();

router.use(healthRouter);
router.use(puzzleRouter);
router.use(playersRouter);
router.use(statsRouter);
router.use(ugcRouter);
router.use(partnerRouter);

export default router;
