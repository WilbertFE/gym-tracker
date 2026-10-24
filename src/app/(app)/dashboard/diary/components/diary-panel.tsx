import { format, parseISO } from "date-fns";
import { LogPhotoImage } from "@/components/log-photo-image";
import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { buildDiary } from "@/lib/diary";
import { listCheckins } from "@/lib/repositories/checkins";
import { listLogPhotos } from "@/lib/repositories/logPhotos";
import { listWeights } from "@/lib/repositories/weights";

export async function DiaryPanel() {
  const userId = await getCurrentUserId();
  const [photos, checkins, weights] = await Promise.all([
    listLogPhotos(userId),
    listCheckins(userId),
    listWeights(userId),
  ]);
  const days = buildDiary({ photos, checkins, weights });

  if (days.length === 0) {
    return (
      <Panel label="Photos">
        <p className="text-sm text-muted-foreground">
          No photos yet. Add some to a daily check-in on the dashboard, or to a weigh-in on the Body
          page, and they will show up here by day.
        </p>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const heading = format(parseISO(day.date), "EEEE d MMMM yyyy");
        return (
          <Panel key={day.date} label={heading}>
            <div className="flex flex-col gap-4">
              <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {day.checkin && (
                  <span>
                    {day.checkin.went_to_gym ? "Went to the gym" : "Rest day"}
                    {day.checkin.mood ? `, mood ${day.checkin.mood}/5` : ""}
                    {day.checkin.energy ? `, energy ${day.checkin.energy}/5` : ""}
                  </span>
                )}
                {day.weights.map((w) => (
                  <span key={w.id}>Weighed {w.weight_kg.toFixed(1)} kg</span>
                ))}
              </p>

              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {day.photos.map((photo, index) => (
                  <li key={photo.id}>
                    <a
                      href={`/api/log-photos/${photo.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open photo ${index + 1} from ${heading} in a new tab`}
                    >
                      <LogPhotoImage
                        id={photo.id}
                        alt={`${photo.source === "checkin" ? "Check-in" : "Weigh-in"} photo from ${heading}`}
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
