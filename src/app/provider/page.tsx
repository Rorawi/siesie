import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, CircleHelp } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function ProviderPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7f3] px-4 py-10 text-[#18231e]">
      <section className="w-full max-w-xl rounded-[24px] border border-[#e1e8df] bg-white p-6 shadow-[0_16px_40px_rgba(30,60,42,0.07)] sm:p-9">
        <BrandLogo compact />
        <span className="mt-8 grid h-12 w-12 place-items-center rounded-xl bg-[#edf3e9] text-[#315d40]"><BriefcaseBusiness className="h-5 w-5" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-[#728078]">Provider workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Provider tools are not available yet.</h1>
        <p className="mt-3 text-sm leading-6 text-[#69776e]">Siesie is currently handling requests through a dispatcher. This page will be updated when provider registration, live job assignment and earnings tools are connected to the service.</p>
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-[#f6f8f4] p-4"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-[#607364]" /><p className="text-sm leading-5 text-[#657269]">No sample jobs, provider earnings or live availability are shown here.</p></div>
        <Link href="/app" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#174b35] px-4 text-sm font-bold text-white hover:bg-[#103e2c]"><ArrowLeft className="h-4 w-4" />Return to customer services</Link>
      </section>
    </main>
  );
}
