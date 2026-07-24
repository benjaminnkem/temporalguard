"use client";

import { DataState } from "../../components/shared/data-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <DataState
      state="error"
      title="This page could not be loaded"
      description="The rest of TemporalGuard is still available. Retry this view or use the navigation."
      onRetry={reset}
    >
      <span />
    </DataState>
  );
}
