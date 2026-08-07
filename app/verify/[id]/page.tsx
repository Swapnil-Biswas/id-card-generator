import type { Metadata } from "next";
import { headers } from "next/headers";
import { ArrowLeft, Calendar, ShieldCheck, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { VerifyWalletCard } from "@/components/verify-wallet-card";
import { getCardRecord, type CardRecord } from "@/lib/db";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const card = await getCardRecord(id);
    if (!card) {
      return { title: "ID Card Not Found | HH Goa 2026" };
    }
    const headerList = await headers();
    const host = headerList.get("host") || "id-card-generator-chi-ochre.vercel.app";
    const protocol = headerList.get("x-forwarded-proto") || "https";
    const ogImageUrl = `${protocol}://${host}/api/og?id=${id}`;

    const pageTitle = `${card.name || "Builder"} | Verified ID Card · HH Goa 2026`;
    const pageDesc = `Official Verified Builder ID Card for ${card.name || "Attendee"} (${card.role || "Builder"}). Verified across DB and Web3 blockchain.`;

    return {
      title: pageTitle,
      description: pageDesc,
      openGraph: {
        title: pageTitle,
        description: pageDesc,
        images: [{ url: ogImageUrl, width: 840, height: 1440, alt: `${card.name}'s ID Card` }],
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description: pageDesc,
        images: [ogImageUrl],
      },
    };
  } catch {
    return { title: "Verified ID Card · HH Goa 2026" };
  }
}

export default async function VerifyPage({ params }: PageProps) {
  let id = "";
  let card: CardRecord | null = null;

  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    card = await getCardRecord(id);
  } catch (err) {
    console.error("Verification page fetch error:", err);
  }

  if (!card) {
    return (
      <main className="mx-auto flex min-h-[85vh] max-w-xl flex-col items-center justify-center p-6 text-center bg-goa-grid">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-red-500/15 border border-red-500/30 text-red-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h1 className="font-syne text-3xl font-extrabold uppercase tracking-tight text-[#F4C93B]">
          ID CARD NOT FOUND
        </h1>
        <p className="mt-2 font-mono text-xs text-[#8EB89B]">
          The verification ID <code className="text-[#F4C93B]">{id || "unknown"}</code> was not found in our registry database.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#F4C93B] px-5 py-3 font-mono text-xs font-bold text-[#062C1B] hover:bg-[#FFDC65] transition glow-gold"
        >
          <ArrowLeft className="h-4 w-4" /> Generate New ID Card
        </Link>
      </main>
    );
  }

  let formattedDate = "Oct 28–31, 2026";
  try {
    formattedDate = new Date(card.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    /* Fallback string */
  }

  return (
    <div className="min-h-screen bg-goa-grid">
      {/* Top Header Banner matching hhgoa.com */}
      <header className="border-b border-[#F4C93B]/20 bg-[#062C1B]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold text-[#8EB89B] hover:text-[#F4C93B] transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Generator
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#F4C93B]/30 bg-[#093823] px-3.5 py-1 font-mono text-xs font-bold text-[#F4C93B]">
            <Sparkles className="h-3.5 w-3.5 text-[#F4C93B]" /> HH GOA 2026 VERIFIED
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-8">
        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
          {/* Left Column: Attendee Card Preview */}
          <section className="glass-panel rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              {card.photoDataUrl ? (
                <img
                  src={card.photoDataUrl}
                  alt={card.name}
                  className="h-20 w-20 rounded-2xl border-2 border-[#F4C93B]/40 object-cover shadow-md bg-[#062C1B]"
                />
              ) : (
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[#093823] border border-[#F4C93B]/30 text-[#8EB89B]">
                  <User className="h-10 w-10" />
                </div>
              )}
              <div className="min-w-0">
                <span className="inline-block rounded-md bg-[#D94F8C] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white glow-pink">
                  Verified Builder
                </span>
                <h1 className="mt-1 truncate font-syne text-2xl font-extrabold uppercase text-[#F4C93B]">
                  {card.name || "Anonymous Builder"}
                </h1>
                <p className="truncate font-mono text-xs font-medium text-[#8EB89B]">
                  {card.role || "Hacker House Attendee"}
                </p>
              </div>
            </div>

            <hr className="border-[#175B3B]" />

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#8EB89B] uppercase tracking-wider block">
                  Builder Title
                </span>
                <span className="font-bold text-[#F4F1EA] text-sm">
                  {card.title || "HH Goa 2026 Participant"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#8EB89B] uppercase tracking-wider block">
                  Card Registry ID
                </span>
                <div className="mt-1.5 max-w-full overflow-hidden rounded-xl border border-[#175B3B] bg-[#062C1B] p-3 font-mono text-[10px] sm:text-xs text-[#F4C93B] break-all select-all shadow-inner leading-relaxed">
                  {card.id}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#8EB89B] pt-1">
                <Calendar className="h-3.5 w-3.5 text-[#F4C93B]" />
                <span>Issued on {formattedDate}</span>
              </div>
            </div>
          </section>

          {/* Right Column: Web3 Verification & Dual Status */}
          <section className="space-y-6">
            <div>
              <h2 className="font-syne text-2xl font-extrabold uppercase tracking-tight text-[#F4C93B]">
                IDENTITY & CHAIN VERIFICATION
              </h2>
              <p className="mt-1 font-mono text-xs text-[#8EB89B] leading-relaxed">
                Verify card authenticity against the official HH Goa database and EVM blockchain registry.
              </p>
            </div>

            <VerifyWalletCard initialCard={card} />
          </section>
        </div>
      </main>
    </div>
  );
}
