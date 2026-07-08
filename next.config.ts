import type { NextConfig } from "next";

// Change this to match your GitHub repo name exactly (case-sensitive).
// Your site will be served at: https://<username>.github.io/<REPO_NAME>/
const REPO_NAME = "que-practice-app";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? `/${REPO_NAME}` : "",
  assetPrefix: isProd ? `/${REPO_NAME}/` : "",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
