"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import styles from "./SearchBar.module.scss";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.container}>
        <Search className={styles.icon} size={18} />
        <Input
          type="text"
          placeholder="Plotを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.input}
        />
        <Button type="submit" size="sm" className={styles.button}>
          検索
        </Button>
      </div>
    </form>
  );
}
