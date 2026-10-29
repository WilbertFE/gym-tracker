"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GradeCard, GradeLabel } from "@/components/items/grade-card";
import { ItemArt } from "@/components/items/item-art";
import { ItemIcon, ItemMedal } from "@/components/items/item-icon";
import { LoadoutPreview } from "@/components/items/loadout-preview";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { mergeLoadout, previewChanges, type LoadoutPreview as Preview } from "@/lib/item-art";
import { GRADE_ORDER, GRADES, itemById, itemsOfGrade, SLOTS, type Equipment, type Item, type Slot } from "@/lib/items";
import type { Rank } from "@/lib/ranks";

type CollectionClientProps = {
  rank: Rank;
  level: number;
  /** The name shown on the loadout card. */
  name: string;
  title: string | null;
  /** Ids of the items owned. */
  owned: string[];
  /** What is worn and saved. */
  worn: Equipment;
};

/**
 * The items you found, and a card showing you wearing them. Preview tries an item on the card without saving it,
 * Equip saves it. Nothing is saved until you say so, and Reset puts the card back to what is worn.
 */
export function CollectionClient({ rank, level, name, title, owned, worn }: CollectionClientProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview>({});
  const [busy, setBusy] = useState(false);

  const ownedSet = new Set(owned);
  const shown = mergeLoadout(worn, preview);
  const changes = previewChanges(worn, preview);

  function togglePreview(item: Item) {
    setPreview((current) => {
      const next = { ...current };
      if (current[item.slot] === item.id) delete next[item.slot];
      else next[item.slot] = item.id;
      return next;
    });
  }

  /** Saves one slot, and drops the preview of that slot since it is now what is worn. */
  async function save(slot: Slot, itemId: string | null, label: string): Promise<boolean> {
    const result = await apiRequest("/api/equipment", "PUT", { slot, itemId });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(itemId ? `${label} equipped` : `${label} taken off`);
    return true;
  }

  async function equipOne(item: Item) {
    if (busy) return;
    setBusy(true);
    const wornAlready = worn[item.slot] === item.id;
    const saved = await save(item.slot, wornAlready ? null : item.id, item.name);
    setBusy(false);
    if (!saved) return;
    setPreview((current) => {
      const next = { ...current };
      delete next[item.slot];
      return next;
    });
    router.refresh();
  }

  async function equipPreviewed() {
    if (busy || changes.length === 0) return;
    setBusy(true);
    let allSaved = true;
    for (const slot of changes) {
      const id = preview[slot] ?? null;
      const label = (id ? itemById(id)?.name : null) ?? SLOTS.find((s) => s.id === slot)?.name ?? "Item";
      if (!(await save(slot, id, label))) {
        allSaved = false;
        break;
      }
    }
    setBusy(false);
    if (allSaved) setPreview({});
    router.refresh();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <Panel label="You, wearing" variant="system" tour="looks">
          <LoadoutPreview rank={rank} level={level} name={name} title={title} equipment={shown} previewing={changes.length > 0} />

          <ul className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
            {SLOTS.map((slot) => {
              const item = shown[slot.id] ? itemById(shown[slot.id]!) : null;
              const previewed = preview[slot.id] !== undefined && preview[slot.id] !== worn[slot.id];
              return (
                <li key={slot.id} className="flex flex-col gap-0.5 border border-dashed px-3 py-2">
                  <span className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">{slot.name}</span>
                  <span className="text-sm" style={item ? { color: GRADES[item.grade].color } : undefined}>
                    {item ? item.name : "None"}
                    {previewed && <span className="tabular ml-1 text-[10px] uppercase tracking-widest text-primary">preview</span>}
                  </span>
                  {item && (
                    <button
                      type="button"
                      onClick={() => setPreview((current) => ({ ...current, [slot.id]: null }))}
                      className="tabular mt-0.5 self-start text-[10px] uppercase tracking-widest text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      aria-label={`Preview without ${item.name}`}
                    >
                      Take off
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {changes.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <Button type="button" className="h-11" onClick={equipPreviewed} disabled={busy}>
                {busy ? "Saving" : `Equip what I am previewing (${changes.length})`}
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setPreview({})} disabled={busy}>
                Reset
              </Button>
            </div>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-6">
        {[...GRADE_ORDER].reverse().map((grade) => {
          const items = itemsOfGrade(grade);
          // A grade nothing has been made for yet (Mythic) has no panel to show.
          if (items.length === 0) return null;
          const have = items.filter((i) => ownedSet.has(i.id)).length;
          return (
            <Panel key={grade} label={`${GRADES[grade].name}, ${have} of ${items.length}`} variant="plain">
              <ul className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                {items.map((item) => {
                  const has = ownedSet.has(item.id);
                  const isWorn = worn[item.slot] === item.id;
                  const previewed = preview[item.slot] === item.id;
                  return (
                    <GradeCard key={item.id} as="li" grade={grade} dim={!has} className="flex flex-col gap-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        {has ? <ItemMedal item={item} size={26} /> : <span aria-hidden className="size-[26px]" />}
                        <GradeLabel grade={grade} />
                      </div>
                      <div className="flex min-h-[104px] items-center justify-center">
                        {has ? (
                          <ItemArt item={item} rank={rank} size={84} />
                        ) : (
                          <ItemIcon id={item.id} className="size-12 opacity-25" />
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <p className="text-sm font-medium">{has ? item.name : "Not found yet"}</p>
                        <p className="tabular text-[11px] uppercase tracking-widest text-muted-foreground">
                          {SLOTS.find((s) => s.id === item.slot)?.name}
                        </p>
                        {has && <p className="text-xs text-muted-foreground">{item.blurb}</p>}
                      </div>
                      {has && (
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={previewed ? "default" : "outline"}
                            className="h-11 px-2"
                            onClick={() => togglePreview(item)}
                            aria-pressed={previewed}
                            aria-label={`${previewed ? "Stop previewing" : "Preview"} ${item.name}`}
                          >
                            {previewed ? "Previewing" : "Preview"}
                          </Button>
                          <Button
                            type="button"
                            variant={isWorn ? "default" : "outline"}
                            className="h-11 px-2"
                            onClick={() => equipOne(item)}
                            disabled={busy}
                            aria-pressed={isWorn}
                            aria-label={`${isWorn ? "Take off" : "Equip"} ${item.name}`}
                          >
                            {isWorn ? "Worn" : "Equip"}
                          </Button>
                        </div>
                      )}
                    </GradeCard>
                  );
                })}
              </ul>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
