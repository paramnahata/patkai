import MobileShell from '../../../components/MobileShell';import MapDemo from '../../../components/MapDemo';
export default function Page(){return <MobileShell title="Hazard Map"><p className="muted">See nearby risk zones, reported hazards, shelters and service locations on a real map. Cached safety data remains available when the connection drops.</p><MapDemo mode="citizen"/></MobileShell>}
