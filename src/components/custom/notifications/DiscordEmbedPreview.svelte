<script lang="ts">
	import type { EmbedTemplate, PokemonTemplateContext } from "@/lib/features/notifications/types";
	import { registerNotificationHelpers } from "@/lib/features/notifications/handlebarsHelpers";
	import { Map } from "@lucide/svelte";
	import Handlebars from "handlebars";

	registerNotificationHelpers(Handlebars);

	let { embed, context }: { embed: EmbedTemplate; context: PokemonTemplateContext } = $props();

	function render(source: string): string {
		try {
			return Handlebars.compile(source)(context);
		} catch {
			return source;
		}
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}

	function formatDiscordTimestamp(unixSeconds: number, style: string): string {
		const date = new Date(unixSeconds * 1000);
		switch (style) {
			case "t":
				return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
			case "T":
				return date.toLocaleTimeString();
			case "d":
				return date.toLocaleDateString();
			case "D":
				return date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
			case "F":
				return (
					date.toLocaleDateString([], {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric"
					}) +
					" " +
					date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
				);
			case "R": {
				const diffMs = date.getTime() - Date.now();
				const abs = Math.abs(diffMs);
				const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
				const minute = 60_000,
					hour = 3_600_000,
					day = 86_400_000,
					month = day * 30,
					year = day * 365;
				if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute");
				if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour");
				if (abs < month) return rtf.format(Math.round(diffMs / day), "day");
				if (abs < year) return rtf.format(Math.round(diffMs / month), "month");
				return rtf.format(Math.round(diffMs / year), "year");
			}
			case "f":
			default:
				return (
					date.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" }) +
					" " +
					date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
				);
		}
	}

	// Best-effort model of Discord's markup: custom emoji + <t:...> timestamps resolve
	// everywhere (title/description/footer); **bold** etc only apply in the description
	// (Discord embed titles/footers render as plain text plus those two token types).
	function renderTokens(raw: string): string {
		let s = escapeHtml(raw);

		s = s.replace(
			/&lt;a?:(\w+):(\d+)&gt;/g,
			(_, name, id) =>
				`<img src="https://cdn.discordapp.com/emojis/${id}.png?size=32" alt=":${name}:" class="inline-block h-[1.2em] w-[1.2em] align-text-bottom" />`
		);

		s = s.replace(
			/&lt;t:(-?\d+)(?::([tTdDfFR]))?&gt;/g,
			(_, unix, style) =>
				`<span class="rounded bg-zinc-600/60 px-1 py-0.5 text-zinc-100">${escapeHtml(formatDiscordTimestamp(Number(unix), style || "f"))}</span>`
		);

		return s;
	}

	function renderDescription(raw: string): string {
		let s = renderTokens(raw);

		s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
		s = s.replace(/__(.+?)__/g, "<u>$1</u>");
		s = s.replace(/~~(.+?)~~/g, "<del>$1</del>");
		s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
		s = s.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");
		s = s.replace(/`([^`]+?)`/g, '<code class="rounded bg-zinc-900/60 px-1 text-xs">$1</code>');
		s = s.replace(
			/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
			'<a href="$2" target="_blank" rel="noreferrer" class="text-blue-400 hover:underline">$1</a>'
		);
		s = s.replace(/\n/g, "<br />");

		return s;
	}

	let titleText = $derived(render(embed.title));
	let descriptionText = $derived(render(embed.description));
	let color = $derived(render(embed.color));
	let thumbnailUrl = $derived(render(embed.thumbnailUrl));
	let imageUrl = $derived(render(embed.imageUrl));
	let footerRaw = $derived(render(embed.footerText));
	let url = $derived(render(embed.url));

	let titleHtml = $derived(renderTokens(titleText));
	let descriptionHtml = $derived(renderDescription(descriptionText));
	let footerHtml = $derived(renderTokens(footerRaw));

	// older saved templates predate the fields feature
	let renderedFields = $derived(
		(embed.fields ?? []).map((field) => ({
			name: renderDescription(render(field.name)),
			value: renderDescription(render(field.value)),
			inline: field.inline
		}))
	);

	let barColor = $derived.by(() => {
		const trimmed = color.trim();
		if (!trimmed) return "#5865f2";
		const hex = trimmed.startsWith("#")
			? trimmed
			: `#${Number(trimmed).toString(16).padStart(6, "0")}`;
		return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#5865f2";
	});

	// "attachment://..." (e.g. {{{mapImageUrl}}}) isn't a loadable browser URL — it's
	// resolved to the uploaded file by Discord itself once the message is sent.
	function isAttachmentRef(src: string): boolean {
		return src.startsWith("attachment://");
	}
</script>

<div class="rounded-md bg-[#313338] p-3 max-w-md font-sans text-[15px] leading-snug">
	<div class="flex gap-3 border-l-4 rounded-sm pl-3 py-2" style="border-color: {barColor}">
		<div class="flex-1 min-w-0">
			{#if titleText}
				<p class="font-semibold text-white break-words">
					{#if url}<a href={url} class="hover:underline" target="_blank" rel="noreferrer"
							>{@html titleHtml}</a
						>{:else}{@html titleHtml}{/if}
				</p>
			{/if}
			{#if descriptionText}
				<p class="text-zinc-300 break-words mt-1">{@html descriptionHtml}</p>
			{/if}
			{#if renderedFields.length > 0}
				<div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
					{#each renderedFields as field, i (i)}
						<div
							class="flex flex-col min-w-[90px] {field.inline ? 'grow basis-[28%]' : 'basis-full'}"
						>
							{#if field.name}
								<p class="font-semibold text-white text-sm break-words">{@html field.name}</p>
							{/if}
							{#if field.value}
								<p class="text-zinc-300 text-sm break-words">{@html field.value}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
			{#if imageUrl}
				{#if isAttachmentRef(imageUrl)}
					<div
						class="mt-2 rounded bg-zinc-700/60 h-32 max-w-full flex flex-col items-center justify-center gap-1 text-zinc-400"
					>
						<Map size={20} />
						<span class="text-xs">Map image (attached on send)</span>
					</div>
				{:else}
					<img src={imageUrl} alt="" class="mt-2 rounded max-h-64 max-w-full object-contain" />
				{/if}
			{/if}
			{#if footerRaw}
				<p class="text-zinc-400 text-xs mt-2">{@html footerHtml}</p>
			{/if}
		</div>
		{#if thumbnailUrl}
			{#if isAttachmentRef(thumbnailUrl)}
				<div
					class="size-20 rounded bg-zinc-700/60 flex flex-col items-center justify-center gap-1 text-zinc-400 shrink-0"
				>
					<Map size={16} />
				</div>
			{:else}
				<img src={thumbnailUrl} alt="" class="size-20 rounded object-contain shrink-0" />
			{/if}
		{/if}
	</div>
</div>
