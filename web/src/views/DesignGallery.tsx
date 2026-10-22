import { PageHeader } from "../design-system/patterns/PageHeader";
import { Card } from "../design-system/primitives/Card";
import { Button } from "../design-system/primitives/Button";
import { ScoreChip, RankBadge, ConfidenceBadge, RobustPickBadge } from "../design-system/primitives/badges";
import { Chip } from "../design-system/primitives/Chip";
import { Input } from "../design-system/primitives/inputs";
import { LENS_LABEL, LENS_ORDER, SUBSCORE_COLOR, SUBSCORE_LABEL, SUBSCORE_ORDER } from "../state/lensMeta";
import {
  BumpChart,
  ChartFrame,
  ChartLegend,
  HeatmapMatrix,
  Histogram,
  HistogramTable,
  PercentileBars,
  PercentileTable,
  RadarChart,
  RankWhisker,
  Sparkline,
  StackedBar,
  SubScoreBars,
  SubScoreTable,
  Waterfall,
  binValues,
} from "../design-system/charts";

const AXES = SUBSCORE_ORDER.map((id) => ({ id, label: SUBSCORE_LABEL[id] }));
const RADAR = [
  { id: "area", label: "Sample area", color: "#5D8647", values: [82, 64, 71, 44, 58, 67] },
  { id: "state", label: "State average", color: "#0072B2", values: [61, 58, 55, 52, 49, 57] },
  { id: "us", label: "US median", color: "#8A8378", values: [50, 50, 50, 50, 50, 50] },
];
const CONTRIB = [18.4, 13.2, 21.7, 11.6, 9.3, 7.8].map((value, i) => ({
  id: SUBSCORE_ORDER[i],
  label: SUBSCORE_LABEL[SUBSCORE_ORDER[i]],
  value,
  color: SUBSCORE_COLOR[SUBSCORE_ORDER[i]],
}));
const HIST_VALUES = Array.from({ length: 500 }, (_, i) => 40 + 18 * Math.sin(i * 0.7) * Math.cos(i * 0.13) + (i % 11));
const HIST_BINS = binValues(HIST_VALUES, 18);
const HEAT_ROWS = ["Los Angeles, CA", "Cook, IL", "Harris, TX", "Maricopa, AZ", "Miami-Dade, FL", "San Diego, CA", "Clark, NV", "Bexar, TX"];
const HEAT = HEAT_ROWS.flatMap((row, y) =>
  LENS_ORDER.map((lens, x) => ({ row, col: LENS_LABEL[lens], value: 0.2 + ((x * 7 + y * 13) % 70) / 100 })),
);
const BUMP_STEPS = ["Default", "Need +", "Reach +", "Insur +", "Balanced"];
const BUMP_SERIES = ["Duval, FL", "Cumberland, ME", "Sumter, FL", "Lackawanna, PA", "Horry, SC", "Polk, FL"].map((label, i) => ({
  id: `s${i}`,
  label,
  color: ["#5D8647", "#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9"][i],
  ranks: [i + 1, 1 + ((i * 3) % 6), 1 + ((i * 5 + 2) % 6), 1 + ((i * 2 + 4) % 6), 1 + ((i + 3) % 6)],
}));
const INCOME = [
  { id: "low", label: "< $25k", color: "#DCE8D2", value: 0.22 },
  { id: "mid", label: "$25–50k", color: "#A9C596", value: 0.31 },
  { id: "upper", label: "$50–100k", color: "#7FA663", value: 0.29 },
  { id: "high", label: "> $100k", color: "#5D8647", value: 0.18 },
];
const PCT = AXES.map((a, i) => ({
  id: a.id,
  label: a.label,
  value: RADAR[0].values[i],
  stateValue: RADAR[1].values[i],
  usValue: 50,
  color: SUBSCORE_COLOR[SUBSCORE_ORDER[i]],
}));
const TREND = [12, 13, 12.5, 14, 15.2, 15];

export default function DesignGallery() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Design Gallery" description="Primitives, patterns, and tokens for verification." />
      <div className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartFrame
            title="Sub-score radar"
            subtitle="Six fixed axes, 0–100"
            vintage="ACS 2020–2024"
            summary="The sample area leads on size and need while trailing on affordability; the state average sits near the US median."
            table={<SubScoreTable axes={AXES} series={RADAR} />}
          >
            <RadarChart axes={AXES} series={RADAR} height={300} ariaLabel="Sample sub-score radar" />
          </ChartFrame>
          <ChartFrame
            title="Radar bars twin"
            subtitle="Same values without colour or hover"
            vintage="ACS 2020–2024"
            summary="Bars give every axis a direct label so the profile reads without colour."
            table={<SubScoreTable axes={AXES} series={RADAR} />}
          >
            <SubScoreBars axes={AXES} series={RADAR} className="py-2" />
          </ChartFrame>
          <ChartFrame
            title="Contribution waterfall"
            subtitle="Points that sum exactly to the total"
            vintage="ACS 2020–2024"
            summary="Size and need contribute the most to this score; insurability the least."
            table={
              <table className="w-full text-left text-body-sm">
                <thead><tr className="border-b border-subtle text-caption text-tertiary"><th className="py-2 pr-3 font-medium">Sub-score</th><th className="py-2 text-right font-medium">Points</th></tr></thead>
                <tbody>{CONTRIB.map((c) => <tr key={c.id} className="border-b border-subtle last:border-0"><th scope="row" className="py-2 pr-3 font-normal text-secondary">{c.label}</th><td className="py-2 text-right font-mono text-mono text-primary">{c.value.toFixed(1)}</td></tr>)}</tbody>
              </table>
            }
          >
            <Waterfall items={CONTRIB} ariaLabel="Sample contribution waterfall" height={280} />
          </ChartFrame>
          <ChartFrame
            title="Percentile bullets"
            subtitle="Area marker, state dot and US tick"
            vintage="ACS 2020–2024"
            summary="Each row places the area against its state and the US on a 0–100 percentile track."
            table={<PercentileTable items={PCT} />}
          >
            <PercentileBars items={PCT} className="py-2" />
          </ChartFrame>
          <ChartFrame
            title="Metric distribution"
            subtitle="Selected area marked on the histogram"
            vintage="ACS 2020–2024"
            summary="The selected area sits above the middle of the national distribution."
            table={<HistogramTable bins={HIST_BINS} />}
          >
            <Histogram values={HIST_VALUES} selected={63} ariaLabel="Sample metric histogram" />
          </ChartFrame>
          <ChartFrame
            title="Rank stability"
            subtitle="P(top 50) across lenses"
            vintage="Simulated"
            summary="Most areas that rank well under the default lens stay in the top half under the others."
            table={
              <table className="w-full text-left text-body-sm">
                <thead><tr className="border-b border-subtle text-caption text-tertiary"><th className="py-2 pr-2 font-medium">Area</th>{LENS_ORDER.map((l) => <th key={l} className="py-2 pr-2 text-right font-medium">{LENS_LABEL[l]}</th>)}</tr></thead>
                <tbody>{HEAT_ROWS.map((row) => <tr key={row} className="border-b border-subtle last:border-0"><th scope="row" className="py-1.5 pr-2 font-normal text-secondary">{row}</th>{HEAT.filter((c) => c.row === row).map((c) => <td key={c.col} className="py-1.5 pr-2 text-right font-mono text-mono text-primary">{Math.round(c.value * 100)}%</td>)}</tr>)}</tbody>
              </table>
            }
          >
            <HeatmapMatrix rows={HEAT_ROWS} cols={LENS_ORDER.map((l) => LENS_LABEL[l])} cells={HEAT} ariaLabel="Sample rank-stability heatmap" />
          </ChartFrame>
          <ChartFrame
            title="Rank movement"
            subtitle="Top 15 as weights change"
            vintage="Simulated"
            summary="Ranks move within a few places as the lens changes; the leading areas are stable."
            table={
              <table className="w-full text-left text-body-sm">
                <thead><tr className="border-b border-subtle text-caption text-tertiary"><th className="py-2 pr-2 font-medium">Area</th>{BUMP_STEPS.map((s) => <th key={s} className="py-2 pr-2 text-right font-medium">{s}</th>)}</tr></thead>
                <tbody>{BUMP_SERIES.map((s) => <tr key={s.id} className="border-b border-subtle last:border-0"><th scope="row" className="py-1.5 pr-2 font-normal text-secondary">{s.label}</th>{s.ranks.map((r, i) => <td key={BUMP_STEPS[i]} className="py-1.5 pr-2 text-right font-mono text-mono text-primary">#{r}</td>)}</tr>)}</tbody>
              </table>
            }
          >
            <BumpChart steps={BUMP_STEPS} series={BUMP_SERIES} ariaLabel="Sample rank bump chart" />
          </ChartFrame>
          <ChartFrame
            title="Income mix"
            subtitle="Households aged 65+"
            vintage="ACS 2020–2024"
            summary="Most households sit between $25k and $100k; about a fifth are below $25k."
            table={
              <table className="w-full text-left text-body-sm">
                <thead><tr className="border-b border-subtle text-caption text-tertiary"><th className="py-2 pr-3 font-medium">Bracket</th><th className="py-2 text-right font-medium">Share</th></tr></thead>
                <tbody>{INCOME.map((s) => <tr key={s.id} className="border-b border-subtle last:border-0"><th scope="row" className="py-1.5 pr-3 font-normal text-secondary">{s.label}</th><td className="py-1.5 text-right font-mono text-mono text-primary">{Math.round(s.value * 100)}%</td></tr>)}</tbody>
              </table>
            }
          >
            <div className="space-y-3 py-2">
              <StackedBar segments={INCOME} ariaLabel="Sample income distribution" />
              <ChartLegend items={INCOME.map((s) => ({ id: s.id, label: s.label, color: s.color }))} active={Object.fromEntries(INCOME.map((s) => [s.id, true]))} onToggle={() => {}} />
            </div>
          </ChartFrame>
        </div>

        <Card title="Inline marks">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-body-sm text-secondary">60+ growth <Sparkline values={TREND} label="60+ growth trend, sample" /></div>
            <div className="flex items-center gap-2 text-body-sm text-secondary">Rank range <RankWhisker p05={6} p50={12} p95={21} label="Sample rank range" showValues /></div>
          </div>
        </Card>

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
