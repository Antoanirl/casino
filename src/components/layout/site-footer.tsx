import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-felt-900 border-t border-white/10">
      <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-sm text-zinc-400">
        <p>{siteConfig.disclaimer}</p>
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. A portfolio project.
        </p>
      </div>
    </footer>
  );
}
