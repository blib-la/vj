import transpileModules from "next-transpile-modules";

const withTM = transpileModules([
	"@mui/joy",
	"@captn/joy",
	"@captn/utils",
	"@captn/react",
	"@captn/theme",
]);

/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "export",
	trailingSlash: true,
	images: {
		unoptimized: true,
	},
};

export default withTM(nextConfig);
