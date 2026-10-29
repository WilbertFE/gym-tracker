import type { CSSProperties } from "react";
import { plateStyleFor } from "@/lib/item-art";
import { GRADES, plateByWord, type Grade } from "@/lib/items";
import { cn } from "@/lib/utils";

type NameplateProps = {
  text: string;
  grade: Grade;
  size?: "sm" | "md";
  className?: string;
};

/**
 * A nameplate, dressed for its grade: a plain chip for Common, brackets and a glow for Rare, a gradient edge for
 * Epic, a crest with notched corners and gold text for Legendary. The look is in `globals.css` (`.nameplate`).
 */
export function Nameplate({ text, grade, size = "md", className }: NameplateProps) {
  const style = plateStyleFor(grade);
  return (
    <span className={cn("nameplate", className)} data-style={style} data-size={size} style={{ "--grade": GRADES[grade].color } as CSSProperties}>
      <span className="nameplate-inner">
        <span className="nameplate-text">{text}</span>
        {(style === "gradient" || style === "crest") && <span aria-hidden className="nameplate-shine" />}
      </span>
    </span>
  );
}

/**
 * A nameplate known only by its word, as on the leaderboard. Plate words are unique, so the word finds its item and
 * with it the grade. A word that is not a plate is shown as plain text.
 */
export function NameplateWord({ word, size = "sm", className }: { word: string; size?: "sm" | "md"; className?: string }) {
  const item = plateByWord(word);
  return item ? <Nameplate text={item.value} grade={item.grade} size={size} className={className} /> : <span className={className}>{word}</span>;
}
