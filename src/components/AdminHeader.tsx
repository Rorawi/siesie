import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

type AdminSection = "requests" | "leads";

const sections: { id: AdminSection; label: string; href: string }[] = [
  { id: "requests", label: "Dispatch", href: "/admin/requests" },
  { id: "leads", label: "Lead capture", href: "/admin/leads" },
];

export default function AdminHeader({ active }: { active: AdminSection }) {
  return (
    <header className="rounded-[24px] bg-[#123d2c] px-4 py-3 text-white shadow-[0_14px_34px_rgba(18,61,44,0.12)] sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/requests" aria-label="Siesie operations" className="shrink-0 rounded-lg focus-visible:outline-white">
          <BrandLogo inverse compact />
        </Link>
        <nav aria-label="Admin navigation" className="flex items-center gap-1 rounded-xl bg-white/10 p-1">
          {sections.map((section) => {
            const selected = section.id === active;
            return (
              <Link
                key={section.id}
                href={section.href}
                aria-current={selected ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold transition ${selected ? "bg-[#c7e08d] text-[#183c2a]" : "text-white/85 hover:bg-white/10 hover:text-white"}`}
              >
                {section.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
