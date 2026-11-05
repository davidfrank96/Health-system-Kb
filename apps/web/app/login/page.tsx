import { Brand } from "../../components/brand";
export default async function Login({
	searchParams,
}: {
	searchParams: Promise<{ reason?: string }>;
}) {
	const { reason } = await searchParams;
	return (
		<main className="login">
			<section className="login-box">
				<Brand />
				<h1>Staff sign in</h1>
				<p>Use your approved staff account to access the health workspace.</p>
				{reason && (
					<p role="alert">
						{reason === "denied"
							? "Access denied. An approved account and environment membership are required."
							: "Sign-in is temporarily unavailable. Try again."}
					</p>
				)}
				<a href="/auth/login" className="primary">
					Continue to sign in <span aria-hidden="true">→</span>
				</a>
			</section>
		</main>
	);
}
