"use client";

import React, { createContext, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Book } from "../db";

export interface BookContextType {
  activeBookId: string | null;
  activeBook: Book | null;
  books: Book[];
  loading: boolean;
  switchBook: (id: string) => void;
}

export const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by tracking client mounting
  useEffect(() => {
    setIsMounted(true);
    const savedBookId = localStorage.getItem("active_book_id");
    if (savedBookId) {
      setActiveBookId(savedBookId);
    }
  }, []);

  // Fetch active books reactively using Dexie's live query
  const books = useLiveQuery(
    () => db.books.where("is_deleted").equals(0).toArray(),
    []
  ) || [];

  // Fetch activeBook reactively
  const activeBook = useLiveQuery(
    async () => {
      if (!activeBookId) return null;
      const b = await db.books.get(activeBookId);
      return b || null;
    },
    [activeBookId]
  ) || null;

  // Auto-switch to first available book if nothing selected or book is deleted/not found
  useEffect(() => {
    if (!isMounted || books.length === 0) return;

    const bookExists = books.some((b) => b.id === activeBookId);
    if (!activeBookId || !bookExists) {
      const firstBookId = books[0].id;
      setActiveBookId(firstBookId);
      localStorage.setItem("active_book_id", firstBookId);
    }
  }, [books, activeBookId, isMounted]);

  const switchBook = (id: string) => {
    setActiveBookId(id);
    localStorage.setItem("active_book_id", id);
  };

  const loading = !isMounted || (books.length > 0 && !activeBookId);

  return (
    <BookContext.Provider
      value={{
        activeBookId,
        activeBook: activeBook && activeBook.is_deleted === 0 ? activeBook : null,
        books,
        loading,
        switchBook,
      }}
    >
      {children}
    </BookContext.Provider>
  );
}
