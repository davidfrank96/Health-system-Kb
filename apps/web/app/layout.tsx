import "./style.css";
export const metadata = {
	title: "Kbean Health System",
	robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
