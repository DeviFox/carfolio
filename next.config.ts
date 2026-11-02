import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
	output: "export",
	// Static hosting (nginx) serves car/index.html for /car/; a flat car.html
	// is reachable only by client navigation and 404s on reload.
	trailingSlash: true,
};

export default nextConfig;
