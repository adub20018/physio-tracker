// /definitions — what every value in the app means and where it comes from. Static
// reference: no user data, so nothing here needs the request-time rendering the
// dashboard pages do. Tooltips deep-link to #<variable id> (see lib/definitions.ts).
import type { Metadata } from "next";
import { DEFINITION_GROUPS, type VariableDefinition } from "@/lib/definitions";
import styles from "./definitions.module.css";

export const metadata: Metadata = {
  title: "Definitions · PhysiMate",
  description:
    "What every value in PhysiMate means, how it's collected, and the formulas behind the derived ones.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <div className={styles.rowValue}>{children}</div>
    </div>
  );
}

function Entry({ variable }: { variable: VariableDefinition }) {
  const isLogged = variable.kind === "logged";
  return (
    <section className={styles.entry} id={variable.id}>
      <div className={styles.entryHead}>
        <h3 className={styles.entryName}>{variable.name}</h3>
        <span
          className={`${styles.kind} ${
            isLogged ? styles.kindLogged : styles.kindDerived
          }`}
        >
          {isLogged ? "Logged" : "Derived"}
        </span>
      </div>

      <p className={styles.summary}>{variable.summary}</p>

      <div className={styles.rows}>
        <Row label={isLogged ? "Collected" : "Built from"}>
          {variable.collection}
        </Row>
        {variable.formula && (
          <Row label="Formula">
            <div className={styles.formula}>{variable.formula}</div>
          </Row>
        )}
        {variable.meaning && <Row label="Why it helps">{variable.meaning}</Row>}
        {(variable.unit || variable.range) && (
          <Row label="Units">
            {[variable.unit, variable.range].filter(Boolean).join(" · ")}
          </Row>
        )}
      </div>

      {variable.notes && variable.notes.length > 0 && (
        <ul className={styles.notes}>
          {variable.notes.map((note) => (
            <li key={note} className={styles.note}>
              {note}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function DefinitionsPage() {
  return (
    <main className="page" style={{ maxWidth: "48rem" }}>
      <header className="page-header">
        <h1>Definitions</h1>
        <p className="subtitle">
          Every value the app shows, and where it comes from.
        </p>
      </header>

      <p className={styles.intro}>
        Values are either <strong>logged</strong> — typed in on the Log page — or{" "}
        <strong>derived</strong>, calculated from logged values. Derived entries
        list the arithmetic behind them, so nothing here is a black box.
      </p>

      <nav className={styles.toc} aria-label="Jump to a definition">
        <div className={styles.tocTitle}>Jump to</div>
        {DEFINITION_GROUPS.map((group) => (
          <div key={group.id} className={styles.tocGroup}>
            <div className={styles.tocGroupTitle}>{group.title}</div>
            <ul className={styles.tocLinks}>
              {group.variables.map((v) => (
                <li key={v.id}>
                  <a className={styles.tocLink} href={`#${v.id}`}>
                    {v.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {DEFINITION_GROUPS.map((group) => (
        <section key={group.id} className={styles.group} id={group.id}>
          <h2 className={styles.groupTitle}>{group.title}</h2>
          <p className={styles.groupBlurb}>{group.blurb}</p>
          {group.variables.map((variable) => (
            <Entry key={variable.id} variable={variable} />
          ))}
        </section>
      ))}
    </main>
  );
}
