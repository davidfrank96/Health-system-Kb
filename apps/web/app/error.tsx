"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
	return (
		<main className="login">
			<section className="login-box">
				<h1>Workspace unavailable</h1>
				<p role="alert">We could not load this workspace.</p>
				<button type="button" className="primary" onClick={reset}>
					Try again
				</button>
			</section>
		</main>
	);
}
