"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DURATION_MS, completeRun, getOrCreateDeadline, readHistory } from "../lib/storage";
import styles from "./page.module.css";

const TOTAL_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;
const SITE_TITLE = "31 days to tomorrow";

const pad = value => String(value).padStart(2, "0");

export default function Countdown() {
  const router = useRouter();
  // Both stay null on the server; the deadline only exists in the visitor's browser.
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(null);
  const [streak, setStreak] = useState(0);
  const secondsRef = useRef(null);
  const lastSeconds = useRef(null);

  useEffect(() => {
    const target = getOrCreateDeadline();
    let timerId = null;
    let done = false;

    setDeadline(target);
    setStreak(readHistory().length);

    function tick() {
      const time = Date.now();
      if (time >= target) {
        if (done) return;
        done = true;
        completeRun(target);
        router.replace("/complete");
        return;
      }
      setNow(time);
      // Recalculate from the real deadline on every tick, avoiding drift.
      // Align updates to the next second and recover immediately after sleep.
      timerId = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }

    function refresh() {
      window.clearTimeout(timerId);
      tick();
    }

    const onVisibility = () => {
      if (!document.hidden) refresh();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    tick();

    return () => {
      done = true;
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router]);

  const ready = deadline !== null && now !== null;
  const remainingMs = ready ? Math.max(0, deadline - now) : DURATION_MS;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const totalHours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  // Index of the current day (0-30); -1 before the deadline is known.
  const dayIndex = ready
    ? Math.min(TOTAL_DAYS - 1, Math.max(0, Math.floor((now - (deadline - DURATION_MS)) / DAY_MS)))
    : -1;

  // Re-applied every tick: Next's metadata <title> can land after the first effect and overwrite it.
  useEffect(() => {
    if (ready) document.title = totalHours + "h " + pad(minutes) + "m · " + SITE_TITLE;
  });

  useEffect(() => {
    if (!ready) return;
    const changed = lastSeconds.current !== null && lastSeconds.current !== seconds;
    lastSeconds.current = seconds;
    const el = secondsRef.current;
    if (!changed || !el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.animate(
      [
        { opacity: 0.35, transform: "translateY(-3px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 420, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }
    );
  }, [ready, seconds]);

  return (
    <main className={styles.app}>
      <section className={styles.content} aria-label="Countdown to tomorrow">
        <Link
          className={styles.streak}
          href="/complete"
          aria-label={"Streak: " + streak + " completed 31-day " + (streak === 1 ? "run" : "runs") + ". View and rate them."}
        >
          Streak <strong>{streak}</strong>
        </Link>
        <h1>31 days to tomorrow</h1>

        <div
          className={styles.countdown}
          role="timer"
          aria-live="off"
          aria-label={totalHours + " total hours, " + minutes + " minutes and " + seconds + " seconds remaining"}
        >
          <div className={styles.hoursBlock}>
            <span className={styles.hoursNumber}>{totalHours}</span>
            <span className={styles.hoursLabel}>Total hours remaining</span>
          </div>

          <div className={styles.timeUnits} aria-label="Minutes and seconds remaining">
            <div className={styles.unit}>
              <span className={styles.unitValue}>{pad(minutes)}</span>
              <span className={styles.unitLabel}>Minutes</span>
            </div>
            <span className={styles.unitSeparator} aria-hidden="true">:</span>
            <div className={styles.unit}>
              <span className={styles.unitValue} ref={secondsRef}>{pad(seconds)}</span>
              <span className={styles.unitLabel}>Seconds</span>
            </div>
          </div>
        </div>

        <div className={styles.days}>
          <span className={styles.daysLabel}>
            Day <strong>{Math.max(0, dayIndex) + 1}</strong> of 31
          </span>
          <div className={styles.dayTrack} aria-hidden="true">
            {Array.from({ length: TOTAL_DAYS }, (_, i) => (
              <span
                key={i}
                className={[styles.day, i < dayIndex && styles.isPast, i === dayIndex && styles.isToday].filter(Boolean).join(" ")}
              />
            ))}
          </div>
        </div>

        <blockquote className={styles.quote}>
          <div className={styles.quietRule} aria-hidden="true" />
          <span className={styles.quoteMark}>“</span>An idiot in motion goes farther than a genius at rest<span className={styles.quoteMark}>.”</span>
        </blockquote>

        <SinceNov8 />
      </section>
    </main>
  );
}

// Counts up from midnight Nov 8, 2026 in the viewer's local time; keeps running across countdown restarts.
function SinceNov8() {
  const [text, setText] = useState("0d 00h 00m 00s");

  useEffect(() => {
    const start = new Date(2026, 10, 8).getTime();
    function render() {
      const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setText(Math.floor(s / 86400) + "d " + pad(Math.floor(s / 3600) % 24) + "h " + pad(Math.floor(s / 60) % 60) + "m " + pad(s % 60) + "s");
    }
    render();
    const id = window.setInterval(render, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.since}>
      <span className={styles.sinceValue} role="timer" aria-label="Time since November 8">{text}</span>
      <span className={styles.sinceNote}>Stand on it</span>
    </div>
  );
}
