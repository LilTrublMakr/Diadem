<script lang="ts">
	import { Heart } from 'lucide-svelte';
</script>

<div class="fixed top-2 left-2 z-10 pointer-events-none">
	<div
		class="bg-card/80 backdrop-blur-sm rounded-lg border border-border overflow-hidden pointer-events-auto flex items-center gap-0.5 p-1.5"
	>
		<a
			href="/"
			class="inline-flex items-center gap-2 text-xs font-medium font-display px-2 h-8 rounded-md hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground transition-colors"
		>
			<div class="h-6 ring-2 ring-border ring-offset-1 aspect-square rounded-full overflow-hidden shrink-0">
				<img class="w-full h-full" src="/vermont-pokemon-go-icon.svg" alt="PoGo Map VT Logo" />
			</div>
			PoGo Map VT
		</a>
		<a
			href="/support"
			class="inline-flex items-center gap-1.5 text-xs font-medium px-2 h-8 rounded-md border border-input hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground transition-colors"
		>
			<Heart class="size-3" />
			Support
		</a>
	</div>
</div>
