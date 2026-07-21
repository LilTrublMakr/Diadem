import {
	boolean,
	datetime,
	index,
	int,
	json,
	mysqlTable,
	text,
	timestamp,
	uniqueIndex,
	varchar
} from "drizzle-orm/mysql-core";

export const user = mysqlTable(
	"user",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		emailVerified: boolean("email_verified").notNull(),
		image: text("image"),
		discordId: varchar("discord_id", { length: 255 }).notNull().unique(),
		userSettings: json("user_settings"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		emailUnique: uniqueIndex("user_email_unique").on(table.email)
	})
);

export const session = mysqlTable(
	"session",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id),
		expiresAt: datetime("expires_at").notNull(),
		token: varchar("token", { length: 255 }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		tokenUnique: uniqueIndex("session_token_unique").on(table.token),
		userIdIdx: index("session_user_id_idx").on(table.userId),
		expiresAtIdx: index("session_expires_at_idx").on(table.expiresAt)
	})
);

export type Session = typeof session.$inferSelect;

export const account = mysqlTable(
	"account",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		accountId: varchar("account_id", { length: 255 }).notNull(),
		providerId: varchar("provider_id", { length: 255 }).notNull(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: datetime("access_token_expires_at"),
		refreshTokenExpiresAt: datetime("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		providerAccountUnique: uniqueIndex("account_provider_account_unique").on(
			table.providerId,
			table.accountId
		),
		userIdIdx: index("account_user_id_idx").on(table.userId)
	})
);

export const verification = mysqlTable(
	"verification",
	{
		id: varchar("id", { length: 255 }).primaryKey(),
		identifier: varchar("identifier", { length: 255 }).notNull(),
		value: text("value").notNull(),
		expiresAt: datetime("expires_at").notNull(),
		createdAt: datetime("created_at").notNull(),
		updatedAt: datetime("updated_at").notNull()
	},
	(table) => ({
		identifierIdx: index("verification_identifier_idx").on(table.identifier),
		expiresAtIdx: index("verification_expires_at_idx").on(table.expiresAt)
	})
);

export type User = typeof user.$inferSelect;

export const pokemonTracker = mysqlTable(
	"pokemon_tracker",
	{
		id: int("id").autoincrement().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		pokemonId: int("pokemon_id").notNull(),
		form: int("form").default(0).notNull(),
		shiny: boolean("shiny").default(false).notNull(),
		hundo: boolean("hundo").default(false).notNull(),
		nundo: boolean("nundo").default(false).notNull(),
		shundo: boolean("shundo").default(false).notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
	},
	(table) => ({
		userPokemonFormUnique: uniqueIndex("pokemon_tracker_user_pokemon_form_unique").on(
			table.userId,
			table.pokemonId,
			table.form
		)
	})
);

export type PokemonTracker = typeof pokemonTracker.$inferSelect;

export const scanArea = mysqlTable(
	"scan_area",
	{
		id: int("id").autoincrement().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 64 }).notNull(),
		geofence: json("geofence").$type<import("geojson").Polygon>().notNull(),
		areaSqM: int("area_sq_m").notNull(),
		workers: int("workers").default(1).notNull(),
		// Manual occupancy flag; only meaningful when mode === "manual"
		active: boolean("active").default(false).notNull(),
		mode: varchar("mode", { length: 16 })
			.$type<import("@/lib/features/scanAreas/scheduleTypes").ScanAreaMode>()
			.default("manual")
			.notNull(),
		schedule:
			json("schedule").$type<import("@/lib/features/scanAreas/scheduleTypes").AreaSchedule>(),
		// vtsched_ doc ids currently in Dragonite for this area
		dragoniteScheduleIds: json("dragonite_schedule_ids").$type<number[]>(),
		// Dragonite area id — mirror-all lifecycle: non-null after creation, null only
		// briefly when the create failed (reconciliation heals it)
		dragoniteAreaId: int("dragonite_area_id"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
	},
	(table) => ({
		userNameUnique: uniqueIndex("scan_area_user_name_unique").on(table.userId, table.name),
		userIdIdx: index("scan_area_user_id_idx").on(table.userId)
	})
);

export type ScanArea = typeof scanArea.$inferSelect;

export const notificationTemplate = mysqlTable(
	"notification_template",
	{
		id: int("id").autoincrement().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 64 }).notNull(),
		type: varchar("type", { length: 32 })
			.$type<import("@/lib/features/notifications/types").NotificationType>()
			.notNull(),
		embed: json("embed")
			.$type<import("@/lib/features/notifications/types").EmbedTemplate>()
			.notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
	},
	(table) => ({
		userTypeNameUnique: uniqueIndex("notification_template_user_type_name_unique").on(
			table.userId,
			table.type,
			table.name
		)
	})
);

export type NotificationTemplate = typeof notificationTemplate.$inferSelect;

export const notificationSubscription = mysqlTable(
	"notification_subscription",
	{
		id: int("id").autoincrement().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: varchar("type", { length: 32 })
			.$type<import("@/lib/features/notifications/types").NotificationType>()
			.notNull(),
		templateId: int("template_id").references(() => notificationTemplate.id, {
			onDelete: "set null"
		}),
		name: varchar("name", { length: 64 }).notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		filters: json("filters")
			.$type<import("@/lib/features/notifications/types").PokemonSubscriptionFilters>()
			.notNull(),
		// "manual" = active whenever enabled; "scheduled" = active only within schedule's windows.
		// Unlike scan_area, there's no allotment to protect, so schedules aren't conflict-checked.
		mode: varchar("mode", { length: 16 })
			.$type<import("@/lib/features/notifications/scheduleTypes").SubscriptionMode>()
			.default("manual")
			.notNull(),
		schedule:
			json("schedule").$type<
				import("@/lib/features/notifications/scheduleTypes").NotificationSchedule
			>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
	},
	(table) => ({
		userIdIdx: index("notification_subscription_user_id_idx").on(table.userId),
		typeIdx: index("notification_subscription_type_idx").on(table.type)
	})
);

export type NotificationSubscription = typeof notificationSubscription.$inferSelect;

// A user-drawn polygon scoped to notifications only — separate from scan_area (which exists to
// drive Dragonite worker scanning/allotment). No workers/mode/schedule/Dragonite mirroring here,
// just a named geofence a subscription's `areaId`/`areaSource: "notificationArea"` can point at.
export const notificationArea = mysqlTable(
	"notification_area",
	{
		id: int("id").autoincrement().primaryKey(),
		userId: varchar("user_id", { length: 255 })
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 64 }).notNull(),
		geofence: json("geofence").$type<import("geojson").Polygon>().notNull(),
		areaSqM: int("area_sq_m").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
	},
	(table) => ({
		userNameUnique: uniqueIndex("notification_area_user_name_unique").on(table.userId, table.name),
		userIdIdx: index("notification_area_user_id_idx").on(table.userId)
	})
);

export type NotificationArea = typeof notificationArea.$inferSelect;
