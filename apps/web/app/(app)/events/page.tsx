import type { Metadata } from "next";
import { EventCatalogueView } from "../../../features/events/event-catalogue-view";

export const metadata: Metadata = { title: "Events" };

export default function EventsPage() {
  return <EventCatalogueView />;
}
