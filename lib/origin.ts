export function canonicalOrigin(
  env: Record<string, string | undefined> = process.env,
): string {
  const supplied =
    env.SITE_URL ||
    (env.VERCEL_ENV === "preview"
      ? env.VERCEL_URL
      : env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL);
  if (!supplied) {
    if (env.VERCEL)
      throw new Error(
        "Configure SITE_URL or expose Vercel system environment variables.",
      );
    return "http://localhost:3000";
  }
  const url = new URL(
    supplied.includes("://") ? supplied : `https://${supplied}`,
  );
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw new Error(
      "SITE_URL must be an origin without a path, credentials, query or fragment.",
    );
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(url.hostname)
  )
    throw new Error("SITE_URL must use HTTPS.");
  return url.origin;
}
export function cardUrl() {
  return `${canonicalOrigin()}/card`;
}
