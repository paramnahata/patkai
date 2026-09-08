from app.services.priority import priority
def test_priority_is_bounded():
    s,l=priority(90,8000,.9,.95); assert 0<=s<=100; assert l in {'LOW','MEDIUM','HIGH','CRITICAL'}
