import { db, type Book, type Transaction } from "./db";
import { supabase } from "./supabase";

// Helper to split array into chunks
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Pings the Supabase API to verify active network connectivity
 */
export async function checkConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!navigator.onLine) return false;
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    });
    // A 200 or 401 response (unauthorized but reachable) confirms database server is up
    return res.status === 200 || res.status === 401;
  } catch (error) {
    console.error("Connectivity check failed:", error);
    return false;
  }
}

/**
 * Pushes all unsynced local changes (books and transactions) to Supabase.
 * Batches inserts/upserts in chunks of 50 to prevent payload timeout.
 * Automatically purges soft-deleted items locally upon successful sync.
 */
export async function pushLocalChanges(userId: string): Promise<void> {
  // Always push books first since transactions have a foreign key dependency on book_id!
  
  // 1. Sync Books
  const unsyncedBooks = await db.books.where("is_synced").equals(0).toArray();
  if (unsyncedBooks.length > 0) {
    const bookChunks = chunkArray(unsyncedBooks, 50);
    
    for (const chunk of bookChunks) {
      const formattedBooks = chunk.map((book) => ({
        id: book.id,
        user_id: userId,
        name: book.name,
        description: book.description,
        color: book.color, // bigint fits standard JS numbers accurately
        icon: book.icon,
        created_at: book.created_at,
        updated_at: book.updated_at,
        is_deleted: book.is_deleted === 1, // Map integer to boolean
      }));

      const { error } = await supabase.from("books").upsert(formattedBooks);
      if (error) {
        console.error("Error pushing books to Supabase:", error);
        throw error;
      }

      // Update local db state after successful sync
      for (const book of chunk) {
        if (book.is_deleted === 1) {
          // Garbage collection: physically delete the soft-deleted book locally
          await db.books.delete(book.id);
        } else {
          await db.books.update(book.id, { is_synced: 1 });
        }
      }
    }
  }

  // 2. Sync Transactions
  const unsyncedTx = await db.transactions.where("is_synced").equals(0).toArray();
  if (unsyncedTx.length > 0) {
    const txChunks = chunkArray(unsyncedTx, 50);
    
    for (const chunk of txChunks) {
      const formattedTx = chunk.map((tx) => ({
        id: tx.id,
        user_id: userId,
        transaction_date: tx.transaction_date.slice(0, 10), // Map ISO timestamp to YYYY-MM-DD date format
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        book_id: tx.book_id,
        is_deleted: tx.is_deleted === 1, // Map integer to boolean
      }));

      const { error } = await supabase.from("transactions").upsert(formattedTx);
      if (error) {
        console.error("Error pushing transactions to Supabase:", error);
        throw error;
      }

      // Update local db state after successful sync
      for (const tx of chunk) {
        if (tx.is_deleted === 1) {
          // Garbage collection: physically delete the soft-deleted transaction locally
          await db.transactions.delete(tx.id);
        } else {
          await db.transactions.update(tx.id, { is_synced: 1 });
        }
      }
    }
  }
}

/**
 * Pulls all cloud changes from Supabase and applies them locally.
 * Implements "Last Write Wins" based on timestamps for conflict resolution.
 */
export async function pullCloudChanges(userId: string): Promise<void> {
  // 1. Pull Books
  const { data: cloudBooks, error: booksError } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId);

  if (booksError) {
    console.error("Error pulling books from Supabase:", booksError);
    throw booksError;
  }

  if (cloudBooks && cloudBooks.length > 0) {
    for (const cb of cloudBooks) {
      const localBook = await db.books.get(cb.id);
      
      const newBookData: Book = {
        id: cb.id,
        user_id: cb.user_id,
        name: cb.name,
        description: cb.description,
        color: Number(cb.color),
        icon: cb.icon,
        created_at: cb.created_at,
        updated_at: cb.updated_at,
        is_synced: 1,
        is_deleted: cb.is_deleted ? 1 : 0,
      };

      if (!localBook) {
        // If soft-deleted on cloud and not present locally, skip writing to conserve space
        if (cb.is_deleted) continue;
        await db.books.put(newBookData);
      } else {
        // If present locally, compare timestamps for last-write-wins
        const localTime = new Date(localBook.updated_at).getTime();
        const cloudTime = new Date(cb.updated_at).getTime();

        if (cloudTime > localTime) {
          if (cb.is_deleted) {
            // Purge locally if soft-deleted in cloud and cloud is newer
            await db.books.delete(cb.id);
            await db.transactions.where("book_id").equals(cb.id).delete();
          } else {
            await db.books.put(newBookData);
          }
        }
      }
    }
  }

  // 2. Pull Transactions
  const { data: cloudTx, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId);

  if (txError) {
    console.error("Error pulling transactions from Supabase:", txError);
    throw txError;
  }

  if (cloudTx && cloudTx.length > 0) {
    for (const ct of cloudTx) {
      const localTx = await db.transactions.get(ct.id);

      // Create transaction object matching local schema
      const newTxData: Transaction = {
        id: ct.id,
        user_id: ct.user_id,
        // Ensure local format retains a full ISO timestamp structure
        transaction_date: ct.transaction_date.includes("T")
          ? ct.transaction_date
          : `${ct.transaction_date}T12:00:00.000Z`, 
        description: ct.description,
        amount: Number(ct.amount),
        type: ct.type as "income" | "expense",
        book_id: ct.book_id,
        is_synced: 1,
        is_deleted: ct.is_deleted ? 1 : 0,
      };

      if (!localTx) {
        if (ct.is_deleted) continue;
        
        // Verify parent book exists locally before saving transaction
        const parentBook = await db.books.get(ct.book_id);
        if (parentBook) {
          await db.transactions.put(newTxData);
        }
      } else {
        // If local is synced (no unpushed local modifications), apply cloud updates
        if (localTx.is_synced === 1) {
          if (ct.is_deleted) {
            await db.transactions.delete(ct.id);
          } else {
            await db.transactions.put(newTxData);
          }
        }
      }
    }
  }
}

/**
 * Performs a complete push then pull sync cycle
 */
export async function syncAll(userId: string | null): Promise<void> {
  if (!userId) return; // Cannot sync guest session
  
  const isOnline = await checkConnectivity();
  if (!isOnline) {
    console.warn("Device is offline. Skipping synchronization.");
    return;
  }

  try {
    console.log("Starting push sync...");
    await pushLocalChanges(userId);
    
    console.log("Starting pull sync...");
    await pullCloudChanges(userId);
    
    console.log("Synchronization completed successfully.");
  } catch (error) {
    console.error("Synchronization cycle failed:", error);
    throw error;
  }
}

/**
 * Migrates all local Guest data (where user_id is null) to the registered user ID.
 * Sets is_synced = 0 on all items and executes a syncAll.
 */
export async function migrateGuestData(userId: string): Promise<void> {
  console.log(`Starting migration of guest data for user: ${userId}`);
  
  await db.transaction("rw", [db.books, db.transactions], async () => {
    // 1. Migrate guest books
    const guestBooks = await db.books.filter((b) => b.user_id === null).toArray();
    for (const book of guestBooks) {
      await db.books.update(book.id, {
        user_id: userId,
        is_synced: 0,
      });
    }

    // 2. Migrate guest transactions
    const guestTx = await db.transactions.filter((t) => t.user_id === null).toArray();
    for (const tx of guestTx) {
      await db.transactions.update(tx.id, {
        user_id: userId,
        is_synced: 0,
      });
    }
  });

  console.log("Guest data successfully re-associated with user ID. Running sync...");
  await syncAll(userId);
}
