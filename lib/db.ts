import {
  MongoClient,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type FindOptions,
  type FindOneAndUpdateOptions,
  type InsertOneOptions,
  type BulkWriteOptions,
  type UpdateFilter,
  type UpdateOptions,
  type DeleteOptions,
  type CountDocumentsOptions,
  type OptionalUnlessRequiredId,
  type WithId,
} from "mongodb";
import { getActiveProfileId } from "@/lib/profile";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
const dbName = process.env.DB_NAME ?? "personal_tracker";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise: Promise<MongoClient> =
  global._mongoClientPromise ?? new MongoClient(uri).connect();

if (process.env.NODE_ENV !== "production") {
  global._mongoClientPromise = clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

/**
 * Raw, unscoped database access. Use for collections that intentionally span
 * profiles — currently only `profiles` itself, and one-time migrations.
 */
export async function getUnscopedDb(): Promise<Db> {
  return getDb();
}

/**
 * Profile-scoped collection. Every read filter is intersected with the active
 * profile_id; every write doc is stamped with it. This is the single isolation
 * contract — repositories never need to know about profiles.
 */
export async function getCollection<T extends Document>(
  name: string
): Promise<ScopedCollection<T>> {
  const db = await getDb();
  const profileId = await getActiveProfileId();
  return new ScopedCollection<T>(db.collection<T>(name), profileId);
}

function mergeFilter<T extends Document>(
  filter: Filter<T>,
  profileId: string
): Filter<T> {
  return { ...filter, profile_id: profileId } as Filter<T>;
}

function stripProfileFromUpdate<T extends Document>(
  update: UpdateFilter<T>
): UpdateFilter<T> {
  if (!update || typeof update !== "object") return update;
  // Don't allow callers to overwrite profile_id via $set / $setOnInsert.
  const u = update as Record<string, unknown>;
  if (u.$set && typeof u.$set === "object") {
    const set = { ...(u.$set as Record<string, unknown>) };
    delete set.profile_id;
    u.$set = set;
  }
  if (u.$setOnInsert && typeof u.$setOnInsert === "object") {
    const set = { ...(u.$setOnInsert as Record<string, unknown>) };
    delete set.profile_id;
    u.$setOnInsert = set;
  }
  return u as UpdateFilter<T>;
}

export class ScopedCollection<T extends Document> {
  constructor(
    private readonly col: Collection<T>,
    private readonly profileId: string
  ) {}

  /** Escape hatch — returns the underlying collection. Only use when you really need to bypass scoping (e.g. migrations). */
  unsafeRaw(): Collection<T> {
    return this.col;
  }

  find(filter: Filter<T> = {}, opts?: FindOptions) {
    return this.col.find(mergeFilter(filter, this.profileId), opts);
  }

  findOne(filter: Filter<T> = {}, opts?: FindOptions) {
    return this.col.findOne(mergeFilter(filter, this.profileId), opts);
  }

  countDocuments(filter: Filter<T> = {}, opts?: CountDocumentsOptions) {
    return this.col.countDocuments(mergeFilter(filter, this.profileId), opts);
  }

  /**
   * Writers should pass `profile_id` explicitly (looked up via
   * `getActiveProfileId()`), but the wrapper overwrites with the active
   * profile_id as a defense-in-depth guarantee.
   */
  insertOne(doc: OptionalUnlessRequiredId<T>, opts?: InsertOneOptions) {
    const stamped = { ...doc, profile_id: this.profileId } as OptionalUnlessRequiredId<T>;
    return this.col.insertOne(stamped, opts);
  }

  insertMany(docs: OptionalUnlessRequiredId<T>[], opts?: BulkWriteOptions) {
    const stamped = docs.map(
      (d) => ({ ...d, profile_id: this.profileId } as OptionalUnlessRequiredId<T>)
    );
    return this.col.insertMany(stamped, opts);
  }

  findOneAndUpdate(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    opts?: FindOneAndUpdateOptions
  ): Promise<WithId<T> | null> {
    return this.col.findOneAndUpdate(
      mergeFilter(filter, this.profileId),
      stripProfileFromUpdate(update),
      opts ?? {}
    ) as Promise<WithId<T> | null>;
  }

  updateOne(filter: Filter<T>, update: UpdateFilter<T>, opts?: UpdateOptions) {
    return this.col.updateOne(
      mergeFilter(filter, this.profileId),
      stripProfileFromUpdate(update),
      opts
    );
  }

  updateMany(filter: Filter<T>, update: UpdateFilter<T>, opts?: UpdateOptions) {
    return this.col.updateMany(
      mergeFilter(filter, this.profileId),
      stripProfileFromUpdate(update),
      opts
    );
  }

  deleteOne(filter: Filter<T>, opts?: DeleteOptions) {
    return this.col.deleteOne(mergeFilter(filter, this.profileId), opts);
  }

  deleteMany(filter: Filter<T>, opts?: DeleteOptions) {
    return this.col.deleteMany(mergeFilter(filter, this.profileId), opts);
  }

  aggregate<TOut extends Document = Document>(pipeline: Document[]) {
    return this.col.aggregate<TOut>([
      { $match: { profile_id: this.profileId } },
      ...pipeline,
    ]);
  }
}

export { clientPromise };
