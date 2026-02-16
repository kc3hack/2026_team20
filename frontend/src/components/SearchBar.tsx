"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import type { PlotItem } from "@/lib/api";
import styles from "./SearchBar.module.scss";

interface SearchBarProps {
  onResults?: (items: PlotItem[], query: string) => void;
}

export default function SearchBar({ onResults }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const res = await api.search.query(q, 8);
        setResults(res.items);
        setShowDropdown(true);
        onResults?.(res.items, q);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [onResults],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => search(value), 300);
    },
    [search],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowDropdown(false);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (timerRef.current) clearTimeout(timerRef.current);
        search(query);
      }
    },
    [query, search],
  );

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="8"
            cy="8"
            r="5.5"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12.5 12.5L16 16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          className={styles.input}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder="Plotを検索…"
          aria-label="Plotを検索"
        />
        {loading && <span className={styles.spinner} />}
      </div>

      {showDropdown && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map((item) => (
            <a
              key={item.id}
              href={`/plots/${item.id}`}
              className={styles.resultItem}
            >
              <span className={styles.resultTitle}>{item.title}</span>
              <span className={styles.resultMeta}>
                <span className={styles.resultStar}>★ {item.starCount}</span>
                {item.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className={styles.resultTag}>
                    {tag}
                  </span>
                ))}
              </span>
            </a>
          ))}
        </div>
      )}

      {showDropdown && !loading && query.trim() && results.length === 0 && (
        <div className={styles.dropdown}>
          <div className={styles.noResults}>
            「{query}」に一致するPlotが見つかりません
          </div>
        </div>
      )}
    </div>
  );
}
