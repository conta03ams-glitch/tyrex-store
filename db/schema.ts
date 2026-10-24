import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const orders=sqliteTable('orders',{
 id:text('id').primaryKey(),tokenHash:text('token_hash').notNull(),requestKey:text('request_key').notNull().unique(),userId:text('user_id'),email:text('email').notNull(),name:text('name').notNull(),discord:text('discord'),items:text('items').notNull(),total:integer('total').notNull(),status:text('status').notNull(),paymentMethod:text('payment_method').notNull(),paymentId:text('payment_id').unique(),paymentData:text('payment_data'),environment:text('environment').notNull(),fulfillment:text('fulfillment').notNull().default('aguardando'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()
});
export const webhookEvents=sqliteTable('webhook_events',{id:text('id').primaryKey(),receivedAt:text('received_at').notNull()});
export const support=sqliteTable('support',{id:text('id').primaryKey(),email:text('email').notNull(),message:text('message').notNull(),createdAt:text('created_at').notNull()});
export const rateLimits=sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});

export const customerSessions=sqliteTable('customer_sessions',{
 sessionHash:text('session_hash').primaryKey(),userId:text('user_id').notNull(),projectId:text('project_id').notNull(),email:text('email').notNull(),fullName:text('full_name'),firebaseTokenHash:text('firebase_token_hash').notNull().unique(),expiresAt:integer('expires_at').notNull(),createdAt:text('created_at').notNull()
},table=>[index('customer_sessions_expiry').on(table.expiresAt)]);

export const deliveryPolicies=sqliteTable('delivery_policies',{
 variantId:text('variant_id').primaryKey(),enabled:integer('enabled').notNull().default(0),durationDays:integer('duration_days'),instructions:text('instructions').notNull().default(''),downloadUrl:text('download_url').notNull().default(''),updatedAt:text('updated_at').notNull()
});
export const digitalStock=sqliteTable('digital_stock',{
 id:text('id').primaryKey(),variantId:text('variant_id').notNull(),environment:text('environment').notNull(),payload:text('payload').notNull(),fingerprint:text('fingerprint').notNull().unique(),orderId:text('order_id'),unitRef:text('unit_ref').unique(),deliveredAt:text('delivered_at'),expiresAt:text('expires_at'),instructions:text('instructions').notNull().default(''),downloadUrl:text('download_url').notNull().default(''),createdAt:text('created_at').notNull()
});

export const productReviews=sqliteTable('product_reviews',{
 id:text('id').primaryKey(),productId:text('product_id').notNull(),authorKey:text('author_key').notNull(),dedupeKey:text('dedupe_key').notNull().unique(),displayName:text('display_name').notNull(),rating:integer('rating').notNull(),comment:text('comment').notNull(),photoKey:text('photo_key'),verified:integer('verified').notNull().default(0),createdAt:text('created_at').notNull()
},table=>[index('reviews_product_created').on(table.productId,table.createdAt)]);
