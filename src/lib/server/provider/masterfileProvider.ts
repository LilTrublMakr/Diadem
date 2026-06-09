import { REFRESH_MASTERFILE } from "@/lib/constants";
import { BaseDataProvider } from "@/lib/server/provider/dataProvider";
import { overwriteMasterfile } from "@/lib/services/masterfile";
import type { MasterFile, MasterMove, MasterPokemon } from "@/lib/types/masterfile";
import { getLogger } from "@/lib/utils/logger";

type RawMove = { moveId: number; moveName: string; proto: string; type: number; power: number };
type RawEvolution = {
	pokemon: number;
	form: number;
	candyCost: number;
	itemRequirement?: string;
	mustBeBuddy?: boolean;
	onlyDaytime?: boolean;
	onlyNighttime?: boolean;
	questRequirement?: { translated?: string };
};

type RawMasterFile = {
	pokemon: {
		[key: string]: {
			pokedexId: number;
			defaultFormId?: number;
			name: string;
			types: { [key: string]: any };
			forms?: (Partial<RawMasterFile["pokemon"]> & { form: number })[];
			tempEvolutions?: (Partial<RawMasterFile["pokemon"]> & { tempEvoId: number })[];
			legendary?: boolean;
			mythic?: boolean;
			ultraBeast?: boolean;
			family?: number;
			stats?: {
				attack: number;
				defense: number;
				stamina: number;
			};
			quickMoves?: { [key: string]: RawMove };
			chargedMoves?: { [key: string]: RawMove };
			evolutions?: { [key: string]: RawEvolution };
			misc?: { buddyDistance?: number };
		};
	};
	items: { [key: string]: { name: string } };
	weather: {
		[key: string]: {
			name: string;
			types: { typeId: number }[];
		};
	};
};

// proto → {id, name, type, power} — populated during first parse pass
const globalMoveStats = new Map<string, { id: number; name: string; type: number; power: number }>();

function toMoves(
	raw: { [key: string]: RawMove } | undefined,
	fallback: MasterMove[],
	eliteSet?: Set<string>
): MasterMove[] {
	if (!raw) return fallback;
	return Object.values(raw).map((m) => {
		globalMoveStats.set(m.proto, { id: m.moveId, name: m.moveName, type: m.type, power: m.power });
		const pvpKey = m.proto.replace(/_FAST$/, "");
		return {
			id: m.moveId,
			name: m.moveName,
			type: m.type,
			power: m.power,
			proto: m.proto,
			isLegacy: eliteSet ? eliteSet.has(pvpKey) : false,
		};
	});
}

function makePokemon(
	data: Partial<RawMasterFile["pokemon"][string]>,
	basePokemon: MasterPokemon | undefined = undefined,
	eliteSet?: Set<string>
): MasterPokemon {
	const masterPokemon = {
		name: data.name ?? "",
		forms: {},
		tempEvos: {},
		legendary: !!data.legendary,
		mythical: !!data.mythic,
		ultraBeast: !!data.ultraBeast,
		defaultFormId: data.defaultFormId,
		types: data.types ? Object.keys(data.types || {}).map(Number) : basePokemon?.types || [],
		family: data.family ?? basePokemon?.family ?? 0,
		baseAtk: data?.stats?.attack ?? basePokemon?.baseAtk ?? 0,
		baseDef: data?.stats?.defense ?? basePokemon?.baseDef ?? 0,
		baseSta: data?.stats?.stamina ?? basePokemon?.baseSta ?? 0,
		quickMoves: toMoves(data.quickMoves, basePokemon?.quickMoves ?? [], eliteSet),
		chargedMoves: toMoves(data.chargedMoves, basePokemon?.chargedMoves ?? [], eliteSet),
		evolutions: data.evolutions
			? Object.values(data.evolutions).map((e) => ({
				pokemonId: e.pokemon,
				form: e.form,
				candyCost: e.candyCost,
				itemRequirement: e.itemRequirement,
				mustBeBuddy: e.mustBeBuddy,
				onlyDaytime: e.onlyDaytime,
				onlyNighttime: e.onlyNighttime,
				questRequirement: e.questRequirement?.translated,
			}))
			: basePokemon?.evolutions ?? [],
		buddyDistance: data.misc?.buddyDistance ?? basePokemon?.buddyDistance ?? 0,
	} as MasterPokemon;

	if (data.forms) {
		for (const form of Object.values(data.forms)) {
			masterPokemon.forms[form.form.toString()] = makePokemon(form, masterPokemon, eliteSet);
		}
	}

	if (data.tempEvolutions) {
		for (const evo of Object.values(data.tempEvolutions)) {
			masterPokemon.tempEvos[evo.tempEvoId.toString()] = makePokemon(evo, masterPokemon, eliteSet);
		}
	}

	return masterPokemon;
}

const log = getLogger("q:masterfile");
const wwmUrl =
	"https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/refs/heads/master/master-latest-everything.json";
const pvpokeUrl =
	"https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";

type PvPokeEntry = { dex: number; eliteMoves?: string[] };

export class MasterfileProvider extends BaseDataProvider<MasterFile> {
	constructor() {
		super(REFRESH_MASTERFILE);
	}

	protected async query(): Promise<MasterFile> {
		const [rawData, pvpokeRaw] = await Promise.all([
			this.fetchData(wwmUrl, log, "masterfile"),
			this.fetchData(pvpokeUrl, log, "pvpoke").catch(() => null),
		]);
		const data = JSON.parse(rawData) as RawMasterFile;

		// Build dex → Set<proto> for elite/legacy moves
		const eliteByDex = new Map<number, Set<string>>();
		if (pvpokeRaw) {
			const pvpoke = JSON.parse(pvpokeRaw) as { pokemon: PvPokeEntry[] };
			for (const entry of pvpoke.pokemon) {
				if (!entry.eliteMoves?.length) continue;
				if (!eliteByDex.has(entry.dex)) eliteByDex.set(entry.dex, new Set());
				for (const m of entry.eliteMoves) eliteByDex.get(entry.dex)!.add(m);
			}
			log.info("PvPoke loaded: %d pokemon with elite moves", eliteByDex.size);
		} else {
			log.warning("PvPoke fetch failed — no elite move data available");
		}

		globalMoveStats.clear();

		const masterFile = {
			pokemon: {},
			items: Object.keys(data.items),
			weather: {}
		} as MasterFile;

		for (const [id, pokemon] of Object.entries(data.pokemon)) {
			const eliteSet = eliteByDex.get(pokemon.pokedexId);
			masterFile.pokemon[id] = makePokemon(pokemon, undefined, eliteSet);
		}

		// Second pass: inject elite moves absent from WatWowMap per-pokemon data
		let totalInjected = 0;
		for (const [id, pokemon] of Object.entries(data.pokemon)) {
			const eliteSet = eliteByDex.get(pokemon.pokedexId);
			if (!eliteSet) continue;
			const mp = masterFile.pokemon[id];
			const existingProtos = new Set([
				...mp.quickMoves.map((m) => m.proto.replace(/_FAST$/, "")),
				...mp.chargedMoves.map((m) => m.proto),
			]);
			for (const pvpProto of eliteSet) {
				if (existingProtos.has(pvpProto)) continue;
				// Determine fast vs charged: fast moves have _FAST suffix in WatWowMap
				const fastProto = pvpProto + "_FAST";
				const fastStats = globalMoveStats.get(fastProto);
				const chargedStats = globalMoveStats.get(pvpProto);
				if (fastStats) {
					mp.quickMoves.push({ ...fastStats, proto: fastProto, isLegacy: true });
					totalInjected++;
				} else if (chargedStats) {
					mp.chargedMoves.push({ ...chargedStats, proto: pvpProto, isLegacy: true });
					totalInjected++;
				} else {
					log.warning("Elite move %s for dex %d not found in globalMoveStats", pvpProto, pokemon.pokedexId);
				}
			}
		}
		log.info("Elite move injection complete: %d moves injected across all pokemon", totalInjected);

		for (const [id, w] of Object.entries(data.weather)) {
			masterFile.weather[id] = {
				types: w.types.map((t) => t.typeId)
			};
		}

		overwriteMasterfile(masterFile);

		return masterFile;
	}
}

export const masterfileProvider = new MasterfileProvider();
