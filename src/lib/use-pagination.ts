"use client";
import { useState } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [requested, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requested, totalPages);
  return {
    page,
    setPage,
    totalPages,
    total: items.length,
    pageSize,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
  };
}
