"use client";

import { useState, FormEvent, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { z } from "zod";

// ── Zod schemas ────────────────────────────────────────────────────────────────
const InputSchema = z.object({
  material: z
    .string()
    .min(1, `Type a material first — e.g. "TMT bar" or "tiles".`)
    .max(80, `Keep it short — try just "cement" or "tiles".`),
});

const ResponseSchema = z.object({
  result: z.string().min(1),
});

// ── Types ─────────────────────────────────────────────────────────────────────
type Status = "idle" | "loading" | "success" | "error";

// ── Parse numbered list from AI response ──────────────────────────────────────
function parseChecklist(text: string): string[] {
  return text
    .split(/\n/)
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export default function Home() {
  const [material, setMaterial] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedMaterial, setSubmittedMaterial] = useState("");
  const [visible, setVisible] = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "loading") return;

    // Client-side Zod validation
    const parsed = InputSchema.safeParse({ material: material.trim() });
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(parsed.error.issues[0].message);
      return;
    }

    setStatus("loading");
    setChecklist([]);
    setErrorMessage("");
    setSubmittedMaterial(material.trim());

    try {
      const { data } = await axios.post("/api/material-check", {
        material: material.trim(),
      });

      const validated = ResponseSchema.safeParse(data);
      if (!validated.success) {
        throw new Error("Unexpected response shape from server.");
      }

      setChecklist(parseChecklist(validated.data.result));
      setStatus("success");
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      const msg =
        axiosErr.response?.data?.error ||
        (err instanceof Error ? err.message : null) ||
        "Couldn't reach the server. Check your connection.";
      setStatus("error");
      setErrorMessage(msg);
    }
  }

  return (
    <>
      <div className="texture-strip" />

      <div className={`page ${visible ? "visible" : ""}`}>
        <div className="shell">

          {/* Header */}
          <header className="header">
            <div className="logo-mark">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="10" width="6" height="8" rx="1" fill="white" fillOpacity="0.9" />
                <rect x="10" y="6" width="8" height="12" rx="1" fill="white" />
                <rect x="4" y="4" width="4" height="4" rx="0.5" fill="white" fillOpacity="0.6" />
              </svg>
            </div>
            <span className="logo-text">Buildanta</span>
          </header>

          {/* Main */}
          <main>
            <div className="hero">
              <p className="hero-eyebrow">Material Helper · Kanpur</p>
              <h1 className="hero-title">
                Know before<br />you <em>buy</em>.
              </h1>
              <p className="hero-sub">
                Enter any construction material and get 3 things every
                first-time homeowner should check before purchasing.
              </p>

              <form className="form-wrap" onSubmit={handleSubmit} noValidate>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    className="input"
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="TMT bar, cement, tiles, bricks…"
                    disabled={status === "loading"}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                <button className="btn" type="submit" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <><div className="spinner" /> Checking…</>
                  ) : (
                    <>Check</>
                  )}
                </button>
              </form>
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="banner-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Loading */}
            {status === "loading" && (
              <div className="loading-row">
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <div className="pulse-dot" />
                <span>Looking up <strong>{submittedMaterial}</strong>…</span>
              </div>
            )}

            {/* Results */}
            {status === "success" && checklist.length > 0 && (
              <div className="result-card">
                <div className="result-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <div>
                    <div className="result-header-text">Before buying</div>
                    <div className="result-header-material">{submittedMaterial}</div>
                  </div>
                </div>
                <div className="checklist">
                  {checklist.map((item, i) => (
                    <div className="checklist-item" key={i}>
                      <div className="item-num">{i + 1}</div>
                      <p className="item-text">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="footer">
            <span>Buildanta Private Limited</span>
            <span className="footer-dot" />
            <span>Kanpur, UP</span>
          </footer>

        </div>
      </div>
    </>
  );
}