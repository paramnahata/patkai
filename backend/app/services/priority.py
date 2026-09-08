def priority(risk: float, population: int, infrastructure: float, connectivity: float, vulnerability: float=1.0):
    exposure = min(1, population/10000)
    score = risk * (0.45 + 0.25*exposure + 0.15*min(1,infrastructure) + 0.10*min(1,connectivity) + 0.05*min(1,vulnerability))
    level = "CRITICAL" if score >= 75 else "HIGH" if score >= 55 else "MEDIUM" if score >= 30 else "LOW"
    return round(score), level
