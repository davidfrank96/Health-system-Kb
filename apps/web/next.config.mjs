export default {
	poweredByHeader: false,
	devIndicators: false,
	serverExternalPackages: ["pg"],
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "Cache-Control", value: "private, no-store" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "same-origin" },
					{ key: "X-Frame-Options", value: "DENY" },
				],
			},
		];
	},
};
