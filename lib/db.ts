import Dexie, { type Table } from "dexie";

// Interface for Book representing the sqlite 'books' table schema
export interface Book {
  id: string; // UUID v4
  user_id: string | null;
  name: string;
  description: string | null;
  color: number; // hex/decimal integer representing ARGB
  icon: string; // name of tabler icon
  created_at: string; // ISO8601 String
  updated_at: string; // ISO8601 String
  is_synced: number; // 0 = false, 1 = true
  is_deleted: number; // 0 = false, 1 = true (soft-delete in trash)
}

// Interface for Transaction representing the sqlite 'transactions' table schema
export interface Transaction {
  id: string; // UUID v4
  user_id: string | null;
  transaction_date: string; // ISO8601 String (e.g. "2026-05-26T23:20:59Z")
  description: string | null;
  amount: number; // double/float nominal
  type: "income" | "expense";
  book_id: string; // Foreign key referencing Book.id
  is_synced: number; // 0 = false, 1 = true
  is_deleted: number; // 0 = false, 1 = true
}

export class TiczyDatabase extends Dexie {
  books!: Table<Book>;
  transactions!: Table<Transaction>;

  constructor() {
    super("ticzy_db");
    
    // Define schema. We only index columns we query or filter by.
    this.version(1).stores({
      books: "id, user_id, name, is_synced, is_deleted",
      transactions: "id, user_id, transaction_date, book_id, is_synced, is_deleted",
    });

    // Populate default database values on first open
    this.on("populate", () => {
      this.seedData();
    });
  }

  private async seedData() {
    const defaultBookId = crypto.randomUUID();
    const now = new Date().toISOString();

    const defaultBook: Book = {
      id: defaultBookId,
      user_id: null,
      name: "Buku Utama",
      description: "Buku catatan keuangan utama harian Anda",
      color: 4279031273, // Hex for a nice primary color (e.g., 0xFF0EA5E9 in ARGB)
      icon: "IconWallet", // Tabler Icon name
      created_at: now,
      updated_at: now,
      is_synced: 0,
      is_deleted: 0,
    };

    await this.books.add(defaultBook);
  }
}

// Export a single database instance
export const db = new TiczyDatabase();
