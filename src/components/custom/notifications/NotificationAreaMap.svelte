<script lang="ts">
	import type { NotificationAreaDto } from "@/lib/features/notifications/types";
	import { getConfig } from "@/lib/services/config/config";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
	import { getMapStyle, mapStyleFromId } from "@/lib/utils/mapStyle";
	import { area as turfArea, bbox as turfBbox } from "@turf/turf";
	import type { Feature, Polygon } from "geojson";
	import maplibre from "maplibre-gl";
	import { FillLayer, GeoJSON, LineLayer, MapLibre } from "svelte-maplibre";
	import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from "terra-draw";
	import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";

	let {
		areas,
		selectedId = $bindable(null),
		onDrawFinish,
		onAreaChange,
		onReady
	}: {
		areas: NotificationAreaDto[];
		selectedId?: number | null;
		onDrawFinish: (polygon: Polygon) => void;
		onAreaChange: (sqM: number | null) => void;
		// Fires once per mount, right after the map + draw engine are actually usable — needed
		// because this component is mounted fresh each time it appears inside a Dialog, so
		// startDraw()/startEdit() can't just be called synchronously on open.
		onReady?: () => void;
	} = $props();

	let map = $state<maplibre.Map>();
	let draw: TerraDraw | undefined;
	let drawReady = $state(false);
	let editingAreaId: number | null = $state(null);

	const config = getConfig();
	const center: [number, number] = [config.general.defaultLon ?? 0, config.general.defaultLat ?? 0];
	const zoom = config.general.defaultZoom ?? 12;

	// saved areas as one FeatureCollection; the area being edited is hidden
	// (terra-draw renders its own copy while editing)
	let featureCollection = $derived({
		type: "FeatureCollection" as const,
		features: areas
			.filter((a) => a.id !== editingAreaId)
			.map(
				(a): Feature<Polygon> => ({
					type: "Feature",
					geometry: a.geofence,
					properties: {
						areaId: a.id,
						fillColor: "#3b82f6",
						strokeColor: a.id === selectedId ? "#f59e0b" : "#2563eb"
					}
				})
			)
	});

	function currentDrawnPolygon(): Polygon | null {
		const features = draw?.getSnapshot() ?? [];
		const polygon = features.find((f) => f.geometry.type === "Polygon");
		return (polygon?.geometry as Polygon) ?? null;
	}

	function emitLiveArea() {
		const polygon = currentDrawnPolygon();
		if (!polygon || polygon.coordinates[0].length < 4) {
			onAreaChange(null);
			return;
		}
		try {
			onAreaChange(turfArea(polygon));
		} catch {
			onAreaChange(null);
		}
	}

	function initDraw(mapInstance: maplibre.Map) {
		draw = new TerraDraw({
			adapter: new TerraDrawMapLibreGLAdapter({ map: mapInstance }),
			modes: [
				new TerraDrawPolygonMode({
					styles: {
						fillColor: "#3b82f6",
						fillOpacity: 0.3,
						outlineColor: "#2563eb",
						outlineWidth: 2,
						closingPointColor: "#2563eb",
						closingPointOutlineColor: "#ffffff"
					}
				}),
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: true,
								coordinates: { midpoints: true, draggable: true, deletable: true }
							}
						}
					}
				})
			]
		});
		draw.start();
		draw.setMode("static");
		draw.on("change", () => emitLiveArea());
		draw.on("finish", (id, context) => {
			if (context.action !== "draw") return;
			const polygon = currentDrawnPolygon();
			if (polygon) onDrawFinish(polygon);
		});
		drawReady = true;
		onReady?.();
	}

	$effect(() => {
		if (!map) return;
		const mapInstance = map;
		const init = () => initDraw(mapInstance);
		if (mapInstance.loaded()) init();
		else mapInstance.once("load", init);

		return () => {
			mapInstance.off("load", init);
			drawReady = false;
			try {
				draw?.stop();
			} catch {
				// map may already be destroyed
			}
			draw = undefined;
		};
	});

	export function startDraw() {
		if (!draw) return;
		cancelDrawing();
		draw.setMode("polygon");
	}

	export function startEdit(dto: NotificationAreaDto) {
		if (!draw) return;
		cancelDrawing();
		editingAreaId = dto.id;
		draw.addFeatures([
			{
				type: "Feature",
				geometry: dto.geofence,
				properties: { mode: "polygon" }
			}
		]);
		draw.setMode("select");
		emitLiveArea();
	}

	export function getEditedPolygon(): Polygon | null {
		return currentDrawnPolygon();
	}

	export function cancelDrawing() {
		editingAreaId = null;
		if (!draw) return;
		draw.clear();
		draw.setMode("static");
		onAreaChange(null);
	}

	export function fitToArea(dto: NotificationAreaDto) {
		if (!map) return;
		const [minX, minY, maxX, maxY] = turfBbox({
			type: "Feature",
			geometry: dto.geofence,
			properties: {}
		});
		map.fitBounds(
			[
				[minX, minY],
				[maxX, maxY]
			],
			{ padding: 60, maxZoom: 15, duration: 500 }
		);
	}

	export function isReady() {
		return drawReady;
	}
</script>

<MapLibre
	bind:map
	{center}
	{zoom}
	class="h-full w-full"
	style={getMapStyle(mapStyleFromId(getUserSettings().mapStyle.id))}
	attributionControl={false}
>
	<GeoJSON id="user-notification-areas" data={featureCollection}>
		<FillLayer
			hoverCursor="pointer"
			paint={{
				"fill-color": ["get", "fillColor"],
				"fill-opacity": 0.25
			}}
			onclick={(e) => {
				const areaId = e.features?.[0]?.properties?.areaId;
				if (typeof areaId === "number") selectedId = areaId;
			}}
		/>
		<LineLayer
			layout={{ "line-cap": "round", "line-join": "round" }}
			paint={{
				"line-color": ["get", "strokeColor"],
				"line-width": 2
			}}
		/>
	</GeoJSON>
</MapLibre>
