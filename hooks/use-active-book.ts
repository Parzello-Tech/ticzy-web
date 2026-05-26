"use client";

import { useContext } from "react";
import { BookContext, type BookContextType } from "@/lib/context/book-context";

export function useActiveBook(): BookContextType {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error("useActiveBook must be used within a BookProvider");
  }
  return context;
}
