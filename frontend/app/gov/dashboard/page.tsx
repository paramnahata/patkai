'use client';

import { useEffect, useState } from 'react';
import GovShell from '../../../components/GovShell';
import MapDemo from '../../../components/MapDemo';
import { api } from '../../../lib/api';

const DEMO_SUMMARY = {
  total_monitored_zones: 5,
  critical_zones: 1,
  high_risk_zones: 4,
  active_incidents: 2,
  blocked_roads: 1,
  people_exposed: 26400,
  active_alerts: 3,
  field_teams_deployed: 3,
};

export default function Dashboard() {
  const [s, setS] = useState<any>(DEMO_SUMMARY);
  const [msg, setMsg] = useState('');

  const load = () => {
    api('/api/v1/dashboard/summary')
      .then(setS)
      .catch(() => {});
  };

  useEffect(() => {
    load();

    const timer = setInterval(load, 10000);

    return () => clearInterval(timer);
  }, []);

  const runDemoScenario = async () => {
    try {
      const x = await api('/api/v1/demo/scenario', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      setMsg(`Scenario executed: risk ${x.previous} → ${x.current}`);
      load();
    } catch {
      setMsg(
        'Demo scenario preview: East Khasi Hills risk escalated from 82 → 90. Reconnect government session to persist this change.'
      );
    }
  };

  const kpis = [
    ['Monitored zones', 'total_monitored_zones'],
    ['Critical zones', 'critical_zones'],
    ['High-risk zones', 'high_risk_zones'],
    ['Active incidents', 'active_incidents'],
    ['Blocked roads', 'blocked_roads'],
    ['People potentially exposed', 'people_exposed'],
    ['Active alerts', 'active_alerts'],
    ['Field teams deployed', 'field_teams_deployed'],
  ];

  return (
    <GovShell>
      <div>
        <h1 className="title">Regional Overview</h1>
        <div className="muted">
          Operational picture for monitored NER zones
        </div>
      </div>

      <div className="grid kpis">
        {kpis.map(([label, key]) => (
          <div className="card kpi" key={key}>
            <div className="label">{label}</div>
            <div className="value">
              {s ? Number(s[key]).toLocaleString() : '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="grid dashboard-grid">
        <div className="card">
          <div
            className="toolbar"
            style={{ justifyContent: 'space-between' }}
          >
            <div>
              <div className="panel-title">Regional risk map</div>
              <div className="muted">
                Risk zones · roads · reports · critical infrastructure
              </div>
            </div>

            <button
              className="btn btn-danger"
              onClick={runDemoScenario}
            >
              Run Demo Scenario
            </button>
          </div>

          {msg && (
            <div className="notice" style={{ margin: '12px 0' }}>
              {msg}
            </div>
          )}

          <MapDemo />
        </div>

        <div className="card">
          <div className="panel-title">
            Current operating picture
          </div>

          <div className="notice">
            <b>Critical risk · East Khasi Hills</b>
            <br />
            High rainfall + saturated soil + steep terrain. Review
            exposed road corridor and pending reports.
          </div>

          <h3>Priority logic</h3>

          <p className="muted">
            PATKAI considers risk together with population exposure,
            infrastructure criticality, connectivity importance and
            vulnerability.
          </p>

          <h3>Data quality</h3>

          <p>
            Weather freshness <b>Live demo stream</b>
          </p>

          <p>
            Satellite freshness <b>Demo observation</b>
          </p>

          <p>
            Field verification <b>Pending / mixed</b>
          </p>

          <div className="footer-note">
            All seeded environmental and incident values are
            synthetic/demo data and are not government-certified
            observations.
          </div>
        </div>
      </div>
    </GovShell>
  );
}
