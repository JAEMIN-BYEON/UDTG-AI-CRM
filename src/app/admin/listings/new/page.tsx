import Link from "next/link";
import { ListingForm } from "@/components/ListingForm";

export default function NewListingPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin/listings" className="text-sm text-slate-400 hover:text-slate-600">← 물량 목록</Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold">물량 등록</h1>
      <ListingForm />
    </main>
  );
}
