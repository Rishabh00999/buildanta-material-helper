"use client";

import { useState, FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error" | "empty";

export default function Home() {
  const [material, setMaterial] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = material.trim();

    // Empty input case
    if (!trimmed) {
      setStatus("empty");
      setResult("");
      setErrorMessage("");
      return;
    }

    setStatus("loading");
    setResult("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/material-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        // API failure case
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setResult(data.result);
    } catch {
      // Network failure / fetch threw (server unreachable, etc.)
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-16">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            Buildanta
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Material Helper
          </h1>
          <p className="text-gray-600">
            Type a construction material, and get 3 things a first-time
            homeowner in Kanpur should check before buying it.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="e.g. TMT bar, cement, tiles"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            disabled={status === "loading"}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Checking…" : "Submit"}
          </button>
        </form>

        {/* Empty input case */}
        {status === "empty" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            Please type a material first — try something like &ldquo;cement&rdquo; or &ldquo;tiles&rdquo;.
          </div>
        )}

        {/* API failure case */}
        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {errorMessage}
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Asking the AI about &ldquo;{material.trim()}&rdquo;…
          </div>
        )}

        {/* Success — response display */}
        {status === "success" && result && (
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-gray-900">
              Before buying {material.trim()}, check:
            </h2>
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {result}
            </div>
          </div>
        )}

        <footer className="pt-8 text-sm text-gray-400">
          Buildanta Private Limited · Kanpur, UP
        </footer>
      </main>
    </div>
  );
}
