import { ReviewsClient } from "@/components/dashboard/reviews-client";
import { listReviews } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const items = listReviews({});
  const summary = {
    average: items.length ? Math.round((items.reduce((a, b) => a + b.rating, 0) / items.length) * 10) / 10 : 0,
    count: items.length,
    unreplied: items.filter((r) => !r.reply).length,
    distribution: [5, 4, 3, 2, 1].map((star) => ({ star, count: items.filter((r) => r.rating === star).length })),
  };
  return <ReviewsClient initial={items} summary={summary} />;
}
