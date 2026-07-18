/**
 * VOKAI's coding garden scene.
 *
 * This is the Clario garden UI ported to VOKAI: its local Lottie tree, pot,
 * flower, bee, leaf and frog assets now unlock from completed coding days.
 */
import React, { useEffect } from 'react';
import { Image, ImageBackground, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NcFlowerSpot } from './NcFlowerSpot';

const GARDEN_BG = require('../../assets/nc-garden-bg.png');
const TREE_WIND = require('../../assets/nc-tree-wind.json');
const TEAPOT = require('../../assets/nc-teapot.json');
const HONEY_BEE = require('../../assets/nc-honey-bee.json');
const AUTUMN = require('../../assets/nc-autumn.json');
const FROG = require('../../assets/nc-frog.json');
const FLORAL_IMG = require('../../assets/nc-floral.png');
const BERRY_IMG = require('../../assets/nc-berry.png');

let LottieView: React.ComponentType<any> | null = null;
try {
  LottieView = require('lottie-react-native').default ?? require('lottie-react-native');
} catch {
  // A development client without Lottie still renders the static background.
}

// Checking UIManager during module initialization can incorrectly report that a
// ready Lottie native view is unavailable. Rendering whenever the package loads
// makes the pot and other Clario garden animations work in the native client.
const lottieAvailable = LottieView != null;

function GardenLottie({ source, style, loop = true }: { source: any; style: any; loop?: boolean }) {
  if (!lottieAvailable || !LottieView) return null;
  return (
    <LottieView
      source={source}
      style={style}
      resizeMode="contain"
      autoPlay
      loop={loop}
      renderMode={Platform.OS === 'android' ? 'SOFTWARE' : 'AUTOMATIC'}
    />
  );
}

/** Clario's honey-bee asset and small in-garden flight path. */
function MovingBee({ w, h }: { w: number; h: number }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rotation = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withSequence(
      withTiming(w * 0.30, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      withTiming(w * 0.55, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      withTiming(w * 0.15, { duration: 1700, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    y.value = withRepeat(withSequence(
      withTiming(-h * 0.08, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      withTiming(h * 0.10, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
    ), -1, false);
    rotation.value = withRepeat(withSequence(
      withTiming(12, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      withTiming(-12, { duration: 900, easing: Easing.inOut(Easing.sin) }),
    ), -1, true);
  }, [h, rotation, w, x, y]);
  const flightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${rotation.value}deg` }] }));

  return <Animated.View style={[StyleSheet.absoluteFill, flightStyle]}><GardenLottie source={HONEY_BEE} style={StyleSheet.absoluteFill} /></Animated.View>;
}

type GardenSceneProps = {
  /** Total fully completed coding days. This controls the garden milestones. */
  dayCount: number;
  /** Finished tasks for the current day (0–3). This controls today's flowers. */
  completedCount: number;
  compact?: boolean;
};

const flowerSlots = [
  { left: '26%' as const, bottomPct: 9, variant: 0 as const, delay: 0 },
  { left: '42%' as const, bottomPct: 10, variant: 1 as const, delay: 500 },
  { left: '55%' as const, bottomPct: 8, variant: 0 as const, delay: 250 },
];

export function GardenScene({ dayCount, completedCount, compact = false }: GardenSceneProps) {
  const height = compact ? 175 : 265;
  const hasTeapot = dayCount >= 1;
  const hasFloral = dayCount >= 5;
  const hasButterfly = dayCount >= 5;
  const hasAutumn = dayCount >= 12;
  const hasTree = dayCount >= 21;
  const hasBerries = dayCount >= 45;
  const hasGardenBees = dayCount >= 60;
  const hasSecondAutumn = dayCount >= 80;
  const hasFrog = dayCount >= 90;

  return (
    <ImageBackground source={GARDEN_BG} style={[styles.scene, { height }]} imageStyle={styles.background} resizeMode="cover">
      {hasTree && <View style={[styles.layer, { left: '-2%', bottom: height * 0.04, width: '56%', height: height * 0.94, zIndex: 8 }]}>
        <GardenLottie source={TREE_WIND} style={StyleSheet.absoluteFill} />
      </View>}

      {hasAutumn && <View style={[styles.layer, { right: '6%', top: height * 0.05, width: '22%', height: height * 0.24, zIndex: 9 }]}><GardenLottie source={AUTUMN} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '14deg' }] }]} /></View>}
      {hasSecondAutumn && <View style={[styles.layer, { left: '6%', top: height * 0.05, width: '22%', height: height * 0.24, zIndex: 9 }]}><GardenLottie source={AUTUMN} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-14deg' }] }]} /></View>}

      {hasFloral && <Image source={FLORAL_IMG} resizeMode="contain" style={[styles.layer, { left: '4%', bottom: height * 0.25, width: '11%', height: height * 0.28, zIndex: 7 }]} />}

      {hasBerries && <>
        <Image source={BERRY_IMG} resizeMode="contain" style={[styles.layer, { left: '40%', bottom: height * 0.10, width: '18%', height: height * 0.26, zIndex: 11 }]} />
        <Image source={BERRY_IMG} resizeMode="contain" style={[styles.layer, { right: '2%', bottom: height * 0.10, width: '16%', height: height * 0.24, zIndex: 11 }]} />
      </>}

      {hasFrog && <View style={[styles.layer, { right: '34%', bottom: height * 0.03, width: '28%', height: height * 0.30, zIndex: 23 }]}><GardenLottie source={FROG} style={StyleSheet.absoluteFill} /></View>}
      {hasTeapot && <View style={[styles.layer, { right: '-2%', bottom: '-2%', width: '44%', height: height * 0.65, zIndex: 20 }]}><GardenLottie source={TEAPOT} style={StyleSheet.absoluteFill} /></View>}

      {flowerSlots.slice(0, Math.min(3, completedCount)).map((slot, index) => (
        <View key={index} style={[styles.flowerSlot, { left: slot.left, bottom: (height * slot.bottomPct) / 100 }]}>
          <NcFlowerSpot variant={slot.variant} layoutScale={compact ? 0.29 : 0.40} swayDelayMs={slot.delay} />
        </View>
      ))}

      {hasButterfly && <View style={[styles.layer, { left: '18%', top: height * 0.22, width: '16%', height: height * 0.16, zIndex: 24 }]}><MovingBee w={100} h={60} /></View>}
      {hasGardenBees && <View style={[styles.layer, { right: '18%', top: height * 0.16, width: '14%', height: height * 0.14, zIndex: 24 }]}><MovingBee w={80} h={45} /></View>}

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  scene: { width: '100%', overflow: 'hidden', backgroundColor: '#E8DFC8' },
  background: { borderRadius: 0 },
  layer: { position: 'absolute' },
  flowerSlot: { position: 'absolute', width: '22%', alignItems: 'center', zIndex: 22 },
});
