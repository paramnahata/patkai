from app.services.risk import predict
def test_prediction_shape():
    x=predict({'rainfall_72h':240,'soil_moisture':90,'slope_degree':40,'historical_landslide_frequency':12,'satellite_change_index':.7,'recent_cracks':2,'field_reports_count':2})
    assert 0 <= x['risk_score'] <= 100
    assert x['risk_level'] in {'SAFE','LOW','MODERATE','HIGH','CRITICAL'}
    assert 'factors' in x
