"use client";

import { useEffect, useMemo, useState } from "react";

const tabs = [
  ["explore", "Explore tree"],
  ["pedigree", "Pedigree"],
  ["people", "People"],
  ["evidence", "Evidence"],
];

function compactName(name) {
  return name === "Lyndon William James Jones" ? "Lyndon Jones" : name;
}

function statusLabel(status) {
  return status === "not_completed" ? "Not completed" : status[0].toUpperCase() + status.slice(1);
}

function sourceLabel(relationship) {
  return relationship.evidenceSourceId === "Public institutional record" ? "Public institutional record" : "Uploaded document";
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function PersonButton({ person, meta, onSelect, direction }) {
  return (
    <button className="relation-card" onClick={() => onSelect(person.id)}>
      <span className="relation-kicker">{direction}</span>
      <strong>{compactName(person.name)}</strong>
      <span>{meta}</span>
      <span className="relation-action">View profile <span aria-hidden="true">→</span></span>
    </button>
  );
}

function SearchBox({ value, onChange, people, onPick, placeholder = "Search people, theses or institutions" }) {
  const suggestions = value.trim()
    ? people.filter((person) => person.name.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="search-wrap">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {suggestions.length > 0 && onPick && (
        <div className="suggestions">
          {suggestions.map((person) => (
            <button key={person.id} onClick={() => onPick(person.id)}>{compactName(person.name)}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function PedigreeTree({ data, model, selectedId, onSelect }) {
  const [zoom, setZoom] = useState(0.85);

  const layout = useMemo(() => {
    const ranks = Object.fromEntries(data.people.map((person) => [person.id, 0]));
    for (let pass = 0; pass < data.people.length; pass += 1) {
      let changed = false;
      data.relationships.forEach((relationship) => {
        const nextRank = ranks[relationship.supervisorId] + 1;
        if (nextRank > ranks[relationship.candidateId]) {
          ranks[relationship.candidateId] = nextRank;
          changed = true;
        }
      });
      if (!changed) break;
    }

    const levels = {};
    data.people.forEach((person) => (levels[ranks[person.id]] ||= []).push(person));
    Object.values(levels).forEach((people) => people.sort((a, b) => a.name.localeCompare(b.name)));

    const nodeWidth = 148;
    const nodeHeight = 76;
    const gapX = 32;
    const gapY = 92;
    const padding = 70;
    const maxColumns = Math.max(...Object.values(levels).map((people) => people.length));
    const width = Math.max(1080, padding * 2 + maxColumns * nodeWidth + (maxColumns - 1) * gapX);
    const rankValues = Object.keys(levels).map(Number).sort((a, b) => a - b);
    const positions = {};

    rankValues.forEach((rank, rowIndex) => {
      const people = levels[rank];
      const rowWidth = people.length * nodeWidth + (people.length - 1) * gapX;
      const startX = (width - rowWidth) / 2;
      people.forEach((person, columnIndex) => {
        positions[person.id] = {
          x: startX + columnIndex * (nodeWidth + gapX),
          y: padding + rowIndex * (nodeHeight + gapY),
          rank,
        };
      });
    });

    return {
      width,
      height: padding * 2 + rankValues.length * nodeHeight + Math.max(0, rankValues.length - 1) * gapY,
      positions,
      nodeWidth,
      nodeHeight,
    };
  }, [data]);

  const selected = model.peopleById[selectedId];

  return (
    <section className="pedigree-section">
      <div className="section-heading">
        <div><p className="eyebrow">Whole network</p><h2>Interactive pedigree</h2></div>
        <p>Each line runs from a postgraduate supervisor to a candidate. Degree types are shown on candidate nodes; select a person to highlight their immediate academic family.</p>
      </div>
      <div className="tree-toolbar">
        <div className="tree-selected"><span>Selected</span><strong>{compactName(selected.name)}</strong></div>
        <div className="tree-controls" aria-label="Tree zoom controls">
          <button onClick={() => setZoom((value) => Math.max(0.45, value - 0.1))} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(1.35, value + 0.1))} aria-label="Zoom in">+</button>
          <button className="tree-reset" onClick={() => setZoom(0.85)}>Reset</button>
        </div>
      </div>
      <div className="tree-viewport" aria-label="Scrollable academic pedigree">
        <div className="tree-scale" style={{ width: layout.width * zoom, height: layout.height * zoom }}>
          <div className="tree-stage" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
            <svg className="tree-lines" width={layout.width} height={layout.height} aria-hidden="true">
              {data.relationships.map((relationship) => {
                const from = layout.positions[relationship.supervisorId];
                const to = layout.positions[relationship.candidateId];
                if (!from || !to) return null;
                const x1 = from.x + layout.nodeWidth / 2;
                const y1 = from.y + layout.nodeHeight;
                const x2 = to.x + layout.nodeWidth / 2;
                const y2 = to.y;
                const midY = (y1 + y2) / 2;
                const related = relationship.supervisorId === selectedId || relationship.candidateId === selectedId;
                return <path key={relationship.id} className={related ? "tree-line active" : "tree-line"} d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`} />;
              })}
            </svg>
            {data.people.map((person) => {
              const position = layout.positions[person.id];
              const isSelected = person.id === selectedId;
              const degreeTypes = [...new Set((model.parentsByPerson[person.id] || []).map((item) => item.degreeType))];
              const degreeSummary = degreeTypes.length ? degreeTypes.join(" / ") : "Supervisor";
              const isRelative = (model.parentsByPerson[selectedId] || []).some((item) => item.supervisorId === person.id)
                || (model.childrenByPerson[selectedId] || []).some((item) => item.candidateId === person.id);
              return (
                <button
                  key={person.id}
                  className={`tree-node${isSelected ? " selected" : ""}${isRelative ? " relative" : ""}`}
                  style={{ left: position.x, top: position.y, width: layout.nodeWidth, height: layout.nodeHeight }}
                  onClick={() => onSelect(person.id)}
                >
                  <span>{person.id}</span>
                  <strong>{compactName(person.name)}</strong>
                  <small>{degreeSummary} · Gen {position.rank + 1}</small>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="tree-legend"><span><i className="legend-selected" /> Selected person</span><span><i className="legend-relative" /> Parent or child</span><span><i className="legend-line" /> Supervision relationship</span></div>
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("explore");
  const [selectedId, setSelectedId] = useState("P002");
  const [query, setQuery] = useState("");
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [identityFilter, setIdentityFilter] = useState("all");

  useEffect(() => {
    fetch("/data/genealogy.json").then((response) => response.json()).then(setData);
  }, []);

  const model = useMemo(() => {
    if (!data) return null;
    const peopleById = Object.fromEntries(data.people.map((person) => [person.id, person]));
    const parentsByPerson = {};
    const childrenByPerson = {};
    data.relationships.forEach((relationship) => {
      (parentsByPerson[relationship.candidateId] ||= []).push(relationship);
      (childrenByPerson[relationship.supervisorId] ||= []).push(relationship);
    });
    Object.values(childrenByPerson).forEach((items) => items.sort((a, b) => (a.year || 9999) - (b.year || 9999)));
    return { peopleById, parentsByPerson, childrenByPerson };
  }, [data]);

  if (!data || !model) {
    return <main className="loading"><div className="loading-mark">O</div><p>Growing the tree…</p></main>;
  }

  const selected = model.peopleById[selectedId] || data.people[0];
  const parentLinks = model.parentsByPerson[selected.id] || [];
  const childLinks = model.childrenByPerson[selected.id] || [];
  const aggregate = data.reportedTotals.find((item) => item.supervisorId === selected.id);

  const pickPerson = (id) => {
    setSelectedId(id);
    setQuery("");
    setTab("explore");
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  const pickTreePerson = (id) => {
    setSelectedId(id);
    setQuery("");
  };

  const directoryPeople = data.people.filter((person) => {
    const matchesText = person.name.toLowerCase().includes(directoryQuery.toLowerCase());
    const matchesIdentity = identityFilter === "all" || person.identityStatus === identityFilter;
    return matchesText && matchesIdentity;
  });

  const evidenceRows = data.relationships.filter((relationship) => {
    const supervisor = model.peopleById[relationship.supervisorId]?.name || "";
    const candidate = model.peopleById[relationship.candidateId]?.name || "";
    const haystack = [supervisor, candidate, relationship.degreeType, relationship.thesisTitle, relationship.institution].join(" ").toLowerCase();
    return haystack.includes(directoryQuery.toLowerCase());
  });

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" onClick={() => setTab("explore")}>
          <span className="brand-mark">O</span>
          <span>Optometry<br /><em>Academic Genealogy</em></span>
        </a>
        <nav aria-label="Main navigation">
          {tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}
        </nav>
        <span className="edition">Research preview · 2026</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">An evidence-led academic family tree</p>
          <h1>Tracing the people who shaped <span>optometry research.</span></h1>
          <p className="intro">Explore postgraduate supervision across optometry and vision science—one degree, thesis, mentor and academic generation at a time.</p>
          <SearchBox value={query} onChange={setQuery} people={data.people} onPick={pickPerson} />
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="orbit orbit-one"><span>PG</span></div>
          <div className="orbit orbit-two"><span>1994</span></div>
          <div className="orbit orbit-three"><span>2001</span></div>
          <div className="root-word">lineage</div>
        </div>
      </section>

      <section className="stats" aria-label="Dataset summary">
        <div><strong>{data.people.length}</strong><span>people identified</span></div>
        <div><strong>{data.relationships.length}</strong><span>named supervision links</span></div>
        <div><strong>{data.relationships.filter((item) => item.status === "awarded").length}</strong><span>completed postgraduate links</span></div>
        <div><strong>{data.sources.length}</strong><span>uploaded documents reviewed</span></div>
      </section>

      <div className="page-shell">
        {tab === "explore" && (
          <section className="explore-section">
            <div className="section-heading">
              <div><p className="eyebrow">Family view</p><h2>Explore a lineage</h2></div>
              <p>Select any card to move through the network. A person can have several academic parents and children.</p>
            </div>

            <div className="lineage-grid">
              <div className="lineage-column">
                <p className="column-label">Academic parents</p>
                {parentLinks.length ? parentLinks.map((relationship) => (
                  <PersonButton key={relationship.id} person={model.peopleById[relationship.supervisorId]} onSelect={pickPerson} direction={`${relationship.degreeType} supervisor`} meta={`${relationship.institution} · ${relationship.year || "Year unknown"}`} />
                )) : <div className="empty-card">No parent relationship is yet evidenced in the current sources.</div>}
              </div>

              <article className="profile-card">
                <div className="profile-topline"><span>{selected.id}</span><Badge tone={selected.identityStatus === "provisional_match" ? "warning" : "green"}>{selected.identityStatus.replaceAll("_", " ")}</Badge></div>
                <div className="monogram">{selected.name.split(" ").filter((part) => !part.includes(".")).slice(0, 2).map((part) => part[0]).join("") || selected.name[0]}</div>
                <p className="eyebrow">Selected researcher</p>
                <h2>{compactName(selected.name)}</h2>
                <div className="profile-counts">
                  <span><strong>{parentLinks.length}</strong> named parent{parentLinks.length === 1 ? "" : "s"}</span>
                  <span><strong>{childLinks.length}</strong> named child{childLinks.length === 1 ? "" : "ren"}</span>
                </div>
                {selected.note && <p className="profile-note">{selected.note}</p>}
                {parentLinks.map((relationship) => (
                  <div className="thesis-block" key={relationship.id}>
                    <span>{relationship.degreeType} thesis</span>
                    <strong>{relationship.thesisTitle}</strong>
                    <small>{relationship.institution} · {relationship.year || "In progress"} · {relationship.supervisorRole}</small>
                  </div>
                ))}
                {aggregate && (
                  <div className="aggregate-note">
                    <strong>{aggregate.completedPhdCount} completed + {aggregate.activePhdCount} active PhD students reported</strong>
                    <strong>{aggregate.completedMscCount} completed + {aggregate.activeMscCount} active MSc students reported</strong>
                    <span>Names are not provided in the uploaded document, so these are not shown as individual relationships.</span>
                  </div>
                )}
              </article>

              <div className="lineage-column children-column">
                <p className="column-label">Academic children <span>{childLinks.length}</span></p>
                <div className="children-scroll">
                  {childLinks.length ? childLinks.map((relationship) => (
                    <PersonButton key={relationship.id} person={model.peopleById[relationship.candidateId]} onSelect={pickPerson} direction={`${relationship.degreeType} · ${statusLabel(relationship.status)}`} meta={`${relationship.year || "In progress"} · ${relationship.supervisorRole}`} />
                  )) : <div className="empty-card">No named postgraduate children are present in the current sources.</div>}
                </div>
              </div>
            </div>

            <div className="method-strip">
              <div><p className="eyebrow">Reading the tree</p><h3>A network, not a pedigree.</h3></div>
              <p>Postgraduate degrees can have several supervisors. Shared supervision creates siblings, half-siblings and intersecting branches. The actual degree—such as PhD, MPhil or DSc—is retained for every relationship.</p>
              <button onClick={() => setTab("evidence")}>See the evidence <span>→</span></button>
            </div>
          </section>
        )}

        {tab === "pedigree" && (
          <PedigreeTree data={data} model={model} selectedId={selected.id} onSelect={pickTreePerson} />
        )}

        {tab === "people" && (
          <section className="directory-section">
            <div className="section-heading"><div><p className="eyebrow">Directory</p><h2>People in the tree</h2></div><p>Names are preserved as initials where the source does not establish a full identity.</p></div>
            <div className="directory-tools">
              <SearchBox value={directoryQuery} onChange={setDirectoryQuery} people={[]} placeholder="Search the people directory" />
              <select value={identityFilter} onChange={(event) => setIdentityFilter(event.target.value)} aria-label="Filter identity status">
                <option value="all">All identity states</option><option value="named">Fully named</option><option value="initials_only">Initials only</option><option value="provisional_match">Provisional matches</option>
              </select>
            </div>
            <div className="people-grid">
              {directoryPeople.map((person) => {
                const parents = model.parentsByPerson[person.id]?.length || 0;
                const children = model.childrenByPerson[person.id]?.length || 0;
                return <button className="person-tile" key={person.id} onClick={() => pickPerson(person.id)}><span className="tile-id">{person.id}</span><h3>{compactName(person.name)}</h3><p>{parents} parent{parents === 1 ? "" : "s"} · {children} named child{children === 1 ? "" : "ren"}</p><Badge tone={person.identityStatus === "provisional_match" ? "warning" : "neutral"}>{person.identityStatus.replaceAll("_", " ")}</Badge></button>;
              })}
            </div>
          </section>
        )}

        {tab === "evidence" && (
          <section className="evidence-section">
            <div className="section-heading"><div><p className="eyebrow">Source overview</p><h2>Evidence-supported relationships</h2></div><p>Uploaded documents and public institutional records are used to verify the network. Personal document details, filenames and page references are not displayed.</p></div>
            <div className="source-grid">
              {data.sources.map((source, index) => <article className="source-card" key={source.id}><span>Document {index + 1}</span><h3>Uploaded document</h3><p>Private source record</p><small>Used to support named postgraduate supervision relationships.</small></article>)}
              <article className="source-card"><span>Public sources</span><h3>Institutional records</h3><p>Official source records</p><small>Used without displaying detailed evidence trails on the public site.</small></article>
            </div>
            <div className="evidence-table-wrap">
              <div className="table-tools"><h3>Named supervision records</h3><SearchBox value={directoryQuery} onChange={setDirectoryQuery} people={[]} placeholder="Filter relationships" /></div>
              <div className="evidence-table" role="table">
                <div className="evidence-row evidence-header" role="row"><span>Supervisor → candidate</span><span>Degree / award</span><span>Source</span></div>
                {evidenceRows.map((relationship) => <button className="evidence-row" role="row" key={relationship.id} onClick={() => pickPerson(relationship.candidateId)}><span><strong>{compactName(model.peopleById[relationship.supervisorId].name)} → {compactName(model.peopleById[relationship.candidateId].name)}</strong><small>{relationship.institution}</small></span><span><strong>{relationship.degreeType} · {relationship.year || "Ongoing"} · {statusLabel(relationship.status)}</strong><small>{relationship.thesisTitle}</small></span><span><Badge tone="neutral">{sourceLabel(relationship)}</Badge></span></button>)}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer><div className="brand footer-brand"><span className="brand-mark">O</span><span>Optometry<br /><em>Academic Genealogy</em></span></div><p>A research preview built from uploaded documents and public institutional evidence. Corrections and further primary sources are welcomed.</p><span>Dataset updated {data.generatedAt}</span></footer>
    </main>
  );
}
