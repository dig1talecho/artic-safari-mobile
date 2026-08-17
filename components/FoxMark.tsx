import Svg, { Circle, G, Polygon } from "react-native-svg";

/**
 * Low-poly arctic fox head.
 *
 * Faceted rather than curved so it belongs to the same visual system as the
 * geometric backdrop behind the login card. Straight-edged polygons also
 * survive being scaled down to app-icon size, where soft shading turns to
 * mud.
 *
 * Arctic fox specifically, not a red fox: taller narrower ears and a
 * shorter muzzle, which keeps it distinct from the very common red-fox
 * logo silhouette.
 */
export default function FoxMark({
  size = 72,
  color = "#FFFFFF",
  accent,
}: {
  size?: number;
  /** Main silhouette colour. */
  color?: string;
  /** Shaded facets. Defaults to a translucent black wash over `color`. */
  accent?: string;
}) {
  const shade = accent ?? "rgba(0,0,0,0.18)";

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <G>
        {/* Ears — tall, sharply pointed, angled outward */}
        <Polygon points="18,14 46,34 30,54" fill={color} />
        <Polygon points="102,14 74,34 90,54" fill={color} />
        {/* Inner ear facets */}
        <Polygon points="26,22 42,34 32,45" fill={shade} />
        <Polygon points="94,22 78,34 88,45" fill={shade} />

        {/* Upper skull — wide brow tapering toward the muzzle */}
        <Polygon points="30,54 60,36 90,54 94,74 60,86 26,74" fill={color} />

        {/* Cheek ruffs — the angular flare either side of a fox's face */}
        <Polygon points="26,74 30,54 44,62 40,80" fill={shade} />
        <Polygon points="94,74 90,54 76,62 80,80" fill={shade} />

        {/* Snout wedge down to the nose */}
        <Polygon points="40,80 60,86 80,80 70,102 60,110 50,102" fill={color} />

        {/* Pale muzzle patch */}
        <Polygon points="48,82 72,82 74,98 60,107 46,98" fill={shade} />

        {/* Nose */}
        <Polygon points="53,88 67,88 60,97" fill={color} />

        {/* Eyes — angled inward for the alert fox expression */}
        <Polygon points="38,60 52,64 46,71" fill={shade} />
        <Polygon points="82,60 68,64 74,71" fill={shade} />
        <Circle cx="45" cy="65" r="1.8" fill={color} />
        <Circle cx="75" cy="65" r="1.8" fill={color} />

        {/* Brow facet catching the light across the top of the skull */}
        <Polygon points="36,56 60,42 84,56 60,52" fill={shade} opacity={0.5} />
      </G>
    </Svg>
  );
}
