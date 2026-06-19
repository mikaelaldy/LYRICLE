import { Router, type IRouter } from "express";
import healthRouter from "./health";
import puzzleRouter from "./puzzle";
import playersRouter from "./players";

const router: IRouter = Router();

router.use(healthRouter);
router.use(puzzleRouter);
router.use(playersRouter);

export default router;
