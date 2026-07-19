import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';

export type LeaderboardEntry = {
  id: string;
  name: string;
  points: number;
  profileImageUrl?: string;
  isCurrentUser?: boolean;
};

type LeaderboardCityProps = {
  entries: LeaderboardEntry[];
  onSelect?: (entry: LeaderboardEntry) => void;
};

type Orbit = { yaw: number; pitch: number; distance: number };

const BUILDING_COLORS = ['#F3AA31', '#70A65A', '#628FC0', '#B86C77', '#9376B8', '#C98245', '#5B9E99', '#D77D74'];
const PLOTS: Array<[number, number]> = [[0, 0], [-2.2, .7], [2.2, .7], [-2, -1.55], [2, -1.55], [-3.15, -1.2], [3.15, -1.2], [0, 2.2]];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0] || 'Learner';
  return first.length > 13 ? `${first.slice(0, 11)}…` : first;
}

function addTree(scene: THREE.Group, x: number, z: number, scale = 1) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.07 * scale, .1 * scale, .52 * scale, 7), new THREE.MeshStandardMaterial({ color: '#866345', roughness: .95 }));
  trunk.position.set(x, .26 * scale, z);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(.36 * scale, 10, 8), new THREE.MeshStandardMaterial({ color: '#4F8756', roughness: .88 }));
  crown.position.set(x, .7 * scale, z);
  crown.castShadow = true;
  scene.add(trunk, crown);
}

function createBuilding(entry: LeaderboardEntry, rank: number, height: number, x: number, z: number) {
  const building = new THREE.Group();
  building.position.set(x, 0, z);
  const color = new THREE.Color(entry.isCurrentUser ? '#FFA116' : BUILDING_COLORS[rank % BUILDING_COLORS.length]);
  const darkColor = color.clone().multiplyScalar(.62);
  const lightColor = color.clone().lerp(new THREE.Color('#FFF2C9'), .23);
  const stone = new THREE.MeshStandardMaterial({ color: '#D7BF8D', roughness: .92 });
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: .68, metalness: .03 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: lightColor, roughness: .58, metalness: .05 });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: darkColor, roughness: .72 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, .16, 1.5), stone);
  base.position.y = .08;
  base.castShadow = true;
  base.receiveShadow = true;
  building.add(base);

  // One closed, opaque cube makes the tower solid at every camera angle.
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.16, height, 1.16), bodyMaterial);
  body.position.y = .16 + height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  building.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, .15, 1.3), roofMaterial);
  roof.position.y = .16 + height + .075;
  roof.castShadow = true;
  building.add(roof);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(.19, .23, .25, 6), trimMaterial);
  crown.position.y = .16 + height + .27;
  crown.castShadow = true;
  building.add(crown);

  const floorCount = clamp(Math.round(height * 2.1), 3, 13);
  for (let floor = 1; floor < floorCount; floor += 1) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(1.205, .027, 1.205), trimMaterial);
    band.position.y = .16 + height * (floor / floorCount);
    building.add(band);
  }
  return building;
}

function ThreeCityCanvas({ entries, heightScale }: { entries: LeaderboardEntry[]; heightScale: number }) {
  const frameRef = useRef<number | null>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; gl: ExpoWebGLRenderingContext; buildings: THREE.Group[] } | null>(null);
  const orbitRef = useRef<Orbit>({ yaw: .72, pitch: .72, distance: 11.5 });
  const dragStart = useRef<Orbit>(orbitRef.current);
  const heightScaleRef = useRef(heightScale);
  const entryKey = entries.map((entry) => `${entry.id}:${entry.points}`).join('|');

  useEffect(() => { heightScaleRef.current = heightScale; }, [heightScale]);
  useEffect(() => () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); }, []);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => { dragStart.current = { ...orbitRef.current }; },
    onPanResponderMove: (_, gesture) => {
      orbitRef.current = {
        ...dragStart.current,
        yaw: dragStart.current.yaw - gesture.dx * .012,
        pitch: clamp(dragStart.current.pitch + gesture.dy * .009, .36, 1.2),
      };
    },
  }), []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const renderer = new Renderer({ gl, antialias: true }) as unknown as THREE.WebGLRenderer;
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor('#BFE2EF', 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#BFE2EF', 12, 23);
    const camera = new THREE.PerspectiveCamera(43, gl.drawingBufferWidth / gl.drawingBufferHeight, .1, 100);
    scene.add(new THREE.HemisphereLight('#FFF9DE', '#789D6D', 2.15));
    const sun = new THREE.DirectionalLight('#FFF1C4', 2.6);
    sun.position.set(-6, 11, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const terrain = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: '#C9E2B4', roughness: 1 }));
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);
    const pathMaterial = new THREE.MeshStandardMaterial({ color: '#F5E7C6', roughness: .96 });
    const pathOne = new THREE.Mesh(new THREE.BoxGeometry(17, .022, .46), pathMaterial);
    pathOne.position.y = .014;
    pathOne.rotation.y = -.44;
    const pathTwo = new THREE.Mesh(new THREE.BoxGeometry(.43, .024, 17), pathMaterial);
    pathTwo.position.y = .016;
    pathTwo.rotation.y = -.44;
    scene.add(pathOne, pathTwo);

    [[-4.7, -3.8], [-4.2, 2.6], [4.25, 2.9], [4.45, -2.7], [-2.8, 3.9], [2.6, -3.95]].forEach(([x, z], index) => addTree(scene, x, z, .85 + (index % 3) * .12));

    const buildings = entries.slice(0, PLOTS.length).map((entry, rank) => {
      const [x, z] = PLOTS[rank];
      // Height uses absolute points, not relative rank: a 10-point learner has
      // a starter tower, while each larger point total earns a visibly taller one.
      const buildingHeight = clamp(.72 + Math.sqrt(Math.max(0, entry.points)) * .18, .72, 6.2);
      const building = createBuilding(entry, rank, buildingHeight, x, z);
      scene.add(building);
      return building;
    });

    sceneRef.current = { renderer, scene, camera, gl, buildings };
    const render = () => {
      const current = sceneRef.current;
      if (!current) return;
      const orbit = orbitRef.current;
      current.camera.position.set(Math.sin(orbit.yaw) * orbit.distance, 5.2 + Math.sin(orbit.pitch) * 5.8, Math.cos(orbit.yaw) * orbit.distance);
      current.camera.lookAt(0, 2.25, 0);
      current.buildings.forEach((building) => { building.scale.y = heightScaleRef.current; });
      current.renderer.render(current.scene, current.camera);
      current.gl.endFrameEXP();
      frameRef.current = requestAnimationFrame(render);
    };
    render();
  }, [entries]);

  return <View style={styles.scene} {...panResponder.panHandlers}>
    <GLView key={entryKey} style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
    <View pointerEvents="none" style={styles.sceneHint}><Text style={styles.sceneHintText}>DRAG TO ORBIT · SOLID 3D TOWERS</Text></View>
  </View>;
}

export function LeaderboardCity({ entries, onSelect }: LeaderboardCityProps) {
  const ranked = useMemo(() => [...entries].sort((left, right) => right.points - left.points || left.name.localeCompare(right.name)), [entries]);
  const [selectedId, setSelectedId] = useState(ranked[0]?.id ?? '');
  const [heightScale, setHeightScale] = useState(1);
  useEffect(() => { if (!ranked.some((entry) => entry.id === selectedId)) setSelectedId(ranked[0]?.id ?? ''); }, [ranked, selectedId]);
  if (!ranked.length) return null;
  const selected = ranked.find((entry) => entry.id === selectedId) ?? ranked[0];
  const changeHeight = (amount: number) => setHeightScale((value) => clamp(Number((value + amount).toFixed(2)), .7, 1.5));

  return <View style={styles.shell}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>THREE.JS LEARNING CITY</Text><Text style={styles.title}>Score City</Text></View><View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE 3D</Text></View></View>
    <Text style={styles.help}>Every score is a real 3D building. Drag to orbit the city and tune the height.</Text>
    <ThreeCityCanvas entries={ranked} heightScale={heightScale} />
    <View style={styles.heightControl}><View><Text style={styles.heightEyebrow}>CITY HEIGHT</Text><Text style={styles.heightValue}>{Math.round(heightScale * 100)}% tower scale</Text></View><View style={styles.heightButtons}><Pressable accessibilityRole="button" accessibilityLabel="Decrease tower height" onPress={() => changeHeight(-.1)} style={styles.heightButton}><Text style={styles.heightButtonText}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Increase tower height" onPress={() => changeHeight(.1)} style={styles.heightButton}><Text style={styles.heightButtonText}>+</Text></Pressable></View></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${selected.name}'s profile`} onPress={() => onSelect?.(selected)} style={styles.selectionCard}><View style={[styles.selectionMark, selected.isCurrentUser && styles.selectionMarkYou]}><Text style={styles.selectionMarkText}>{selected.isCurrentUser ? 'YOU' : `#${ranked.findIndex((entry) => entry.id === selected.id) + 1}`}</Text></View><View style={{ flex: 1 }}><Text style={styles.selectionTitle}>{selected.isCurrentUser ? 'Your score tower' : `${selected.name}'s score tower`}</Text><Text style={styles.selectionSub}>{selected.points.toLocaleString()} points · tap to visit profile</Text></View><Text style={styles.selectionArrow}>›</Text></Pressable>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roster}>{ranked.map((entry, index) => <Pressable key={entry.id} accessibilityRole="button" accessibilityState={{ selected: selected.id === entry.id }} onPress={() => setSelectedId(entry.id)} style={[styles.rosterCard, selected.id === entry.id && styles.rosterCardSelected]}><Text style={[styles.rosterRank, selected.id === entry.id && styles.rosterRankSelected]}>#{index + 1}</Text><Text numberOfLines={1} style={[styles.rosterName, selected.id === entry.id && styles.rosterNameSelected]}>{entry.isCurrentUser ? 'You' : shortName(entry.name)}</Text><Text style={[styles.rosterPoints, selected.id === entry.id && styles.rosterPointsSelected]}>{entry.points.toLocaleString()} pts</Text></Pressable>)}</ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  shell: { borderRadius: 22, padding: 13, backgroundColor: '#FBFDF8', borderWidth: 1, borderColor: '#C9DDC1', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#4F8756', fontSize: 8, fontWeight: '900', letterSpacing: 1.25 }, title: { color: '#263A2B', fontSize: 24, lineHeight: 29, fontWeight: '900', marginTop: 1 },
  livePill: { paddingHorizontal: 8, height: 25, borderRadius: 8, backgroundColor: '#EEF7E9', borderWidth: 1, borderColor: '#B9D5B1', flexDirection: 'row', alignItems: 'center', gap: 5 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2CBB5D' }, liveText: { color: '#376B48', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  help: { color: '#647567', fontSize: 10, lineHeight: 14, marginTop: 4, marginBottom: 10 },
  scene: { height: 328, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#A9C491', backgroundColor: '#BFE2EF' },
  sceneHint: { position: 'absolute', left: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, backgroundColor: '#FFFCF4E8', borderWidth: 1, borderColor: '#B8CCA8' }, sceneHintText: { color: '#49634D', fontSize: 8, letterSpacing: .5, fontWeight: '900' },
  heightControl: { minHeight: 52, marginTop: 10, borderRadius: 14, paddingHorizontal: 11, backgroundColor: '#F1F8ED', borderWidth: 1, borderColor: '#C7DEC0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heightEyebrow: { color: '#4F8756', fontSize: 8, letterSpacing: 1, fontWeight: '900' }, heightValue: { color: '#263A2B', fontSize: 12, fontWeight: '900', marginTop: 2 }, heightButtons: { flexDirection: 'row', gap: 6 }, heightButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#B6D0AE', alignItems: 'center', justifyContent: 'center' }, heightButtonText: { color: '#376B48', fontSize: 21, fontWeight: '800', lineHeight: 23 },
  selectionCard: { minHeight: 62, marginTop: 10, borderRadius: 14, paddingHorizontal: 11, backgroundColor: '#F1F8ED', borderWidth: 1, borderColor: '#C7DEC0', flexDirection: 'row', alignItems: 'center', gap: 9 }, selectionMark: { minWidth: 35, height: 35, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4F0DE', borderWidth: 1, borderColor: '#9ABF90' }, selectionMarkYou: { backgroundColor: '#FFA116', borderColor: '#E9A53D' }, selectionMarkText: { color: '#263A2B', fontSize: 9, fontWeight: '900' }, selectionTitle: { color: '#263A2B', fontSize: 12, fontWeight: '900' }, selectionSub: { color: '#647567', fontSize: 9, marginTop: 2 }, selectionArrow: { color: '#4F8756', fontSize: 27, lineHeight: 27 },
  roster: { paddingTop: 10, gap: 7 }, rosterCard: { width: 79, minHeight: 57, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 11, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#D5E2CE' }, rosterCardSelected: { backgroundColor: '#FFF3D9', borderColor: '#E9A53D' }, rosterRank: { color: '#7A8A78', fontSize: 8, fontWeight: '900' }, rosterRankSelected: { color: '#A86512' }, rosterName: { color: '#263A2B', fontSize: 10, marginTop: 3, fontWeight: '900' }, rosterNameSelected: { color: '#75440A' }, rosterPoints: { color: '#647567', fontSize: 8, marginTop: 2, fontWeight: '700' }, rosterPointsSelected: { color: '#A86512' },
});
