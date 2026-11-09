/**
 * Design mockup (docs/DESIGN_MOCKUP.png) — the 8 screens exist and follow the design rules.
 *
 * These tests check structure and rules, not copy: UI text lives in messages/*.json and
 * numbers come from the database (BR-19), so hardcoded mockup figures must NOT appear.
 */
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

const src = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await walk(rel)));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

const SCREENS = [
  ["1 Bosh sahifa", "components/home/HomeExperience.tsx", [/\/api\/v1\/public\/home|home\.stats|stats\./]],
  ["2 Kasblar katalogi", "app/kasblar/page.tsx", [/TradeGrid/, /\/api\/v1\/public\/home/]],
  ["3 Onlayn ariza", "components/apply/ApplicationWizard.tsx", [/\/api\/v1\/applications/, /step/]],
  ["4 Ish beruvchi portali", "app/ish-beruvchilar/page.tsx", [/\/api\/v1\/public\//]],
  ["5 Tinglovchi kabineti", "app/kabinet/page.tsx", [/StudentHome/, /\/api\/v1\/cabinet\/dashboard/]],
  ["6 Lug'at moduli", "app/kabinet/lugat/page.tsx", [/\/api\/v1\/vocab\/today/, /\/api\/v1\/vocab\/answers/]],
  ["7 Usta profili va QR pasport", "app/ustalar/[slug]/page.tsx", [/\/api\/v1\/public\/workers\//, /QrMark|verify/]],
  ["8 Administrator paneli", "app/kabinet/page.tsx", [/AdminHome/, /AdminCharts/]],
];

for (const [name, file, patterns] of SCREENS) {
  test(`Screen ${name}: exists and reads real data`, async () => {
    const code = await src(file);
    for (const pattern of patterns) {
      assert.match(code, pattern, `${file} should match ${pattern}`);
    }
  });
}

test("BR-19: mockup placeholder figures are not hardcoded in screens", async () => {
  const fake = /\b(3 ?200|1 ?950|1 ?480\+?|\+34%|\+42%|\+37%|UB-2025-0148|Abdullayev Jahongir)\b/;
  for (const [, file] of SCREENS) {
    assert.doesNotMatch(await src(file), fake, `${file} contains a mockup placeholder number`);
  }
});

test("Design rule: colors come from packages/ui tokens, not hardcoded hex classes", async () => {
  const files = [...(await walk("app")), ...(await walk("components"))];
  const offenders = [];
  for (const file of files) {
    const hits = (await src(file)).match(/\b(?:bg|text|border|ring|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/g);
    if (hits) {
      offenders.push(`${file}: ${hits.join(", ")}`);
    }
  }
  assert.equal(offenders.length, 0, `hardcoded hex color classes:\n${offenders.join("\n")}`);
});

test("Design rule: every public page uses the shared page shell", async () => {
  const pages = [
    "app/aloqa/page.tsx",
    "app/loyiha/page.tsx",
    "app/yonalishlar/page.tsx",
    "app/hamkorlar/page.tsx",
    "app/yangiliklar/page.tsx",
    "app/ustalar/page.tsx",
    "app/obyektlar/page.tsx",
    "app/materiallar/page.tsx",
    "app/brigadalar/page.tsx",
    "app/kasblar/page.tsx",
    "app/qidiruv/page.tsx",
  ];
  for (const page of pages) {
    assert.match(await src(page), /PageHeader|PAGE/, `${page} should use components/site/PageHeader`);
  }
});

test("Images: trade photos are transparent WebP files that exist", async () => {
  const media = await src("lib/media.ts");
  const paths = [...media.matchAll(/"(\/media\/[^"]+)"/g)].map((match) => match[1]);
  assert.ok(paths.length >= 12);
  for (const path of paths) {
    assert.match(path, /\.webp$/, `${path} should be a transparent .webp`);
    await stat(new URL(`../public${path}`, import.meta.url));
  }
});
