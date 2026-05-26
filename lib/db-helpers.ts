import { db, type Book, type Transaction } from "./db";

// ==========================================
// BOOKS CRUD HELPERS
// ==========================================

export async function createBook(bookData: Omit<Book, "id" | "created_at" | "updated_at" | "is_synced" | "is_deleted">): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const newBook: Book = {
    ...bookData,
    id,
    created_at: now,
    updated_at: now,
    is_synced: 0,
    is_deleted: 0,
  };

  await db.books.add(newBook);
  return id;
}

export async function updateBook(id: string, updates: Partial<Omit<Book, "id" | "created_at" | "is_deleted">>): Promise<void> {
  const now = new Date().toISOString();
  await db.books.update(id, {
    ...updates,
    updated_at: now,
    is_synced: 0, // Reset sync since it's modified locally
  });
}

/**
 * Soft deletes a book. Cascades to soft-delete all transactions in this book.
 */
export async function softDeleteBook(id: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.transaction("rw", [db.books, db.transactions], async () => {
    // 1. Soft delete book
    await db.books.update(id, {
      is_deleted: 1,
      is_synced: 0,
      updated_at: now,
    });

    // 2. Soft delete all transactions belonging to this book
    const bookTxIds = await db.transactions
      .where("book_id")
      .equals(id)
      .and(tx => tx.is_deleted === 0)
      .primaryKeys();

    for (const txId of bookTxIds) {
      await db.transactions.update(txId, {
        is_deleted: 1,
        is_synced: 0,
      });
    }
  });
}

/**
 * Restores a soft-deleted book and its transactions.
 */
export async function restoreBook(id: string): Promise<void> {
  const now = new Date().toISOString();
  
  await db.transaction("rw", [db.books, db.transactions], async () => {
    // 1. Restore book
    await db.books.update(id, {
      is_deleted: 0,
      is_synced: 0,
      updated_at: now,
    });

    // 2. Restore all transactions belonging to this book
    const bookTxIds = await db.transactions
      .where("book_id")
      .equals(id)
      .and(tx => tx.is_deleted === 1)
      .primaryKeys();

    for (const txId of bookTxIds) {
      await db.transactions.update(txId, {
        is_deleted: 0,
        is_synced: 0,
      });
    }
  });
}

export async function permanentlyDeleteBook(id: string): Promise<void> {
  await db.transaction("rw", [db.books, db.transactions], async () => {
    await db.books.delete(id);
    await db.transactions.where("book_id").equals(id).delete();
  });
}

export async function getBooks(): Promise<Book[]> {
  return await db.books.where("is_deleted").equals(0).toArray();
}

export async function getDeletedBooks(): Promise<Book[]> {
  return await db.books.where("is_deleted").equals(1).toArray();
}


// ==========================================
// TRANSACTIONS CRUD HELPERS
// ==========================================

export async function createTransaction(txData: Omit<Transaction, "id" | "is_synced" | "is_deleted">): Promise<string> {
  const id = crypto.randomUUID();
  const newTx: Transaction = {
    ...txData,
    id,
    is_synced: 0,
    is_deleted: 0,
  };

  await db.transactions.add(newTx);
  
  // Update parent book's updated_at timestamp
  const now = new Date().toISOString();
  await db.books.update(txData.book_id, {
    updated_at: now,
    is_synced: 0,
  });

  return id;
}

export async function updateTransaction(id: string, updates: Partial<Omit<Transaction, "id" | "is_deleted">>): Promise<void> {
  await db.transactions.update(id, {
    ...updates,
    is_synced: 0,
  });

  // If book_id was changed or transaction updated, refresh parent book timestamp
  const tx = await db.transactions.get(id);
  if (tx) {
    const now = new Date().toISOString();
    await db.books.update(tx.book_id, {
      updated_at: now,
      is_synced: 0,
    });
  }
}

export async function softDeleteTransaction(id: string): Promise<void> {
  await db.transactions.update(id, {
    is_deleted: 1,
    is_synced: 0,
  });

  const tx = await db.transactions.get(id);
  if (tx) {
    const now = new Date().toISOString();
    await db.books.update(tx.book_id, {
      updated_at: now,
      is_synced: 0,
    });
  }
}

export async function restoreTransaction(id: string): Promise<void> {
  await db.transactions.update(id, {
    is_deleted: 0,
    is_synced: 0,
  });

  const tx = await db.transactions.get(id);
  if (tx) {
    const now = new Date().toISOString();
    await db.books.update(tx.book_id, {
      updated_at: now,
      is_synced: 0,
    });
  }
}

export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  const tx = await db.transactions.get(id);
  await db.transactions.delete(id);
  if (tx) {
    const now = new Date().toISOString();
    await db.books.update(tx.book_id, {
      updated_at: now,
      is_synced: 0,
    });
  }
}

export async function bulkSoftDeleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  await db.transaction("rw", [db.books, db.transactions], async () => {
    // Fetch unique book IDs from the transactions being deleted
    const booksToUpdate = new Set<string>();
    
    for (const id of ids) {
      const tx = await db.transactions.get(id);
      if (tx) {
        booksToUpdate.add(tx.book_id);
        await db.transactions.update(id, {
          is_deleted: 1,
          is_synced: 0,
        });
      }
    }

    const now = new Date().toISOString();
    for (const bookId of booksToUpdate) {
      await db.books.update(bookId, {
        updated_at: now,
        is_synced: 0,
      });
    }
  });
}

export async function getTransactions(bookId?: string): Promise<Transaction[]> {
  if (bookId) {
    return await db.transactions
      .where("book_id")
      .equals(bookId)
      .and(tx => tx.is_deleted === 0)
      .reverse()
      .sortBy("transaction_date");
  }
  return await db.transactions
    .where("is_deleted")
    .equals(0)
    .reverse()
    .sortBy("transaction_date");
}

export interface SimilarGroup {
  description: string;
  count: number;
  total: number;
  transactions: Transaction[];
}

/**
 * Groups active transactions in a book by identical descriptions.
 * Only returns groups containing similar transactions (count > 1).
 */
export async function getSimilarTransactions(bookId: string): Promise<SimilarGroup[]> {
  const activeTx = await db.transactions
    .where("book_id")
    .equals(bookId)
    .and(tx => tx.is_deleted === 0)
    .toArray();

  const groups: { [desc: string]: Transaction[] } = {};

  // Clean description and group them
  for (const tx of activeTx) {
    const desc = (tx.description || "").trim().toLowerCase();
    if (!desc) continue; // Skip empty description
    if (!groups[desc]) {
      groups[desc] = [];
    }
    groups[desc].push(tx);
  }

  const result: SimilarGroup[] = [];

  for (const desc in groups) {
    const txList = groups[desc];
    if (txList.length > 1) {
      const originalDesc = txList[0].description || "";
      const totalAmount = txList.reduce((sum, tx) => sum + tx.amount, 0);
      result.push({
        description: originalDesc,
        count: txList.length,
        total: totalAmount,
        transactions: txList.sort(
          (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ),
      });
    }
  }

  // Sort groups by total amount (descending)
  return result.sort((a, b) => b.total - a.total);
}
