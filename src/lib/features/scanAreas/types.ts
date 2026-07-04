import type { AreaSchedule, ScanAreaMode } from "@/lib/features/scanAreas/scheduleTypes";
import type { Polygon } from "geojson";

export type ScanAreaDto = {
	id: number;
	name: string;
	geofence: Polygon;
	areaSqM: number;
	workers: number;
	active: boolean;
	mode: ScanAreaMode;
	schedule: AreaSchedule | null;
	createdAt: string;
	updatedAt: string;
};

export type ScanAreaAllotment = {
	total: number; // -1 = unlimited
	used: number;
};

export type ScanAreaLimits = {
	maxAreaSqM: number;
	recommendedAreaSqM: number;
};

export type ScanAreasResponse = {
	areas: ScanAreaDto[];
	allotment: ScanAreaAllotment;
	limits: ScanAreaLimits;
};

export type ScanAreaErrorResponse = {
	error: string;
	message?: string;
	used?: number;
	total?: number;
	requested?: number;
	// schedule_overlap conflict details
	load?: number;
	areas?: string[];
	type?: "weekly" | "dated";
	day?: string;
	date?: string;
	time?: string;
};
