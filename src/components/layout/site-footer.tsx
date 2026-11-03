import { StampMark } from "@/components/ui/logo";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-rule bg-paper-deep border-t">
      <div className="text-ink-soft mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex max-w-md gap-3">
          <StampMark className="h-7 w-7 shrink-0" />
          <p>{siteConfig.disclaimer}</p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p>A portfolio project.</p>
          <a href={siteConfig.sourceUrl} className="hover:text-ink underline underline-offset-2">
            Source code on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
