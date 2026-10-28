import { Panel } from "@/components/panel";
import { getCurrentUserId } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listMeasurements } from "@/lib/repositories/measurements";
import { listPhotos } from "@/lib/repositories/photos";
import { getSettings } from "@/lib/repositories/settings";
import { listWeights } from "@/lib/repositories/weights";
import { PhotoBrowser } from "./photo-browser";
import { PhotoCompare } from "./photo-compare";
import { PhotoUploadForm } from "./photo-upload-form";

export async function PhotosSection() {
  const userId = await getCurrentUserId();
  const [photos, weights, measurements, settings] = await Promise.all([
    listPhotos(userId),
    listWeights(userId),
    listMeasurements(userId),
    getSettings(userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Panel label="Compare">
        <PhotoCompare
          photos={photos}
          weights={weights}
          measurements={measurements}
          unit={settings.weight_unit}
        />
      </Panel>

      <Panel label="Upload a photo">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Photos are private to your account. They have no public link and are only shown to you
            while you are signed in.
          </p>
          <PhotoUploadForm today={todayISO()} />
        </div>
      </Panel>

      <Panel label={`Gallery, ${photos.length} photos`}>
        <PhotoBrowser photos={photos} />
      </Panel>
    </div>
  );
}
