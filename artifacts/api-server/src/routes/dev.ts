import { Router, type IRouter } from "express";

const router: IRouter = Router();

const TEST_USER_ID = "user_3FOWKfxteSzaEi19QuEij7Tbzrc";

router.get("/dev-signin", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    const response = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        expires_in_seconds: 3600,
      }),
    });

    const data = (await response.json()) as any;

    if (!data.token) {
      res.status(500).json({ error: "Failed to create sign-in token" });
      return;
    }

    res.json({ ticket: data.token });
  } catch {
    res.status(500).json({ error: "Failed to create sign-in token" });
  }
});

export default router;
