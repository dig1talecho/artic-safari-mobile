import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
  type ColorValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

// ─────────────────────────────────────────────────────────────────────────────
// AURORA ANIMATION ENGINE
//
// Design constraint that drives everything here: this must run inside Expo Go,
// so no Skia / no Reanimated worklets. What that leaves is React Native's
// built-in Animated API — which is genuinely enough, *provided* every animated
// property is one the native driver can own.
//
// The native driver serialises an animation once and hands it to the platform's
// animation system. After that the JS thread is out of the loop entirely: no
// per-frame bridge traffic, no jank when JS is busy, no battery cost from a
// spinning requestAnimationFrame. The catch is that it only supports
// `transform` and `opacity` — never width/height/top/left/colors.
//
// So the aurora is built exclusively from transforms and opacity:
//
//   1. CURTAINS — each band is a LinearGradient whose colour stops fade to
//      transparent at both ends, rotated to a diagonal. Rotation and the soft
//      stops are static; what animates is translateX (lateral drift), scaleY
//      (the band "breathing" taller and shorter) and opacity (shimmer).
//      Three bands with deliberately co-prime durations (17s / 23s / 29s) means
//      the composite never visibly repeats — the pattern only realigns after
//      ~3.2 hours, so it reads as organic rather than looping.
//
//   2. STARS — 70 dots, but only SIX shared twinkle drivers. Each star picks a
//      driver and its own scale factor. Six looping animations instead of
//      seventy is the difference between smooth and stuttering on a mid-range
//      Android.
//
//   3. SHOOTING STAR — one reusable Animated.Value driven 0→1, mapped to a
//      diagonal translate plus a fade in/out. Re-armed on a random 7–16s timer,
//      so it feels occasional rather than metronomic.
//
// Accessibility: if the OS "reduce motion" setting is on, every animation is
// skipped and a static composition renders instead. Motion sensitivity is a
// real condition, and a full-screen drifting background is exactly the kind of
// thing that triggers it.
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Curtain = {
  colors: readonly [ColorValue, ColorValue, ...ColorValue[]];
  rotate: string;
  top: number;
  height: number;
  driftX: number;
  duration: number;
  opacityRange: [number, number];
};

const CURTAINS: Curtain[] = [
  {
    // Signature aurora green — the brightest, highest band.
    colors: ["transparent", "rgba(16,222,150,0.55)", "rgba(34,211,238,0.35)", "transparent"],
    rotate: "-16deg",
    top: -SCREEN_H * 0.12,
    height: SCREEN_H * 0.75,
    driftX: 110,
    duration: 17000,
    opacityRange: [0.35, 0.75],
  },
  {
    // Violet counter-band, drifting the other way for depth.
    colors: ["transparent", "rgba(139,92,246,0.42)", "rgba(56,189,248,0.30)", "transparent"],
    rotate: "13deg",
    top: SCREEN_H * 0.02,
    height: SCREEN_H * 0.62,
    driftX: -85,
    duration: 23000,
    opacityRange: [0.25, 0.6],
  },
  {
    // Low teal haze near the horizon — slowest, faintest.
    colors: ["transparent", "rgba(45,212,191,0.34)", "transparent"],
    rotate: "-6deg",
    top: SCREEN_H * 0.22,
    height: SCREEN_H * 0.5,
    driftX: 65,
    duration: 29000,
    opacityRange: [0.18, 0.45],
  },
];

const STAR_COUNT = 70;
const TWINKLE_DRIVERS = 6;

/** Deterministic PRNG so the star field is identical across re-renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function AuroraCurtain({ config, animate }: { config: Curtain; animate: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: config.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: config.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, config.duration, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-config.driftX, config.driftX],
  });
  // Vertical "breathing" — the band stretches and relaxes as it drifts.
  const scaleY = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [config.opacityRange[0], config.opacityRange[1], config.opacityRange[0]],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.curtain,
        {
          top: config.top,
          height: config.height,
          opacity: animate ? opacity : config.opacityRange[1],
          transform: animate
            ? [{ rotate: config.rotate }, { translateX }, { scaleY }]
            : [{ rotate: config.rotate }],
        },
      ]}
    >
      <LinearGradient
        colors={config.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function StarField({ animate }: { animate: boolean }) {
  // Six shared drivers rather than one per star — see the note up top.
  const drivers = useRef(
    Array.from({ length: TWINKLE_DRIVERS }, () => new Animated.Value(0))
  ).current;

  const stars = useMemo(() => {
    const rand = seeded(20260816);
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      left: rand() * SCREEN_W,
      // Keep stars in the upper two-thirds; the login card sits lower.
      top: rand() * SCREEN_H * 0.72,
      size: rand() < 0.86 ? 1.5 : 2.5,
      base: 0.25 + rand() * 0.45,
      driver: Math.floor(rand() * TWINKLE_DRIVERS),
    }));
  }, []);

  useEffect(() => {
    if (!animate) return;
    const loops = drivers.map((driver, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 420),
          Animated.timing(driver, {
            toValue: 1,
            duration: 1600 + i * 340,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(driver, {
            toValue: 0,
            duration: 1600 + i * 340,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [animate, drivers]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((star) => (
        <Animated.View
          key={star.id}
          style={[
            styles.star,
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: animate
                ? drivers[star.driver].interpolate({
                    inputRange: [0, 1],
                    outputRange: [star.base * 0.35, star.base],
                  })
                : star.base,
            },
          ]}
        />
      ))}
    </View>
  );
}

function ShootingStar({ animate }: { animate: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [path, setPath] = useState({ startX: SCREEN_W * 0.1, startY: SCREEN_H * 0.15 });

  useEffect(() => {
    if (!animate) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const fire = () => {
      if (cancelled) return;
      // New entry point each time so it never traces the same line twice.
      setPath({
        startX: SCREEN_W * (0.05 + Math.random() * 0.5),
        startY: SCREEN_H * (0.06 + Math.random() * 0.3),
      });
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;
        timer = setTimeout(fire, 7000 + Math.random() * 9000);
      });
    };

    timer = setTimeout(fire, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [animate, progress]);

  if (!animate) return null;

  const travel = SCREEN_W * 0.55;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, travel * 0.62] });
  // Fade in fast, linger, fade out — a hard cut at either end looks fake.
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.85, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shootingStar,
        { left: path.startX, top: path.startY, opacity, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.62 }}
        style={styles.shootingStarTrail}
      />
    </Animated.View>
  );
}

/**
 * Full-screen animated arctic night. Render it as the first child of a
 * relatively-positioned parent; it fills the parent and ignores touches.
 */
export default function AuroraSky() {
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active) setAnimate(!reduced);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      setAnimate(!reduced);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Night sky base: deepest at the horizon, lifting toward midnight blue. */}
      <LinearGradient
        colors={["#03050C", "#061021", "#04101C", "#02060E"]}
        locations={[0, 0.38, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <StarField animate={animate} />

      {CURTAINS.map((config, i) => (
        <AuroraCurtain key={i} config={config} animate={animate} />
      ))}

      <ShootingStar animate={animate} />

      {/* Bottom scrim — buys guaranteed contrast for the form no matter where
          the aurora happens to drift. Static, so it costs nothing. */}
      <LinearGradient
        colors={["transparent", "rgba(3,5,12,0.55)", "rgba(3,5,12,0.92)"]}
        locations={[0, 0.55, 1]}
        style={styles.bottomScrim}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    position: "absolute",
    left: -SCREEN_W * 0.35,
    width: SCREEN_W * 1.7,
  },
  star: { position: "absolute", backgroundColor: "#EAF4FF" },
  shootingStar: { position: "absolute", width: 90, height: 60 },
  shootingStarTrail: { flex: 1, borderRadius: 2, transform: [{ rotate: "0deg" }] },
  bottomScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: SCREEN_H * 0.55 },
});
