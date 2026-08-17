import { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgGradient, Polygon, Rect, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");

/**
 * Low-poly faceted backdrop, in the spirit of the reference design but in
 * the arctic palette instead of orange.
 *
 * The whole thing is generated once from a seeded PRNG and rendered as a
 * static SVG — no animation, no per-frame work. That's a deliberate trade:
 * the reference's appeal comes from crisp flat facets, and animating them
 * would both fight that and cost battery on a screen the user sees for
 * fifteen seconds.
 *
 * Construction: a jittered triangular lattice. Points sit on a grid but each
 * is nudged by up to half a cell, so the triangles vary in shape while still
 * tiling the plane without gaps. Each facet gets a slightly different opacity
 * of white or black, which is what produces the "folded paper" read.
 */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const COLS = 6;
const ROWS = 11;

function buildFacets() {
  const rand = seeded(73412);
  const cellW = W / COLS;
  const cellH = H / ROWS;

  // Jittered lattice — interior points move, edge points stay pinned so the
  // pattern always reaches the screen edges cleanly.
  const grid: { x: number; y: number }[][] = [];
  for (let r = 0; r <= ROWS; r++) {
    const row: { x: number; y: number }[] = [];
    for (let c = 0; c <= COLS; c++) {
      const edge = r === 0 || c === 0 || r === ROWS || c === COLS;
      const jx = edge ? 0 : (rand() - 0.5) * cellW * 0.85;
      const jy = edge ? 0 : (rand() - 0.5) * cellH * 0.85;
      row.push({ x: c * cellW + jx, y: r * cellH + jy });
    }
    grid.push(row);
  }

  const facets: { points: string; fill: string; opacity: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tl = grid[r][c];
      const tr = grid[r][c + 1];
      const bl = grid[r + 1][c];
      const br = grid[r + 1][c + 1];

      // Split each cell into two triangles, alternating the diagonal so the
      // pattern doesn't develop a visible directional grain.
      const flip = (r + c) % 2 === 0;
      const tris = flip
        ? [
            [tl, tr, bl],
            [tr, br, bl],
          ]
        : [
            [tl, tr, br],
            [tl, br, bl],
          ];

      for (const tri of tris) {
        const lift = rand();
        facets.push({
          points: tri.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
          fill: lift > 0.5 ? "#FFFFFF" : "#000000",
          // Kept low — these are surface facets, not shapes in their own right.
          opacity: lift > 0.5 ? 0.018 + rand() * 0.05 : 0.03 + rand() * 0.07,
        });
      }
    }
  }
  return facets;
}

/** Deep arctic teal, the palette's answer to the reference's orange. */
const DEFAULT_COLORS = ["#0E7C8C", "#0A5566", "#063A48"] as const;

export default function FacetedBackdrop({
  colors = DEFAULT_COLORS,
}: {
  colors?: readonly [string, string, ...string[]];
}) {
  const facets = useMemo(buildFacets, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7DE7EB" stopOpacity="0.16" />
            <Stop offset="0.55" stopColor="#5CE1E6" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#02141C" stopOpacity="0.35" />
          </SvgGradient>
        </Defs>
        {facets.map((f, i) => (
          <Polygon key={i} points={f.points} fill={f.fill} fillOpacity={f.opacity} />
        ))}
        {/* Single sheen pass over the facets ties them into one surface. */}
        <Rect x="0" y="0" width={W} height={H} fill="url(#sheen)" />
      </Svg>
    </View>
  );
}
