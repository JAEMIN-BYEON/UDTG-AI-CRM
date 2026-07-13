import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ListingForm } from "@/components/ListingForm";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin/listings" className="text-sm text-slate-400 hover:text-slate-600">← 물량 목록</Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">물량 수정 — {listing.brand} {listing.category}</h1>
      <ListingForm listing={listing} />
    </main>
  );
}
