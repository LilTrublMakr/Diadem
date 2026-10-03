/**
 * The flavor line each Team GO Rocket grunt/leader/boss says on encounter. Not present in
 * ScrapedDuck's rocketLineups.json (checked), sourced from leekduck.com's own grunt quote
 * reference (plus leader/boss quotes found separately) - static game text, doesn't rotate like
 * lineups do, so hardcoded rather than fetched. Keyed by the exact `name` field
 * rocketLineupsProvider's data uses, so a lookup is just `ROCKET_QUOTES[lineup.name]`.
 */
export const ROCKET_QUOTES: Record<string, string> = {
	Giovanni: "I will not tolerate your interference.",
	Cliff: "My strength comes from my loyalty to Team GO Rocket.",
	Arlo: "It's time to learn your place in the world.",
	Sierra: "I envy you—you get to battle me!",
	"Normal-type Male Grunt": "Normal does not mean weak.",
	"Fire-type Female Grunt": "Do you know how hot Pokémon fire breath can get?",
	"Water-type Female Grunt": "These waters are treacherous!",
	"Water-type Male Grunt": "These waters are treacherous!",
	"Electric-type Female Grunt": "Get ready to be shocked!",
	"Grass-type Male Grunt": "Don't tangle with us!",
	"Ice-type Female Grunt": "You're gonna be frozen in your tracks.",
	"Fighting-type Female Grunt": "This buff physique isn't just for show!",
	"Poison-type Female Grunt": "Coiled and ready to strike!",
	"Ground-type Male Grunt": "You'll be defeated into the ground!",
	"Flying-type Female Grunt": "Battle against my Flying-type Pokémon!",
	"Psychic-type Male Grunt": "Are you scared of psychics that use unseen power?",
	"Bug-type Male Grunt": "Go, my super bug Pokémon!",
	"Rock-type Male Grunt": "Let's rock and roll!",
	"Ghost-type Male Grunt": "Ke...ke...ke...ke...ke...ke!",
	"Dragon-type Female Grunt": "ROAR! ...How'd that sound?",
	"Dark-type Female Grunt": "Wherever there is light, there is also shadow.",
	"Steel-type Male Grunt": "You're no match for my iron will!",
	"Fairy-type Female Grunt": "Check out my cute Pokémon!",
	"Male Grunt": "Winning is for winners.",
	"Female Grunt": "Winning is for winners.",
	"Decoy Female Grunt": "Fooled ya, twerp."
};
