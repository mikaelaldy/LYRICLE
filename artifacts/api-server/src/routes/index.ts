import { Router, type IRouter } from "express";
import healthRouter from "./health";
import puzzleRouter from "./puzzle";
import playersRouter from "./players";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(puzzleRouter);
router.use(playersRouter);
router.use(statsRouter);

export default router;
