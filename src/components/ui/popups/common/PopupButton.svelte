<script lang="ts">
	import Button, { type ButtonProps } from "@/components/ui/input/Button.svelte";
	import { Circle, CircleCheck, Ellipsis } from "@lucide/svelte";
	import type { LucideIcon } from "@/lib/types/lucide";
	import { DropdownMenu } from "bits-ui";
	import { fly } from "svelte/transition";
	import { onDestroy } from "svelte";
	import type { PopupActionDropdown } from "@/lib/ui/popupActions";
	import { closeOverlay, isReconcilingOverlays, openOverlay, registerOverlayHandler } from "@/lib/ui/overlays.svelte";

	let {
		Icon,
		label,
		active = $bindable(false),
		IconActive,
		labelActive,
		actions = [],
		compact = false,
		...rest
	}: {
		Icon: LucideIcon;
		label: string;
		active?: boolean;
		IconActive?: LucideIcon;
		labelActive?: string;
		actions?: PopupActionDropdown[];
		// Smaller pill sizing (matches the "My Collection" tracker buttons) instead of the default
		// full-size popup button — used where several buttons need to fit compactly in one row.
		compact?: boolean;
	} & ButtonProps = $props();

	const overlayId = $props.id();
	let dropdownOpen = $state(false);
	const unregisterOverlayHandler = registerOverlayHandler("popup-actions", (entries) => {
		dropdownOpen = entries.some((entry) => entry.id === overlayId);
	});
	onDestroy(unregisterOverlayHandler);

	function setDropdownOpen(open: boolean) {
		dropdownOpen = open;
		if (isReconcilingOverlays()) return;
		if (open) openOverlay({ kind: "popup-actions", id: overlayId });
		else closeOverlay({ kind: "popup-actions", id: overlayId });
	}
</script>

<div class="flex gap-0.5 [&>*:first-child:not(:last-child)]:rounded-r-none" role="group">
	<Button
		size={compact ? "" : "default"}
		variant={compact ? "" : "secondary"}
		class={compact
			? "items-center text-xs px-2 py-1 h-auto rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground"
			: "items-center"}
		{...rest}
	>
		{#if !active}
			<Icon class={compact ? "size-3.5 mb-0.5" : "size-4 mb-0.5"} />
			{label}
		{:else if labelActive}
			<IconActive class={compact ? "size-3.5 mb-0.5" : "size-4 mb-0.5"} />
			{labelActive}
		{/if}
	</Button>

	{#if actions.length}
		<DropdownMenu.Root bind:open={dropdownOpen} onOpenChange={setDropdownOpen}>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						class={compact
							? "px-1.5! h-auto py-1! rounded-l-none border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground"
							: "px-3! rounded-l-none"}
						size={compact ? "" : "default"}
						variant={compact ? "" : "secondary"}
						{...props}
					>
						<Ellipsis class={compact ? "size-3.5 mt-0.5" : "size-4 mt-0.5"} />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="border-border w-64 border bg-card shadow-popover outline-hidden rounded-lg px-1 py-1.5"
				side="top"
				sideOffset={6}
				align="end"
				alignOffset={0}
				forceMount
			>
				{#snippet child({ wrapperProps, props, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} transition:fly={{ y: 6, duration: 90 }}>
								{#each actions as action (action.label)}
									{@const Icon = action.Icon}
									<DropdownMenu.Item
										class="data-highlighted:bg-muted cursor-pointer rounded-md px-3 h-9 flex font-medium text-sm items-center gap-2"
										onSelect={action.onclick}
									>
										<Icon class="size-3.5" />
										{action.label}

										{#if action.getActive}
											{#if action.getActive()}
												<CircleCheck class="size-3.5 ml-auto" />
											{:else}
												<Circle class="size-3.5 ml-auto text-muted-foreground" />
											{/if}
										{/if}
									</DropdownMenu.Item>
								{/each}
							</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>
