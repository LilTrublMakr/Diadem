/**
 * Like CalcyIV's own move ids (calcyIvMoveIds.ts), every (species, form) pair has its own internal
 * monster id in CalcyIV - including the *base* form (e.g. Raichu=400, Raichu Alolan=401; Dialga=2210,
 * Dialga Origin=2783). Leaving the CSV's "Form" column blank made CalcyIV default to the base
 * form's stats, so any row for a real alt form (regional/origin/crowned/size/gender variant) failed
 * CalcyIV's CP+HP+IV combo-search entirely (same "not computable" mechanism as the missing-HP bug,
 * triggered by wrong species stats instead of a missing input). Blank stays correct for base-form
 * individuals - CalcyIV's own default already resolves to the right (only) monster in that case.
 *
 * Extracted from CalcyIV's own bundled `assets/gamestats/gamestats.db` `Monsters` table
 * (id/number/nameEN) via APK teardown - only species with more than one monster variant are listed;
 * a dex not in this table has no alt form and blank is always correct.
 */
export const CALCY_IV_FORM_VARIANTS: Record<number, { id: number; nameEN: string }[]> = {
	386: [{ id: 386, nameEN: "Deoxys Normal" }, { id: 387, nameEN: "Deoxys Attack" }, { id: 388, nameEN: "Deoxys Defense" }, { id: 389, nameEN: "Deoxys Speed" }],
	351: [{ id: 390, nameEN: "Castform Normal" }, { id: 391, nameEN: "Castform Rainy" }, { id: 392, nameEN: "Castform Snowy" }, { id: 393, nameEN: "Castform Sunny" }],
	103: [{ id: 394, nameEN: "Exeggutor" }, { id: 395, nameEN: "Exeggutor Alolan" }],
	19: [{ id: 396, nameEN: "Rattata" }, { id: 397, nameEN: "Rattata Alolan" }],
	20: [{ id: 398, nameEN: "Raticate" }, { id: 399, nameEN: "Raticate Alolan" }],
	26: [{ id: 400, nameEN: "Raichu" }, { id: 401, nameEN: "Raichu Alolan" }],
	27: [{ id: 402, nameEN: "Sandshrew" }, { id: 403, nameEN: "Sandshrew Alolan" }],
	28: [{ id: 404, nameEN: "Sandslash" }, { id: 405, nameEN: "Sandslash Alolan" }],
	37: [{ id: 406, nameEN: "Vulpix" }, { id: 407, nameEN: "Vulpix Alolan" }],
	38: [{ id: 408, nameEN: "Ninetales" }, { id: 409, nameEN: "Ninetales Alolan" }],
	50: [{ id: 410, nameEN: "Diglett" }, { id: 411, nameEN: "Diglett Alolan" }],
	51: [{ id: 412, nameEN: "Dugtrio" }, { id: 413, nameEN: "Dugtrio Alolan" }],
	52: [{ id: 414, nameEN: "Meowth" }, { id: 415, nameEN: "Meowth Alolan" }, { id: 1244, nameEN: "Meowth Galarian" }],
	53: [{ id: 416, nameEN: "Persian" }, { id: 417, nameEN: "Persian Alolan" }],
	74: [{ id: 418, nameEN: "Geodude" }, { id: 419, nameEN: "Geodude Alolan" }],
	75: [{ id: 420, nameEN: "Graveler" }, { id: 421, nameEN: "Graveler Alolan" }],
	76: [{ id: 422, nameEN: "Golem" }, { id: 423, nameEN: "Golem Alolan" }],
	88: [{ id: 424, nameEN: "Grimer" }, { id: 425, nameEN: "Grimer Alolan" }],
	89: [{ id: 426, nameEN: "Muk" }, { id: 427, nameEN: "Muk Alolan" }],
	105: [{ id: 428, nameEN: "Marowak" }, { id: 429, nameEN: "Marowak Alolan" }],
	413: [{ id: 537, nameEN: "Wormadam Plant" }, { id: 538, nameEN: "Wormadam Sandy" }, { id: 539, nameEN: "Wormadam Trash" }],
	421: [{ id: 540, nameEN: "Cherrim Overcast" }, { id: 541, nameEN: "Cherrim Sunshine" }],
	422: [{ id: 542, nameEN: "Shellos East Sea" }, { id: 543, nameEN: "Shellos West Sea" }],
	423: [{ id: 544, nameEN: "Gastrodon East Sea" }, { id: 545, nameEN: "Gastrodon West Sea" }],
	479: [{ id: 546, nameEN: "Rotom" }, { id: 547, nameEN: "Fan Rotom" }, { id: 548, nameEN: "Frost Rotom" }, { id: 549, nameEN: "Heat Rotom" }, { id: 550, nameEN: "Mow Rotom" }, { id: 551, nameEN: "Wash Rotom" }],
	487: [{ id: 552, nameEN: "Giratina Altered" }, { id: 553, nameEN: "Giratina Origin" }],
	492: [{ id: 554, nameEN: "Shaymin Land" }, { id: 555, nameEN: "Shaymin Sky" }],
	493: [{ id: 556, nameEN: "Arceus Normal" }, { id: 557, nameEN: "Arceus Bug" }, { id: 558, nameEN: "Arceus Dark" }, { id: 559, nameEN: "Arceus Dragon" }, { id: 560, nameEN: "Arceus Electric" }, { id: 561, nameEN: "Arceus Fairy" }, { id: 562, nameEN: "Arceus Fighting" }, { id: 563, nameEN: "Arceus Fire" }, { id: 564, nameEN: "Arceus Flying" }, { id: 565, nameEN: "Arceus Ghost" }, { id: 566, nameEN: "Arceus Grass" }, { id: 567, nameEN: "Arceus Ground" }, { id: 568, nameEN: "Arceus Ice" }, { id: 569, nameEN: "Arceus Poison" }, { id: 570, nameEN: "Arceus Psychic" }, { id: 571, nameEN: "Arceus Rock" }, { id: 572, nameEN: "Arceus Steel" }, { id: 573, nameEN: "Arceus Water" }],
	412: [{ id: 576, nameEN: "Burmy Plant" }, { id: 577, nameEN: "Burmy Sandy" }, { id: 578, nameEN: "Burmy Trash" }],
	150: [{ id: 579, nameEN: "Mewtwo" }, { id: 580, nameEN: "Mewtwo Armored" }],
	58: [{ id: 720, nameEN: "Growlithe" }, { id: 1972, nameEN: "Growlithe Hisui" }],
	59: [{ id: 723, nameEN: "Arcanine" }, { id: 1973, nameEN: "Arcanine Hisui" }],
	550: [{ id: 819, nameEN: "Basculin Blue Striped" }, { id: 820, nameEN: "Basculin Red Striped" }, { id: 2785, nameEN: "Basculin White-Striped" }],
	555: [{ id: 826, nameEN: "Darmanitan Standard" }, { id: 827, nameEN: "Darmanitan Zen" }, { id: 1257, nameEN: "Darmanitan Standard Galarian" }, { id: 1258, nameEN: "Darmanitan Zen Galarian" }],
	585: [{ id: 858, nameEN: "Deerling Autumn" }, { id: 859, nameEN: "Deerling Spring" }, { id: 860, nameEN: "Deerling Summer" }, { id: 861, nameEN: "Deerling Winter" }],
	586: [{ id: 863, nameEN: "Sawsbuck Autumn" }, { id: 864, nameEN: "Sawsbuck Spring" }, { id: 865, nameEN: "Sawsbuck Summer" }, { id: 866, nameEN: "Sawsbuck Winter" }],
	641: [{ id: 922, nameEN: "Tornadus Incarnate" }, { id: 923, nameEN: "Tornadus Therian" }],
	642: [{ id: 925, nameEN: "Thundurus Incarnate" }, { id: 926, nameEN: "Thundurus Therian" }],
	645: [{ id: 930, nameEN: "Landorus Incarnate" }, { id: 931, nameEN: "Landorus Therian" }],
	646: [{ id: 933, nameEN: "Kyurem" }, { id: 934, nameEN: "Kyurem Black" }, { id: 935, nameEN: "Kyurem White" }],
	647: [{ id: 937, nameEN: "Keldeo Ordinary" }, { id: 938, nameEN: "Keldeo Resolute" }],
	648: [{ id: 940, nameEN: "Meloetta Aria" }, { id: 941, nameEN: "Meloetta Pirouette" }],
	649: [{ id: 943, nameEN: "Genesect" }, { id: 944, nameEN: "Genesect Burn" }, { id: 945, nameEN: "Genesect Chill" }, { id: 946, nameEN: "Genesect Douse" }, { id: 947, nameEN: "Genesect Shock" }],
	110: [{ id: 1080, nameEN: "Weezing" }, { id: 1152, nameEN: "Weezing Galarian" }],
	144: [{ id: 1095, nameEN: "Articuno" }, { id: 1963, nameEN: "Articuno Galarian" }],
	215: [{ id: 1107, nameEN: "Sneasel" }, { id: 1975, nameEN: "Sneasel Hisui" }],
	263: [{ id: 1153, nameEN: "Zigzagoon" }, { id: 1154, nameEN: "Zigzagoon Galarian" }],
	264: [{ id: 1155, nameEN: "Linoone" }, { id: 1156, nameEN: "Linoone Galarian" }],
	145: [{ id: 1157, nameEN: "Zapdos" }, { id: 1966, nameEN: "Zapdos Galarian" }],
	146: [{ id: 1160, nameEN: "Moltres" }, { id: 1969, nameEN: "Moltres Galarian" }],
	243: [{ id: 1187, nameEN: "Raikou" }, { id: 1767, nameEN: "Raikou Apex" }],
	244: [{ id: 1211, nameEN: "Entei" }, { id: 1770, nameEN: "Entei Apex" }],
	245: [{ id: 1214, nameEN: "Suicune" }, { id: 1773, nameEN: "Suicune Apex" }],
	592: [{ id: 1238, nameEN: "Frillish ♂" }, { id: 1239, nameEN: "Frillish ♀" }],
	593: [{ id: 1240, nameEN: "Jellicent ♂" }, { id: 1241, nameEN: "Jellicent ♀" }],
	25: [{ id: 1242, nameEN: "Pikachu" }, { id: 1243, nameEN: "Pikachu Libre" }, { id: 1275, nameEN: "Pikachu Fly" }, { id: 1594, nameEN: "Pikachu Fly 5th" }, { id: 1595, nameEN: "Pikachu Pop Star" }, { id: 1596, nameEN: "Pikachu Rock Star" }, { id: 2789, nameEN: "Pikachu Ph.D." }],
	83: [{ id: 1245, nameEN: "Farfetch'd" }, { id: 1246, nameEN: "Farfetch'd Galarian" }],
	554: [{ id: 1253, nameEN: "Darumaka" }, { id: 1254, nameEN: "Darumaka Galarian" }],
	618: [{ id: 1259, nameEN: "Stunfisk" }, { id: 1260, nameEN: "Stunfisk Galarian" }],
	79: [{ id: 1326, nameEN: "Slowpoke" }, { id: 1588, nameEN: "Slowpoke Galarian" }],
	80: [{ id: 1329, nameEN: "Slowbro" }, { id: 1589, nameEN: "Slowbro Galarian" }],
	199: [{ id: 1353, nameEN: "Slowking" }, { id: 1590, nameEN: "Slowking Galarian" }],
	77: [{ id: 1368, nameEN: "Ponyta" }, { id: 1369, nameEN: "Ponyta Galarian" }],
	78: [{ id: 1372, nameEN: "Rapidash" }, { id: 1373, nameEN: "Rapidash Galarian" }],
	562: [{ id: 1376, nameEN: "Yamask" }, { id: 1377, nameEN: "Yamask Galarian" }],
	668: [{ id: 1406, nameEN: "Pyroar ♂" }, { id: 1407, nameEN: "Pyroar ♀" }],
	678: [{ id: 1418, nameEN: "Meowstic ♂" }, { id: 1419, nameEN: "Meowstic ♀" }],
	194: [{ id: 1460, nameEN: "Wooper" }, { id: 2776, nameEN: "Wooper Paldean" }],
	122: [{ id: 1466, nameEN: "Mr. Mime" }, { id: 1467, nameEN: "Mr. Mime Galarian" }],
	250: [{ id: 1591, nameEN: "Ho-Oh" }, { id: 1779, nameEN: "Ho-Oh Apex" }],
	720: [{ id: 1598, nameEN: "Hoopa Confined" }, { id: 1599, nameEN: "Hoopa Unbound" }],
	849: [{ id: 1640, nameEN: "Toxtricity Amped" }, { id: 1641, nameEN: "Toxtricity Low Key" }],
	854: [{ id: 1647, nameEN: "Sinistea Antique" }, { id: 1648, nameEN: "Sinistea Phony" }],
	855: [{ id: 1650, nameEN: "Polteageist Antique" }, { id: 1651, nameEN: "Polteageist Phony" }],
	875: [{ id: 1670, nameEN: "Eiscue Ice Face" }, { id: 1671, nameEN: "Eiscue Noice Face" }],
	876: [{ id: 1673, nameEN: "Indeedee ♀" }, { id: 1674, nameEN: "Indeedee ♂" }],
	877: [{ id: 1676, nameEN: "Morpeko Full Belly" }, { id: 1677, nameEN: "Morpeko Hangry" }],
	888: [{ id: 1689, nameEN: "Zacian Crowned Sword" }, { id: 1690, nameEN: "Zacian Hero" }],
	889: [{ id: 1692, nameEN: "Zamazenta Crowned Shield" }, { id: 1693, nameEN: "Zamazenta Hero" }],
	890: [{ id: 1695, nameEN: "Eternatus" }, { id: 1696, nameEN: "Eternatus Eternamax" }],
	892: [{ id: 1699, nameEN: "Urshifu Rapid Strike" }, { id: 1700, nameEN: "Urshifu Single Strike" }],
	898: [{ id: 1707, nameEN: "Calyrex" }, { id: 1708, nameEN: "Calyrex Ice Rider" }, { id: 1709, nameEN: "Calyrex Shadow Rider" }],
	710: [{ id: 1712, nameEN: "Pumpkaboo M" }, { id: 1713, nameEN: "Pumpkaboo XL" }, { id: 1714, nameEN: "Pumpkaboo XS" }, { id: 1715, nameEN: "Pumpkaboo XXL" }],
	711: [{ id: 1716, nameEN: "Gourgeist M" }, { id: 1717, nameEN: "Gourgeist XL" }, { id: 1718, nameEN: "Gourgeist XS" }, { id: 1719, nameEN: "Gourgeist XXL" }],
	249: [{ id: 1720, nameEN: "Lugia" }, { id: 1776, nameEN: "Lugia Apex" }],
	100: [{ id: 1723, nameEN: "Voltorb" }, { id: 1765, nameEN: "Voltorb Hisui" }],
	101: [{ id: 1726, nameEN: "Electrode" }, { id: 1766, nameEN: "Electrode Hisui" }],
	157: [{ id: 1744, nameEN: "Typhlosion" }, { id: 2777, nameEN: "Typhlosion Hisui" }],
	745: [{ id: 1805, nameEN: "Lycanroc Dusk" }, { id: 1806, nameEN: "Lycanroc Midday" }, { id: 1807, nameEN: "Lycanroc Midnight" }],
	746: [{ id: 1809, nameEN: "Wishiwashi School" }, { id: 1810, nameEN: "Wishiwashi Solo" }],
	773: [{ id: 1838, nameEN: "Silvally Normal" }, { id: 1839, nameEN: "Silvally Bug" }, { id: 1840, nameEN: "Silvally Dark" }, { id: 1841, nameEN: "Silvally Dragon" }, { id: 1842, nameEN: "Silvally Electric" }, { id: 1843, nameEN: "Silvally Fairy" }, { id: 1844, nameEN: "Silvally Fighting" }, { id: 1845, nameEN: "Silvally Fire" }, { id: 1846, nameEN: "Silvally Flying" }, { id: 1847, nameEN: "Silvally Ghost" }, { id: 1848, nameEN: "Silvally Grass" }, { id: 1849, nameEN: "Silvally Ground" }, { id: 1850, nameEN: "Silvally Ice" }, { id: 1851, nameEN: "Silvally Poison" }, { id: 1852, nameEN: "Silvally Psychic" }, { id: 1853, nameEN: "Silvally Rock" }, { id: 1854, nameEN: "Silvally Steel" }, { id: 1855, nameEN: "Silvally Water" }],
	800: [{ id: 1885, nameEN: "Necrozma" }, { id: 1886, nameEN: "Necrozma Dawn Wings" }, { id: 1887, nameEN: "Necrozma Dusk Mane" }, { id: 1888, nameEN: "Necrozma Ultra" }],
	741: [{ id: 1897, nameEN: "Oricorio Baile" }, { id: 1898, nameEN: "Oricorio Pa'u" }, { id: 1899, nameEN: "Oricorio Pom-Pom" }, { id: 1900, nameEN: "Oricorio Sensu" }],
	211: [{ id: 1974, nameEN: "Qwilfish" }, { id: 1980, nameEN: "Qwilfish Hisui" }],
	628: [{ id: 1976, nameEN: "Braviary" }, { id: 1977, nameEN: "Braviary Hisui" }],
	713: [{ id: 1982, nameEN: "Avalugg" }, { id: 1983, nameEN: "Avalugg Hisui" }],
	380: [{ id: 1988, nameEN: "Latias" }, { id: 1989, nameEN: "Latias Apex" }],
	381: [{ id: 1990, nameEN: "Latios" }, { id: 1991, nameEN: "Latios Apex" }],
	128: [{ id: 2034, nameEN: "Tauros" }, { id: 2791, nameEN: "Tauros Aqua" }, { id: 2792, nameEN: "Tauros Blaze" }, { id: 2793, nameEN: "Tauros Combat" }],
	222: [{ id: 2070, nameEN: "Corsola" }, { id: 2790, nameEN: "Corsola Galarian" }],
	483: [{ id: 2210, nameEN: "Dialga" }, { id: 2783, nameEN: "Dialga Origin" }],
	484: [{ id: 2211, nameEN: "Palkia" }, { id: 2784, nameEN: "Palkia Origin" }],
	503: [{ id: 2227, nameEN: "Samurott" }, { id: 2778, nameEN: "Samurott Hisui" }],
	549: [{ id: 2269, nameEN: "Lilligant" }, { id: 2796, nameEN: "Lilligant Hisui" }],
	570: [{ id: 2285, nameEN: "Zorua" }, { id: 2794, nameEN: "Zorua Hisui" }],
	571: [{ id: 2286, nameEN: "Zoroark" }, { id: 2795, nameEN: "Zoroark Hisui" }],
	718: [{ id: 2402, nameEN: "Zygarde 10%" }, { id: 2563, nameEN: "Zygarde 50%" }, { id: 2564, nameEN: "Zygarde Complete" }],
	724: [{ id: 2407, nameEN: "Decidueye" }, { id: 2779, nameEN: "Decidueye Hisui" }],
	744: [{ id: 2426, nameEN: "Rockruff" }, { id: 2782, nameEN: "Rockruff Dusk" }],
	916: [{ id: 2576, nameEN: "Oinkologne ♂" }, { id: 2577, nameEN: "Oinkologne ♀" }],
	925: [{ id: 2587, nameEN: "Maushold 4" }, { id: 2588, nameEN: "Maushold 3" }],
	931: [{ id: 2595, nameEN: "Squawkabilly Blue" }, { id: 2596, nameEN: "Squawkabilly Green" }, { id: 2597, nameEN: "Squawkabilly White" }, { id: 2598, nameEN: "Squawkabilly Yellow" }],
	964: [{ id: 2632, nameEN: "Palafin Hero" }, { id: 2633, nameEN: "Palafin" }],
	978: [{ id: 2648, nameEN: "Tatsugiri Curly" }, { id: 2649, nameEN: "Tatsugiri Droopy" }, { id: 2650, nameEN: "Tatsugiri Stretchy" }],
	982: [{ id: 2655, nameEN: "Dudunsparce 3" }, { id: 2656, nameEN: "Dudunsparce 2" }],
	905: [{ id: 2787, nameEN: "Enamorus Incarnate" }, { id: 2788, nameEN: "Enamorus Therian" }],
	681: [{ id: 2797, nameEN: "Aegislash Blade" }, { id: 2798, nameEN: "Aegislash Shield" }],
	1012: [{ id: 2800, nameEN: "Poltchageist Artisan" }, { id: 2801, nameEN: "Poltchageist Counterfeit" }],
	1013: [{ id: 2803, nameEN: "Sinistcha Masterpiece" }, { id: 2804, nameEN: "Sinistcha Unremarkable" }],
	778: [{ id: 2836, nameEN: "Mimikyu Disguised" }, { id: 2837, nameEN: "Mimikyu Busted" }]
};

// This app's masterfile form names don't always spell things the way CalcyIV's Monsters.nameEN
// does for the same variant (region name vs. adjective, full word vs. abbreviation, a spelled-out
// count vs. a digit, etc.) - map the ones that differ; anything not listed here is compared as-is,
// after stripping a generic descriptor suffix WWM sometimes adds that CalcyIV never does.
const FORM_NAME_ALIASES: Record<string, string> = {
	"Alola": "Alolan",
	"Hisuian": "Hisui",
	"Female": "♀",
	"Male": "♂",
	"Small": "XS",
	"Average": "M",
	"Large": "XL",
	"Super": "XXL",
	"Ten Percent": "10%",
	"Fifty Percent": "50%",
	"Paldea": "Paldean",
	"Two-Segment": "2",
	"Three-Segment": "3",
	"Family Of Three": "3",
	"Family Of Four": "4"
};

/**
 * Resolves this app's own form display name (e.g. from getFormName()) to CalcyIV's own numeric
 * monster id for that (dex, form) pair. Matches by word-set, not substring or word order - handles
 * CalcyIV's inconsistent conventions (suffix "Raichu Alolan" vs prefix "Kyurem Black" vs
 * "Origin Forme" -> "Origin") without per-species rules. When multiple candidates contain every
 * target word (e.g. "Standard" also matches "Darmanitan Standard Galarian"), the fewest-extra-words
 * candidate wins. Returns undefined (leave blank in the CSV) rather than guess when there's still no
 * single best match - a costume/event form CalcyIV has no equivalent for (and which doesn't affect
 * base stats anyway) is expected to occasionally fall through here.
 */
export function findCalcyFormId(dex: number, wwmFormName: string): number | undefined {
	const candidates = CALCY_IV_FORM_VARIANTS[dex];
	if (!candidates) return undefined;

	const stripped = wwmFormName.replace(/ (Form|Forme|Cloak|Style|Plumage)$/, "");
	const token = FORM_NAME_ALIASES[stripped] ?? stripped;
	const words = token.toLowerCase().split(/\s+/).filter(Boolean);

	const matches = candidates.filter((c) => {
		const nameWords = c.nameEN.toLowerCase().split(/\s+/).filter(Boolean);
		return words.every((w) => nameWords.includes(w));
	});
	if (matches.length === 0) return undefined;
	if (matches.length === 1) return matches[0].id;

	let minExtra = Infinity;
	let best: typeof matches = [];
	for (const m of matches) {
		const extra = m.nameEN.toLowerCase().split(/\s+/).filter(Boolean).length - words.length;
		if (extra < minExtra) {
			minExtra = extra;
			best = [m];
		} else if (extra === minExtra) {
			best.push(m);
		}
	}
	return best.length === 1 ? best[0].id : undefined;
}
