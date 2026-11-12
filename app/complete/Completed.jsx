"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readHistory, saveHistory } from "../../lib/storage";
import styles from "./page.module.css";

const formatDate = ms => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatRange = run => formatDate(run.start) + " – " + formatDate(run.end);

export default function Completed() {
  // null until mounted: runs only exist in the visitor's browser.
  const [history, setHistory] = useState(null);
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const runs = readHistory();
    // Open on the newest unrated run, else the newest run.
    let open = runs.length - 1;
    for (let i = runs.length - 1; i >= 0; i--) {
      if (runs[i].rating === null) {
        open = i;
        break;
      }
    }
    setHistory(runs);
    setSelected(Math.max(0, open));
  }, []);

  const run = history?.[selected];
  const number = selected + 1;

  useEffect(() => {
    if (!run) return;
    const title = "Run " + number + " · 31 days to tomorrow";
    document.title = title;
    // Next's metadata <title> can land after this effect; set it again once it has.
    const id = window.setTimeout(() => (document.title = title), 500);
    return () => window.clearTimeout(id);
  }, [run, number]);

  function rate(score) {
    const next = history.map((entry, i) => (i === selected ? { ...entry, rating: score } : entry));
    setHistory(next);
    setSaved(saveHistory(next) ? "Saved. Run " + number + " is a " + score + " out of 10." : "Couldn't save. This browser is blocking storage.");
  }

  function open(i) {
    setSelected(i);
    setSaved("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className={styles.app}>
      <section className={styles.content} aria-label="Completed 31-day runs">
        {history === null ? null : !run ? (
          <>
            <div>
              <h1>Nothing completed yet.</h1>
              <p className={styles.empty}>When your 31 days run out, they land here to be rated, and the countdown starts again.</p>
            </div>
            <BackLink />
          </>
        ) : (
          <>
            <div>
              <h1>{selected === history.length - 1 ? "Tomorrow is here." : "Run " + number + "."}</h1>
              <p className={styles.range}>{"Run " + number + " · " + formatRange(run)}</p>

              <div className={styles.rate}>
                <span className={styles.sectionLabel} id="rate-label">
                  {run.rating === null ? "Rate these 31 days" : "Your rating"}
                </span>
                <div className={styles.scale} role="group" aria-labelledby="rate-label">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button key={i} type="button" aria-label={i + 1 + " out of 10"} aria-pressed={run.rating === i + 1} onClick={() => rate(i + 1)}>
                      {i + 1}
                    </button>
                  ))}
                </div>
                <p className={styles.saved} aria-live="polite">{saved}</p>
              </div>
            </div>

            <div className={styles.history}>
              <span className={styles.sectionLabel}>Every run</span>
              <div className={styles.runs}>
                {history
                  .map((entry, i) => (
                    <button key={entry.end} type="button" className={styles.run} aria-current={i === selected} onClick={() => open(i)}>
                      <span className={styles.runN}>Run {i + 1}</span>
                      <span className={styles.runDates}>{formatRange(entry)}</span>
                      <span className={entry.rating === null ? styles.runScore + " " + styles.isEmpty : styles.runScore}>
                        {entry.rating === null ? "Unrated" : entry.rating + "/10"}
                      </span>
                    </button>
                  ))
                  .reverse()}
              </div>
            </div>

            <BackLink />
          </>
        )}
      </section>
    </main>
  );
}

function BackLink() {
  return (
    <Link className={styles.back} href="/">
      Back to the countdown
    </Link>
  );
}
