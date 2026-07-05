const { useState, useEffect, useMemo } = React;

/* ================================================================== *
 *  MISSA DO DOMINGO — Fortaleza
 *  Home (menu) -> Jornalzinho / Próximas missas / Igrejas & capelas
 *
 *  • Missas: domingo + vigília de sábado (>=16h), que cumpre o
 *    preceito dominical (CIC cân. 1248 §1). Dados estáticos, curados.
 *  • Jornalzinho: liturgia oficial do dia, buscada ao vivo da API
 *    pública liturgia.up.railway.app (CORS liberado). Estrutura
 *    inspirada na ORDEM DA MISSA (universal). Textos litúrgicos © CNBB.
 *  • Cor de destaque = cor litúrgica (calculada localmente; no
 *    jornalzinho, confirmada pela cor oficial que a API retorna).
 * ================================================================== */

const CHURCHES = [
  { id: "saovicente", name: "São Vicente de Paulo", area: "Aldeota",
    address: "Av. Desembargador Moreira, 2211 – Aldeota, Fortaleza",
    vigil: ["17:00"], sunday: ["06:30", "09:00", "11:30", "17:00", "19:00"] },
  { id: "lourdes", name: "N. Sra. de Lourdes", area: "Dunas",
    address: "Av. Padre Joaquim Colaço Dourado, s/n – De Lourdes, Fortaleza",
    vigil: ["18:00"], sunday: ["09:00", "11:00", "17:30", "19:30"] },
  { id: "paz", name: "Paróquia da Paz", area: "Aldeota",
    address: "Rua Visconde de Mauá, 905 – Aldeota, Fortaleza",
    vigil: ["16:00", "18:00"], sunday: ["08:00", "11:00", "20:00"] },
  { id: "santacecilia", name: "Capela Santa Cecília", area: "Aldeota",
    address: "Av. Senador Virgílio Távora, 2000 – Aldeota, Fortaleza",
    vigil: [], sunday: ["17:00"] },
  { id: "militar", name: "Capelania Militar N. Sra. das Graças", area: "Aldeota",
    address: "Av. Desembargador Moreira, 1500 – Aldeota, Fortaleza",
    vigil: ["17:00"], sunday: ["08:00", "11:00", "17:00", "19:00"] },
];

/* --- datas / ano litúrgico ----------------------------------------- */
function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const addDays = (dt, n) => { const r = new Date(dt); r.setDate(r.getDate() + n); return r; };
const dayOnly = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
const lastSundayOnOrBefore = (dt) => addDays(dt, -dt.getDay());
const advent1Of = (y) => addDays(lastSundayOnOrBefore(new Date(y, 11, 24)), -21);

function liturgicalSeason(now) {
  const y = now.getFullYear(), today = dayOnly(now);
  const easter = easterDate(y), ash = addDays(easter, -46), pentecost = addDays(easter, 49);
  const christmas = new Date(y, 11, 25);
  const baptism = addDays(lastSundayOnOrBefore(new Date(y, 0, 6)), 7);
  const advent1 = advent1Of(y);
  const S = {
    advento:  { label: "Advento",     color: "#5E4C86", soft: "#ECE6F3" },
    natal:    { label: "Natal",       color: "#B0883A", soft: "#F4ECD8" },
    comum:    { label: "Tempo Comum", color: "#4B6A4E", soft: "#E7EEE6" },
    quaresma: { label: "Quaresma",    color: "#5E4C86", soft: "#ECE6F3" },
    pascoa:   { label: "Páscoa",      color: "#B0883A", soft: "#F4ECD8" },
  };
  if (today >= advent1 && today < christmas) return S.advento;
  if (today >= christmas || today < baptism)  return S.natal;
  if (today >= baptism && today < ash)        return S.comum;
  if (today >= ash && today < easter)         return S.quaresma;
  if (today >= easter && today <= pentecost)  return S.pascoa;
  return S.comum;
}
function sundayCycle(now) {
  const litYear = dayOnly(now) >= advent1Of(now.getFullYear()) ? now.getFullYear() + 1 : now.getFullYear();
  return ["B", "A", "C"][litYear % 3];
}
function corToTheme(cor) {
  const c = (cor || "").toLowerCase();
  if (c.includes("verde")) return { color: "#4B6A4E", soft: "#E7EEE6", label: "Verde" };
  if (c.includes("roxo") || c.includes("violeta")) return { color: "#5E4C86", soft: "#ECE6F3", label: "Roxo" };
  if (c.includes("branco")) return { color: "#B0883A", soft: "#F4ECD8", label: "Branco" };
  if (c.includes("vermelho")) return { color: "#9A3535", soft: "#F1E2E0", label: "Vermelho" };
  if (c.includes("rosa") || c.includes("róseo")) return { color: "#B5677D", soft: "#F3E6EA", label: "Rosa" };
  return null;
}

/* --- janela do fim de semana (vigília sáb + domingo desta semana) --- */
function weekendMasses(now) {
  const today = dayOnly(now);
  const daysToSun = (7 - now.getDay()) % 7;
  const build = (sun) => {
    const sat = addDays(sun, -1);
    const days = [];
    if (dayOnly(sat) >= today) days.push([sat, "vigil"]);
    days.push([sun, "sunday"]);
    const items = [];
    for (const [date, kind] of days) {
      for (const c of CHURCHES) {
        for (const t of (kind === "vigil" ? c.vigil : c.sunday)) {
          const [hh, mm] = t.split(":").map(Number);
          const when = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm);
          items.push({ key: `${c.id}-${when.toISOString()}`, church: c, when, time: t, vigil: kind === "vigil" });
        }
      }
    }
    return items.sort((a, b) => a.when - b.when);
  };
  let sun = addDays(today, daysToSun);
  let items = build(sun);
  if (items.length && items.every((m) => m.when < now)) items = build(addDays(sun, 7)); // domingo já acabou -> próximo
  return items;
}
function targetSunday(now) {
  return addDays(dayOnly(now), (7 - now.getDay()) % 7);
}

/* --- helpers texto ------------------------------------------------- */
const WD = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MOL = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const fmtTime = (t) => t.replace(":", "h").replace("h00", "h");
function relativeLabel(when, now) {
  const diff = Math.round((when - now) / 60000);
  if (diff <= 0) return "começando";
  if (diff < 60) return `em ${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  if (diff < 60 * 30) return m ? `em ${h}h${String(m).padStart(2, "0")}` : `em ${h}h`;
  return null;
}
function dayHeading(dateKey, now) {
  const d = new Date(dateKey);
  const diff = Math.round((dayOnly(d).getTime() - dayOnly(now).getTime()) / 86400000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return `${WD[d.getDay()]} · ${d.getDate()} ${MO[d.getMonth()]}`;
}
const mapsUrl = (a) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;
const wazeUrl = (a) => `https://www.waze.com/ul?q=${encodeURIComponent(a)}&navigate=yes`;

/* --- ícones -------------------------------------------------------- */
const Ico = {
  book: (p) => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5 1.5-1.5 4-2 8-1.5V5c-4-.5-6.5 0-8 1.5Z"/><path d="M12 6.5V20"/></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>),
  church: (p) => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v4M10 4h4"/><path d="M12 6 5 10.5V21h14v-10.5L12 6Z"/><path d="M9.5 21v-4a2.5 2.5 0 0 1 5 0v4"/></svg>),
  pin: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>),
  nav: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 11 21 3l-8 18-2-7-8-3Z"/></svg>),
  back: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 18 9 12l6-6"/></svg>),
  chev: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 6 6 6-6 6"/></svg>),
  close: (p) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>),
};

/* ================================================================== */
function MissaApp() {
  const [now, setNow] = useState(new Date());
  const [screen, setScreen] = useState("home");
  const [detail, setDetail] = useState(null);
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  const season = useMemo(() => liturgicalSeason(now), [now]);
  const weekend = useMemo(() => weekendMasses(now), [now]);
  const next = weekend.find((m) => m.when >= now);

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.shell}>
        {screen === "home" && <Home season={season} now={now} next={next} go={setScreen} />}
        {screen === "proximas" && <Proximas season={season} now={now} masses={weekend} next={next} back={() => setScreen("home")} onChurch={(c) => setDetail({ church: c, dimPast: true })} />}
        {screen === "igrejas" && <Igrejas season={season} back={() => setScreen("home")} onChurch={(c) => setDetail({ church: c, dimPast: false })} />}
        {screen === "jornalzinho" && <Jornalzinho season={season} now={now} back={() => setScreen("home")} />}
      </div>
      {detail && <ChurchSheet church={detail.church} dimPast={detail.dimPast} now={now} season={season} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* --- HOME ---------------------------------------------------------- */
function Home({ season, now, next, go }) {
  const fullDate = `${WD[now.getDay()]}, ${now.getDate()} de ${MOL[now.getMonth()]}`;
  const items = [
    { id: "jornalzinho", icon: Ico.book, title: "Jornalzinho", sub: "A liturgia do domingo, leitura a leitura" },
    { id: "proximas", icon: Ico.clock, title: "Próximas missas", sub: next ? `Próxima: ${fmtTime(next.time)} · ${next.church.name}` : "Missas do fim de semana" },
    { id: "igrejas", icon: Ico.church, title: "Igrejas & capelas", sub: `${CHURCHES.length} próximas · horários e rota` },
  ];
  return (
    <>
      <header style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={S.wordmark}>MISSA<span style={S.wordmark2}>DO DOMINGO</span></div>
        <div style={{ ...S.pill, background: season.soft, color: season.color }}><span style={{ ...S.dot, background: season.color }} /> {season.label}</div>
        <div style={S.date}>{fullDate}</div>
      </header>
      <nav>
        {items.map((it, i) => (
          <button key={it.id} onClick={() => go(it.id)} style={{ ...S.menuCard, ...(i === 0 ? { borderLeft: `5px solid ${season.color}` } : {}) }}>
            <span style={{ ...S.menuIcon, background: season.soft, color: season.color }}>{it.icon()}</span>
            <span style={{ flex: 1, textAlign: "left" }}>
              <span style={S.menuTitle}>{it.title}</span>
              <span style={S.menuSub}>{it.sub}</span>
            </span>
            <span style={{ color: "#C4BAA3" }}>{Ico.chev()}</span>
          </button>
        ))}
      </nav>
      <footer style={S.footer}>Horários curados manualmente · confira sempre no dia.<br/><span style={{ letterSpacing: "0.06em" }}>desenvolvido por Aurora Expedition</span></footer>
    </>
  );
}

/* --- PRÓXIMAS MISSAS (só este fim de semana; passadas esmaecidas) --- */
function Proximas({ season, now, masses, next, back, onChurch }) {
  const groups = [];
  for (const m of masses) {
    const dk = dayOnly(m.when).getTime();
    let g = groups.find((x) => x.dk === dk);
    if (!g) { g = { dk, items: [] }; groups.push(g); }
    g.items.push(m);
  }
  return (
    <>
      <TopBar title="Próximas missas" back={back} season={season} />
      {next ? (
        <section style={{ ...S.hero, borderLeftColor: season.color }}>
          <div style={S.heroTop}>
            <span style={{ ...S.eyebrow, color: season.color }}>Próxima missa</span>
            {relativeLabel(next.when, now) && <span style={{ ...S.rel, color: season.color }}>{relativeLabel(next.when, now)}</span>}
          </div>
          <div style={S.heroTime}>{fmtTime(next.time)}</div>
          <div style={S.heroChurch}>{next.church.name}</div>
          <div style={S.heroMeta}>{dayHeading(dayOnly(next.when).getTime(), now)} · {next.church.area}
            {next.vigil && <span style={{ ...S.tag, color: season.color, borderColor: season.color }}>vigília do domingo</span>}</div>
          <button onClick={() => onChurch(next.church)} style={{ ...S.route, background: season.color }}>Ver igreja & rota</button>
        </section>
      ) : (
        <div style={S.empty}>As missas deste domingo já foram celebradas.</div>
      )}
      {groups.map((g) => (
        <section key={g.dk} style={S.group}>
          <h2 style={S.groupTitle}>{dayHeading(g.dk, now)}{g.items[0].vigil ? " · vigília" : ""}</h2>
          {g.items.map((m) => {
            const past = m.when < now, isNext = next && m.key === next.key;
            return (
              <button key={m.key} onClick={() => onChurch(m.church)}
                style={{ ...S.row, ...(past ? S.rowPast : {}), ...(isNext ? { borderColor: season.color } : {}) }}>
                <div style={{ ...S.rowTime, color: isNext ? season.color : INK }}>{fmtTime(m.time)}</div>
                <div style={S.rowBody}>
                  <div style={S.rowChurch}>{m.church.name}</div>
                  <div style={S.rowArea}>{past ? "já passou" : m.church.area}{!past && m.vigil && <span style={{ color: season.color, fontWeight: 600 }}> · vale pelo domingo</span>}</div>
                </div>
                {!past && <span style={{ color: "#C4BAA3" }}>{Ico.chev()}</span>}
              </button>
            );
          })}
        </section>
      ))}
      <footer style={S.footer}>Missas de sábado à tarde valem pelo domingo (cân. 1248).</footer>
    </>
  );
}

/* --- IGREJAS ------------------------------------------------------- */
function Igrejas({ season, back, onChurch }) {
  return (
    <>
      <TopBar title="Igrejas & capelas" back={back} season={season} />
      {CHURCHES.map((c) => {
        const total = c.vigil.length + c.sunday.length;
        return (
          <button key={c.id} onClick={() => onChurch(c)} style={S.row}>
            <span style={{ ...S.menuIcon, background: season.soft, color: season.color, width: 40, height: 40 }}>{Ico.church()}</span>
            <div style={S.rowBody}>
              <div style={S.rowChurch}>{c.name}</div>
              <div style={S.rowArea}>{c.area} · {total} missa{total > 1 ? "s" : ""} no fim de semana</div>
            </div>
            <span style={{ color: "#C4BAA3" }}>{Ico.chev()}</span>
          </button>
        );
      })}
      <footer style={S.footer}>Todas em Aldeota / Dunas — bem próximas entre si.</footer>
    </>
  );
}

/* --- JORNALZINHO (liturgia ao vivo, layout ordem da missa) --------- */
function Jornalzinho({ season, now, back }) {
  const [lit, setLit] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const sun = targetSunday(now);

  useEffect(() => {
    let alive = true;
    const url = `https://liturgia.up.railway.app/v2/?dia=${sun.getDate()}&mes=${sun.getMonth() + 1}&ano=${sun.getFullYear()}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then((d) => { if (alive) { setLit(d); setState("ok"); } })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [sun.getTime()]);

  const theme = (lit && corToTheme(lit.cor)) || season;
  const cycle = sundayCycle(sun);
  const L = lit?.leituras || {};
  const first = (x) => (Array.isArray(x) ? x[0] : x) || null;
  const dateBR = `${String(sun.getDate()).padStart(2,"0")}/${String(sun.getMonth()+1).padStart(2,"0")}/${sun.getFullYear()}`;

  return (
    <>
      <TopBar title="Jornalzinho" back={back} season={theme} />

      {/* MASTHEAD */}
      <div style={{ ...S.mast, borderColor: theme.color }}>
        <div style={S.mastEyebrow}>
          <span>ANO {cycle}</span>
          <span style={{ color: theme.color, fontWeight: 700 }}>{(lit && corToTheme(lit.cor)?.label?.toUpperCase()) || season.label.toUpperCase()}</span>
          <span>{dateBR}</span>
        </div>
        <div style={{ ...S.mastTitle, color: theme.color }}>Liturgia do Domingo</div>
        {lit && <div style={S.mastLit}>{lit.liturgia}</div>}
      </div>

      {state === "loading" && <div style={S.empty}>Carregando a liturgia…</div>}
      {state === "error" && (
        <div style={S.noteWarn}>
          Não consegui carregar a liturgia agora (sem rede ou bloqueado neste preview).
          Publicado no GitHub, funciona normalmente — a API libera acesso direto.
        </div>
      )}

      {state === "ok" && lit && (
        <>
          <Movement title="Ritos Iniciais" theme={theme} />
          <Prop n="1" title="Antífona de Entrada" theme={theme} body={lit.antifonas?.entrada} italic />
          <Fixed title="Ato Penitencial" theme={theme}>
            <PA pr="Senhor, tende piedade de nós." as="Senhor, tende piedade de nós." />
            <PA pr="Cristo, tende piedade de nós." as="Cristo, tende piedade de nós." />
            <PA pr="Senhor, tende piedade de nós." as="Senhor, tende piedade de nós." />
            <div style={S.small}>A fórmula pode variar conforme o celebrante.</div>
          </Fixed>
          <Fixed title="Glória" theme={theme}>
            <p style={S.pray}>Glória a Deus nas alturas, e paz na terra aos homens por Ele amados. Senhor Deus, rei dos céus, Deus Pai todo-poderoso: nós vos louvamos, nós vos bendizemos, nós vos adoramos, nós vos glorificamos, nós vos damos graças por vossa imensa glória. Senhor Jesus Cristo, Filho Unigênito, Senhor Deus, Cordeiro de Deus, Filho de Deus Pai. Vós que tirais o pecado do mundo, tende piedade de nós. Vós que tirais o pecado do mundo, acolhei a nossa súplica. Vós que estais à direita do Pai, tende piedade de nós. Só vós sois o Santo, só vós, o Senhor, só vós, o Altíssimo, Jesus Cristo, com o Espírito Santo, na glória de Deus Pai. Amém.</p>
          </Fixed>
          <Prop n="2" title="Oração do Dia" theme={theme} body={lit.oracoes?.coleta} resp="Amém." />

          <Movement title="Liturgia da Palavra" theme={theme} />
          <Reading n="3" theme={theme} label="1ª Leitura" it={first(L.primeiraLeitura)} resp={["Palavra do Senhor.", "Graças a Deus!"]} />
          <Psalm n="4" theme={theme} it={first(L.salmo)} />
          {first(L.segundaLeitura) && <Reading n="5" theme={theme} label="2ª Leitura" it={first(L.segundaLeitura)} resp={["Palavra do Senhor.", "Graças a Deus!"]} />}
          <Prop n="6" title="Aclamação ao Evangelho" theme={theme} body="Aleluia, aleluia, aleluia." italic />
          <Reading n="7" theme={theme} label="Evangelho" it={first(L.evangelho)} gospel resp={["Palavra da Salvação.", "Glória a vós, Senhor!"]} />
          <Fixed title="Profissão de Fé" theme={theme}>
            <p style={S.pray}>Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor; que foi concebido pelo poder do Espírito Santo, nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos, ressuscitou ao terceiro dia; subiu aos céus, está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na santa Igreja católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.</p>
          </Fixed>

          <Movement title="Liturgia Eucarística" theme={theme} />
          <Prop n="8" title="Sobre as Oferendas" theme={theme} body={lit.oracoes?.oferendas} resp="Amém." />
          <Prop n="9" title="Antífona da Comunhão" theme={theme} body={lit.antifonas?.comunhao} italic />
          <Prop n="10" title="Depois da Comunhão" theme={theme} body={lit.oracoes?.comunhao} resp="Amém." />

          <footer style={S.footer}>
            Textos litúrgicos © CNBB · liturgia via API pública.<br/>
            Layout inspirado na ordem da missa (não reproduz "O Domingo"/Paulus).
          </footer>
        </>
      )}
    </>
  );
}

/* subcomponentes do jornalzinho */
const Movement = ({ title, theme }) => (
  <div style={{ ...S.movement, background: theme.soft, color: theme.color }}>{title}</div>
);
const NumBadge = ({ n, theme }) => (<span style={{ ...S.badge, background: theme.color }}>{n}</span>);
function Prop({ n, title, body, theme, italic, resp }) {
  if (!body) return null;
  return (
    <div style={S.sec}>
      <div style={S.secHead}><NumBadge n={n} theme={theme} /><span style={{ ...S.secTitle, color: theme.color }}>{title}</span></div>
      <p style={{ ...S.pray, ...(italic ? { fontStyle: "italic" } : {}) }}>{body}</p>
      {resp && <div style={S.resp}><b>AS:</b> {resp}</div>}
    </div>
  );
}
function Reading({ n, label, it, resp, gospel, theme }) {
  if (!it) return null;
  return (
    <div style={S.sec}>
      <div style={S.secHead}><NumBadge n={n} theme={theme} /><span style={{ ...S.secTitle, color: theme.color }}>{label} <span style={S.ref}>{it.referencia}</span></span></div>
      {it.titulo && <div style={S.readingTitle}>{it.titulo}.</div>}
      <p style={S.pray}>{it.texto}</p>
      <div style={S.resp}><b>{gospel ? "PR" : "—"}:</b> {resp[0]} &nbsp; <b>AS:</b> {resp[1]}</div>
    </div>
  );
}
function Psalm({ n, it, theme }) {
  if (!it) return null;
  const strophes = (it.texto || "").split("\n").filter((s) => s.trim());
  return (
    <div style={S.sec}>
      <div style={S.secHead}><NumBadge n={n} theme={theme} /><span style={{ ...S.secTitle, color: theme.color }}>Salmo Responsorial <span style={S.ref}>{it.referencia}</span></span></div>
      <div style={{ ...S.refrao, borderColor: theme.color }}>{it.refrao}</div>
      {strophes.map((s, i) => <p key={i} style={S.pray}>{s.replace(/^–\s*/, "")}</p>)}
    </div>
  );
}
const PA = ({ pr, as }) => (<div style={S.resp}><b>PR:</b> {pr} <b style={{ marginLeft: 6 }}>AS:</b> {as}</div>);
function Fixed({ title, children, theme }) {
  return (
    <details style={S.details}>
      <summary style={{ ...S.summary, color: theme.color }}>{title} <span style={S.summaryHint}>textos fixos ▾</span></summary>
      <div style={{ marginTop: 8 }}>{children}</div>
    </details>
  );
}

/* --- SHEET / TOPBAR ------------------------------------------------ */
function ChurchSheet({ church, season, now, dimPast, onClose }) {
  const relSun = now ? targetSunday(now) : null;
  const relSat = relSun ? addDays(relSun, -1) : null;
  const isPast = (t, vigil) => {
    if (!dimPast || !now) return false;
    const base = vigil ? relSat : relSun;
    const [h, m] = t.split(":").map(Number);
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m) < now;
  };
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.grip, background: season.color }} />
        <button onClick={onClose} style={S.sheetClose}>{Ico.close()}</button>
        <div style={{ ...S.eyebrow, color: season.color }}>Igreja</div>
        <div style={S.sheetName}>{church.name}</div>
        <div style={S.sheetAddr}>{Ico.pin({ style: { flexShrink: 0, marginTop: 1, color: season.color } })} <span>{church.address}</span></div>
        <div style={S.schedTitle}>Missas de domingo</div>
        <div style={S.chips}>{church.sunday.map((t) => {
          const past = isPast(t, false);
          return <span key={t} style={{ ...S.chip, ...(past ? S.chipPast : {}) }}>{fmtTime(t)}</span>;
        })}</div>
        {church.vigil.length > 0 && (
          <>
            <div style={S.schedTitle}>Vigília de sábado <span style={{ color: "#9A917E", fontWeight: 400, fontStyle: "italic" }}>(vale pelo domingo)</span></div>
            <div style={S.chips}>{church.vigil.map((t) => {
              const past = isPast(t, true);
              return <span key={t} style={{ ...S.chip, borderColor: season.color, color: season.color, ...(past ? S.chipPast : {}) }}>{fmtTime(t)}</span>;
            })}</div>
          </>
        )}
        <div style={S.navRow}>
          <a href={mapsUrl(church.address)} target="_blank" rel="noreferrer" style={{ ...S.navBtn, background: season.color }}>{Ico.pin({ style: { color: "#FBF8F1" } })} Google Maps</a>
          <a href={wazeUrl(church.address)} target="_blank" rel="noreferrer" style={{ ...S.navBtn, background: "transparent", color: season.color, border: `1.5px solid ${season.color}` }}>{Ico.nav({ style: { color: season.color } })} Waze</a>
        </div>
      </div>
    </div>
  );
}
function TopBar({ title, back, season }) {
  return (
    <div style={S.topbar}>
      <button onClick={back} style={{ ...S.backBtn, color: season.color }}>{Ico.back()}</button>
      <div style={S.topTitle}>{title}</div>
      <div style={{ width: 20 }} />
    </div>
  );
}

/* --- CSS / TOKENS -------------------------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
a { text-decoration: none; }
details > summary { list-style: none; cursor: pointer; }
details > summary::-webkit-details-marker { display: none; }
`;
const serif = "'Spectral', Georgia, serif";
const display = "'Marcellus', 'Spectral', Georgia, serif";
const INK = "#2B2723", PARCH = "#F4EFE3", CARD = "#FBF8F1", LINE = "#E4DCC9";

const S = {
  root: { minHeight: "100%", background: PARCH, color: INK, fontFamily: serif, display: "flex", justifyContent: "center", WebkitFontSmoothing: "antialiased" },
  shell: { width: "100%", maxWidth: 440, padding: "24px 18px 42px", position: "relative" },
  wordmark: { fontFamily: display, fontSize: 36, letterSpacing: "0.3em", paddingLeft: "0.3em", color: INK },
  wordmark2: { display: "block", fontSize: 18, letterSpacing: "0.42em", paddingLeft: "0.42em", marginTop: 2 },
  pill: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 15, letterSpacing: "0.04em", padding: "4px 12px", borderRadius: 999, marginTop: 14, fontWeight: 500 },
  dot: { width: 7, height: 7, borderRadius: 999, display: "inline-block" },
  date: { fontSize: 16, color: "#8A8272", marginTop: 9, fontStyle: "italic" },

  menuCard: { width: "100%", display: "flex", alignItems: "center", gap: 14, background: CARD, border: "1px solid " + LINE, borderRadius: 14, padding: "16px 15px", marginBottom: 11 },
  menuIcon: { width: 44, height: 44, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  menuTitle: { display: "block", fontFamily: display, fontSize: 22, lineHeight: 1.15 },
  menuSub: { display: "block", fontSize: 15, color: "#8A8272", marginTop: 3 },

  topbar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { display: "flex", alignItems: "center", padding: 4 },
  topTitle: { fontFamily: display, fontSize: 23, letterSpacing: "0.02em" },

  hero: { background: CARD, borderRadius: 16, padding: "18px", border: "1px solid " + LINE, borderLeft: "5px solid", marginBottom: 24 },
  heroTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline" },
  eyebrow: { fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600 },
  rel: { fontSize: 16, fontWeight: 600 },
  heroTime: { fontFamily: display, fontSize: 55, lineHeight: 1.05, marginTop: 6 },
  heroChurch: { fontSize: 23, fontWeight: 600, marginTop: 2 },
  heroMeta: { fontSize: 16, color: "#6E6656", marginTop: 5, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 },
  tag: { fontSize: 12.5, letterSpacing: "0.03em", border: "1px solid", borderRadius: 999, padding: "1px 8px" },
  route: { display: "inline-block", marginTop: 15, color: "#FBF8F1", fontSize: 17, fontWeight: 600, padding: "10px 18px", borderRadius: 10 },
  empty: { textAlign: "center", color: "#8A8272", fontStyle: "italic", padding: "26px 10px", fontSize: 17 },

  group: { marginBottom: 20 },
  groupTitle: { fontFamily: display, fontSize: 18, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8A8272", margin: "0 0 10px", paddingBottom: 6, borderBottom: "1px solid " + LINE },
  row: { width: "100%", display: "flex", alignItems: "center", gap: 14, background: CARD, border: "1px solid " + LINE, borderRadius: 12, padding: "13px 14px", marginBottom: 8, color: INK, textAlign: "left" },
  rowPast: { opacity: 0.4, background: "transparent" },
  rowTime: { fontFamily: display, fontSize: 26.5, minWidth: 62 },
  rowBody: { flex: 1 },
  rowChurch: { fontSize: 18.5, fontWeight: 600, lineHeight: 1.2 },
  rowArea: { fontSize: 15, color: "#8A8272", marginTop: 2 },

  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,35,0.42)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  sheet: { width: "100%", maxWidth: 440, background: PARCH, borderRadius: "20px 20px 0 0", padding: "14px 20px 26px", position: "relative", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)" },
  grip: { width: 44, height: 4, borderRadius: 99, margin: "0 auto 16px", opacity: 0.5 },
  sheetClose: { position: "absolute", top: 14, right: 16, color: "#9A917E", padding: 4 },
  sheetName: { fontFamily: display, fontSize: 30, lineHeight: 1.1, marginTop: 4 },
  sheetAddr: { display: "flex", gap: 7, fontSize: 16, color: "#6E6656", marginTop: 10, lineHeight: 1.45 },
  schedTitle: { fontSize: 14.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8A8272", marginTop: 20, marginBottom: 9, fontWeight: 600 },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { fontFamily: display, fontSize: 20.5, padding: "5px 13px", borderRadius: 10, background: CARD, border: "1px solid " + LINE },
  chipPast: { opacity: 0.38, textDecoration: "line-through", textDecorationThickness: "1px" },
  navRow: { display: "flex", gap: 10, marginTop: 24 },
  navBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 0", borderRadius: 11, fontSize: 17.5, fontWeight: 600, color: "#FBF8F1" },

  /* jornalzinho */
  mast: { borderLeft: "5px solid", paddingLeft: 14, marginBottom: 18 },
  mastEyebrow: { display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, letterSpacing: "0.1em", color: "#9A917E", textTransform: "uppercase" },
  mastTitle: { fontFamily: display, fontSize: 32.5, lineHeight: 1.05, marginTop: 5 },
  mastLit: { fontSize: 18, color: INK, marginTop: 3, fontStyle: "italic" },
  movement: { fontFamily: display, fontSize: 16, letterSpacing: "0.14em", textTransform: "uppercase", padding: "7px 12px", borderRadius: 8, marginTop: 22, marginBottom: 14, fontWeight: 500 },
  sec: { marginBottom: 18 },
  secHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7 },
  badge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 5, color: "#FBF8F1", fontSize: 14.5, fontWeight: 700, flexShrink: 0, fontFamily: serif },
  secTitle: { fontFamily: display, fontSize: 19, letterSpacing: "0.01em" },
  ref: { fontFamily: serif, fontSize: 15, color: "#9A917E", fontStyle: "italic", letterSpacing: 0 },
  readingTitle: { fontSize: 16, fontStyle: "italic", color: "#6E6656", marginBottom: 6 },
  pray: { fontSize: 17.5, lineHeight: 1.6, margin: "0 0 7px", color: "#3A342D" },
  resp: { fontSize: 16, color: "#6E6656", marginTop: 4 },
  refrao: { borderLeft: "3px solid", paddingLeft: 11, fontStyle: "italic", fontSize: 17.5, margin: "0 0 10px", color: INK, fontWeight: 500 },
  details: { background: CARD, border: "1px solid " + LINE, borderRadius: 10, padding: "11px 13px", marginBottom: 18 },
  summary: { fontFamily: display, fontSize: 18, display: "flex", justifyContent: "space-between", alignItems: "center" },
  summaryHint: { fontFamily: serif, fontSize: 13, color: "#B4AA95", fontStyle: "italic", letterSpacing: 0, fontWeight: 400 },
  small: { fontSize: 14.5, color: "#9A917E", fontStyle: "italic", marginTop: 6 },
  noteWarn: { background: "#F6EEDD", border: "1px solid #E4D5B0", borderRadius: 12, padding: "13px 15px", fontSize: 15.5, color: "#7A6A45", lineHeight: 1.5 },

  footer: { textAlign: "center", fontSize: 14.5, color: "#9A917E", marginTop: 16, lineHeight: 1.7, fontStyle: "italic" },
};


/* --- montagem + service worker (PWA) --- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(<MissaApp />);
