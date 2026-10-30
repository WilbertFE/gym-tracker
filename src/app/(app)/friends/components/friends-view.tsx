import Link from "next/link";
import { FeatureGate } from "@/components/feature-gate";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { getCard, listLinks } from "@/lib/repositories/friends";
import { FriendsManager } from "./friends-manager";
import { GetCodeCard } from "./get-code-card";

/** The Friends page: the first step until you have a code, then your code, your friends and their requests. */
export async function FriendsView() {
  const userId = await getCurrentUserId();
  const { available, card } = await getCard(userId);

  return (
    <FeatureGate id="friends">
      {!available ? (
        <Panel label="Friends">
          <p className="text-sm text-muted-foreground">Friends are not set up yet. They appear here as soon as the database is updated.</p>
        </Panel>
      ) : !card ? (
        <GetCodeCard />
      ) : (
        <FriendsContent userId={userId} card={card} />
      )}
    </FeatureGate>
  );
}

async function FriendsContent({ userId, card }: { userId: string; card: { code: string; name: string; level: number } }) {
  const links = await listLinks(userId);
  // The page gets a friendship id, a name and a level. The other player's user id stays on the server.
  const person = ({ id, name, level }: { id: string; name: string; level: number }) => ({ id, name, level });
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/friends/boss"
        className="font-display inline-flex h-11 items-center justify-center self-start border border-primary/40 bg-background/60 px-4 text-xs font-semibold tracking-wide hover:border-primary/70 hover:bg-primary/10"
      >
        Go to the weekly boss
      </Link>
      <FriendsManager
        card={card}
        friends={links.filter((l) => l.status === "accepted").map(person)}
        incoming={links.filter((l) => l.status === "pending" && l.direction === "incoming").map(person)}
        outgoing={links.filter((l) => l.status === "pending" && l.direction === "outgoing").map(person)}
      />
    </div>
  );
}
