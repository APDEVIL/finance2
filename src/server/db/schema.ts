import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	pgTableCreator,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdById: d
			.varchar({ length: 255 })
			.notNull()
			.references(() => user.id),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		index("created_by_idx").on(t.createdById),
		index("name_idx").on(t.name),
	],
);
// src/server/db/schema.ts
import {
  integer, pgEnum,
  uuid, doublePrecision, date,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const categoryEnum         = pgEnum("category", [
  "salary", "freelance", "investment", "other_income",
  "groceries", "dining_out", "transportation", "utilities",
  "entertainment", "healthcare", "shopping", "education",
  "rent", "travel", "other_expense",
]);
export const priorityEnum         = pgEnum("priority",         ["high", "medium", "low"]);
export const notifTypeEnum        = pgEnum("notif_type",       ["budget_alert", "bill_reminder", "income", "goal_milestone", "weekly_summary", "upcoming_bill"]);
export const periodEnum           = pgEnum("period",           ["weekly", "monthly", "yearly"]);

// ─── BetterAuth tables ────────────────────────────────────────────────────────

export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image:         text("image"),
  createdAt:     timestamp("created_at").notNull(),
  updatedAt:     timestamp("updated_at").notNull(),
  // Extended
  dateOfBirth:   date("date_of_birth"),
  phone:         text("phone"),
  // Security settings
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  sessionTimeout:   text("session_timeout").default("1_hour").notNull(),
  privacyMode:      boolean("privacy_mode").default(false).notNull(),
  // Notification settings
  notifBillReminder:    boolean("notif_bill_reminder").default(true).notNull(),
  notifBudgetAlert:     boolean("notif_budget_alert").default(true).notNull(),
  notifGoalMilestone:   boolean("notif_goal_milestone").default(true).notNull(),
  notifIncome:          boolean("notif_income").default(true).notNull(),
  notifEmail:           boolean("notif_email").default(false).notNull(),
  notifSms:             boolean("notif_sms").default(false).notNull(),
});

export const session = pgTable("session", {
  id:          text("id").primaryKey(),
  expiresAt:   timestamp("expires_at").notNull(),
  token:       text("token").notNull().unique(),
  createdAt:   timestamp("created_at").notNull(),
  updatedAt:   timestamp("updated_at").notNull(),
  ipAddress:   text("ip_address"),
  userAgent:   text("user_agent"),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id:                    text("id").primaryKey(),
  accountId:             text("account_id").notNull(),
  providerId:            text("provider_id").notNull(),
  userId:                text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken:           text("access_token"),
  refreshToken:          text("refresh_token"),
  idToken:               text("id_token"),
  accessTokenExpiresAt:  timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope:                 text("scope"),
  password:              text("password"),
  createdAt:             timestamp("created_at").notNull(),
  updatedAt:             timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id:         text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value:      text("value").notNull(),
  expiresAt:  timestamp("expires_at").notNull(),
  createdAt:  timestamp("created_at"),
  updatedAt:  timestamp("updated_at"),
});

// ─── Transactions ─────────────────────────────────────────────────────────────

export const transaction = pgTable("transaction", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type:        transactionTypeEnum("type").notNull(),
  amount:      doublePrecision("amount").notNull(),
  category:    categoryEnum("category").notNull(),
  description: text("description").notNull(),
  notes:       text("notes"),
  date:        date("date").notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
});

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const budget = pgTable("budget", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  category:  categoryEnum("category").notNull(),
  amount:    doublePrecision("amount").notNull(),
  period:    periodEnum("period").default("monthly").notNull(),
  resetDate: date("reset_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Savings Goals ────────────────────────────────────────────────────────────

export const savingsGoal = pgTable("savings_goal", {
  id:            uuid("id").primaryKey().defaultRandom(),
  userId:        text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name:          text("name").notNull(),
  targetAmount:  doublePrecision("target_amount").notNull(),
  savedAmount:   doublePrecision("saved_amount").default(0).notNull(),
  targetDate:    date("target_date"),
  priority:      priorityEnum("priority").default("medium").notNull(),
  icon:          text("icon").default("piggy-bank"),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
  updatedAt:     timestamp("updated_at").defaultNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notification = pgTable("notification", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type:      notifTypeEnum("type").notNull(),
  title:     text("title").notNull(),
  body:      text("body").notNull(),
  isRead:    boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  transactions:  many(transaction),
  budgets:       many(budget),
  savingsGoals:  many(savingsGoal),
  notifications: many(notification),
}));

export const transactionRelations = relations(transaction, ({ one }) => ({
  user: one(user, { fields: [transaction.userId], references: [user.id] }),
}));

export const budgetRelations = relations(budget, ({ one }) => ({
  user: one(user, { fields: [budget.userId], references: [user.id] }),
}));

export const savingsGoalRelations = relations(savingsGoal, ({ one }) => ({
  user: one(user, { fields: [savingsGoal.userId], references: [user.id] }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}));