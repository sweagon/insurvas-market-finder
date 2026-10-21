import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { Button } from "../design-system/primitives/Button";
import { ScoreChip, RankBadge, ConfidenceBadge, RobustPickBadge } from "../design-system/primitives/badges";
import { Chip } from "../design-system/primitives/Chip";
import { Input } from "../design-system/primitives/inputs";

export default function DesignGallery() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Design Gallery" description="Primitives, patterns, and tokens for verification." />
      <div className="space-y-4 p-4 md:p-6">
        <Card title="Buttons">
          <div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="destructive">Destructive</Button><Button variant="link">Link</Button></div>
        </Card>
        <Card title="Badges">
          <div className="flex flex-wrap items-center gap-2"><ScoreChip value={87.4} /><RankBadge rank={12} /><ConfidenceBadge level="high" /><RobustPickBadge /></div>
        </Card>
        <Card title="Chips & Inputs">
          <div className="flex flex-wrap items-center gap-2"><Chip>Filter</Chip><Chip>Active</Chip><Input placeholder="Search..." className="w-64" /></div>
        </Card>
        <Card title="Accent"><div className="h-10 w-40 rounded-control" style={{ background: "var(--accent)" }} /></Card>
      </div>
    </div>
  );
}
