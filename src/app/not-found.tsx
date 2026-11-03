import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="max-w-xl">
      <h1 className="font-display text-5xl">No such page</h1>
      <p className="text-ink-soft mt-5 text-lg">
        The address may be mistyped, or the page has moved. The games are all listed in the lobby.
      </p>
      <ButtonLink href="/" className="mt-8">
        Go to the lobby
      </ButtonLink>
    </section>
  );
}
