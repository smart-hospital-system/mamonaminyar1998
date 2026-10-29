import { PublicBooking } from "@/components/public-booking";
import { BUSINESS } from "@/lib/types";
import { publicDays, publicServices, publicStaff } from "@/lib/public-booking";

export const metadata = {
  title: `Book an appointment · ${BUSINESS.name}`,
  description: `${BUSINESS.tagline} — book your next appointment online in under a minute.`,
};

export const dynamic = "force-dynamic";

export default function BookPage() {
  // Render the catalogue on the server so the first paint is never an empty list.
  const initial = {
    services: publicServices(),
    staff: publicStaff(),
    date: publicDays()[0].date,
    slots: [],
    days: publicDays(),
  };
  return <PublicBooking initial={initial} />;
}
