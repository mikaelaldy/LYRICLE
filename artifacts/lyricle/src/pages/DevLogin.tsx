import { useEffect, useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function DevLogin() {
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    async function signIn() {
      try {
        const res = await fetch("/api/dev-signin");
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const { ticket } = await res.json();
        window.location.href = `${window.location.origin}${basePath}/sign-in?__clerk_ticket=${ticket}`;
      } catch {
        setStatus("error");
      }
    }
    signIn();
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="text-5xl">🎵</div>

      {status === "loading" ? (
        <>
          <p className="text-lg font-semibold text-gray-700">Signing you in as test player…</p>
          <p className="text-sm text-gray-400">This only works in development mode.</p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-red-500">Dev sign-in failed</p>
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm shadow-sm space-y-2 w-full max-w-xs">
            <p className="font-medium text-gray-600">Use these credentials manually:</p>
            <div className="space-y-1 font-mono text-gray-800">
              <p>📧 lyricletest@mailinator.com</p>
              <p>🔑 Lyricle2026!</p>
            </div>
            <p className="text-xs text-gray-400 pt-1">
              Get the email code at{" "}
              <a
                href="https://www.mailinator.com/v4/public/inboxes.jsp?to=lyricletest"
                target="_blank"
                rel="noreferrer"
                className="text-orange-500 underline"
              >
                mailinator.com
              </a>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
