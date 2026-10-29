import { CustomerDetail } from "@/components/dashboard/customer-detail";
import { customerBookings, customerPayments, getCustomer } from "@/lib/queries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = getCustomer(id);
  if (!customer) notFound();

  return (
    <CustomerDetail
      customer={customer}
      bookings={customerBookings(id)}
      payments={customerPayments(id)}
    />
  );
}
