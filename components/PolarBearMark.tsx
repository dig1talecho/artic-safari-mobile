import Svg, { Circle, G, Path, Polygon } from "react-native-svg";

/**
 * Low-poly polar bear head, drawn as flat facets rather than curves.
 *
 * The faceting is deliberate: it echoes the geometric backdrop behind the
 * login card, so the mark reads as part of the same visual system instead
 * of a logo dropped on top of a pattern. Every facet is a straight-edged
 * polygon — no gradients inside the shape — which keeps it legible at
 * favicon size where soft shading would turn to mud.
 *
 * Single-colour by design (`color`), so it can sit on any background: white
 * on the dark aurora panel, brand cyan on white.
 */
export default function PolarBearMark({
  size = 72,
  color = "#FFFFFF",
  accent,
}: {
  size?: number;
  /** Main silhouette colour. */
  color?: string;
  /** Optional second tone for the shaded facets. Defaults to a translucent `color`. */
  accent?: string;
}) {
  const shade = accent ?? "rgba(0,0,0,0.16)";

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <G>
        {/* Ears — angular, set wide like a polar bear's small round ears */}
        <Polygon points="24,34 40,20 44,42" fill={color} />
        <Polygon points="96,34 80,20 76,42" fill={color} />
        {/* Inner ear facets */}
        <Polygon points="30,33 39,26 40,38" fill={shade} />
        <Polygon points="90,33 81,26 80,38" fill={shade} />

        {/* Skull — broad top tapering to the muzzle */}
        <Polygon points="26,44 60,26 94,44 98,66 60,80 22,66" fill={color} />

        {/* Cheek shading, left and right, to give the flat shape volume */}
        <Polygon points="22,66 26,44 42,52 38,72" fill={shade} />
        <Polygon points="98,66 94,44 78,52 82,72" fill={shade} />

        {/* Jaw / lower face wedge */}
        <Polygon points="38,72 60,80 82,72 74,96 60,104 46,96" fill={color} />

        {/* Muzzle — the pale patch every polar bear silhouette needs */}
        <Polygon points="47,74 73,74 78,92 60,101 42,92" fill={shade} />

        {/* Nose */}
        <Polygon points="52,80 68,80 60,90" fill={color} />

        {/* Eyes */}
        <Circle cx="44" cy="58" r="5.4" fill={shade} />
        <Circle cx="76" cy="58" r="5.4" fill={shade} />
        {/* Catchlights — tiny, but they're what make it read as alive */}
        <Circle cx="45.8" cy="56.2" r="1.7" fill={color} />
        <Circle cx="77.8" cy="56.2" r="1.7" fill={color} />

        {/* Brow facet across the top of the skull, catching the "light" */}
        <Path d="M34 46 L60 32 L86 46 L60 42 Z" fill={shade} opacity={0.55} />
      </G>
    </Svg>
  );
}
