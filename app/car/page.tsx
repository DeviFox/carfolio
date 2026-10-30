import { Suspense } from "react";
import CarPageClient from "./car-page-client";

export default function Page() {
	return (
		<Suspense fallback={<div aria-busy="true" />}>
			<CarPageClient />
		</Suspense>
	);
}