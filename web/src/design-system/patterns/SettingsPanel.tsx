import { usePreferences, type Density, type Palette } from "../providers/PreferencesProvider";
import { SegmentedControl } from "../primitives/tabs";
import { Switch } from "../primitives/inputs";

/** Settings popover content: theme, density, palette, reduce motion. */
export function SettingsPanel() {
  const p = usePreferences();
  return (
    <div className="space-y-5">
      <Row label="Theme">
        <SegmentedControl
          value={p.theme}
          onValueChange={(v) => p.setTheme(v as "dark" | "light")}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
      </Row>
      <Row label="Density">
        <SegmentedControl
          value={p.density}
          onValueChange={(v) => p.setDensity(v as Density)}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
      </Row>
      <Row label="Palette">
        <SegmentedControl
          value={p.palette}
          onValueChange={(v) => p.setPalette(v as Palette)}
          options={[
            { value: "default", label: "Default" },
            { value: "colorblind", label: "Colorblind-safe" },
          ]}
        />
      </Row>
      <Row label="Reduce motion">
        <Switch checked={p.reduceMotion} onCheckedChange={p.setReduceMotion} aria-label="Reduce motion" />
      </Row>
      <Row label="Reduce transparency">
        <Switch checked={p.reduceTransparency} onCheckedChange={p.setReduceTransparency} aria-label="Reduce transparency" />
      </Row>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-body text-secondary">{label}</span>
      {children}
    </div>
  );
}
