/* What the skills interview concluded (interview skill, PR #4): skill profile,
   pathways with a reality check, areas to develop and open questions. Shown at
   the top of the Roadmap. */
import { Card } from './ui';

type Finding = { name: string; assessment: string; evidence: string };
type Pathway = { name: string; why_it_fits: string; what_it_needs: string; how_it_fits_life: string; first_step: string; reality_check: string };

function FindingCards({ items, tone }: { items: Finding[]; tone: string }) {
  return (
    <div className="grid two stagger">
      {items.map((x) => (
        <Card key={x.name} className="stack lift" style={{ borderTop: `4px solid var(${tone})` }}>
          <h3>{x.name}</h3>
          <p>{x.assessment}</p>
          <p className="small muted">Evidence: {x.evidence}</p>
        </Card>
      ))}
    </div>
  );
}

export function Findings({ plan }: { plan: any }) {
  const pathways: Pathway[] = plan.pathways || [];
  return (
    <section className="findings">
      {plan.summary && <p className="quote rise" style={{ marginBottom: 20 }}>{plan.summary}</p>}

      {plan.strengths?.length > 0 && <><h2 className="section-title">💪 Your skill profile</h2><FindingCards items={plan.strengths} tone="--accent" /></>}

      {pathways.length > 0 && (
        <>
          <h2 className="section-title">🧭 Pathways to explore</h2>
          <div className="grid two stagger">
            {pathways.map((x, i) => (
              <Card key={x.name} className="stack lift pathway">
                <div className="row spread"><h3>{x.name}</h3>{i === 0 && <span className="chip warm">Your plan aims here</span>}</div>
                <dl>
                  <div><dt>Why it fits</dt><dd>{x.why_it_fits}</dd></div>
                  <div><dt>What it needs</dt><dd>{x.what_it_needs}</dd></div>
                  <div><dt>How it fits your life</dt><dd>{x.how_it_fits_life}</dd></div>
                  <div><dt>First step</dt><dd>{x.first_step}</dd></div>
                </dl>
                <p className="small muted">🔍 {x.reality_check}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {plan.growth_areas?.length > 0 && <><h2 className="section-title">🌱 Areas to explore or develop</h2><FindingCards items={plan.growth_areas} tone="--gold" /></>}

      {plan.unknowns?.length > 0 && (
        <Card className="stack rise" style={{ marginTop: 20 }}>
          <h3>❓ Still to clarify</h3>
          <ul className="reasons">{plan.unknowns.map((x: string) => <li key={x}>{x}</li>)}</ul>
        </Card>
      )}

      {plan.steps?.length > 0 && (
        <>
          <h2 className="section-title">👣 First steps</h2>
          <div className="stagger">
            {plan.steps.map((s: any, i: number) => (
              <Card key={s.title} className="stack lift">
                <div className="row spread"><h3>{i + 1}. {s.title}</h3><span className="chip plain">{s.timeframe}</span></div>
                <p>{s.action}</p>
                <p className="small"><strong>Resources:</strong> {s.resource_guidance}</p>
              </Card>
            ))}
          </div>
        </>
      )}
      <p className="small muted" style={{ marginTop: 14 }}>AI-generated guidance is informational; verify resources and requirements before acting.</p>
    </section>
  );
}
