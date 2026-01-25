"""
验证 API 参数影响
"""
from pyrox import PyroxClient
import pandas as pd

client = PyroxClient()

# 1. 列出所有上海比赛
print("=" * 60)
print("1. All Shanghai races in database")
print("=" * 60)
races = client.list_races()
shanghai_races = races[races['location'].str.contains('shanghai', case=False)]
print(shanghai_races.to_string())

# 2. 搜索 Chen Yuanmin - 全局搜索（所有赛季、所有性别、所有组别）
print("\n" + "=" * 60)
print("2. Search Chen Yuanmin - ALL seasons, NO filters")
print("=" * 60)

results = []
search_locations = ['shanghai', 'beijing', 'shenzhen', 'taipei', 'singapore', 
                    'bangkok', 'incheon', 'mumbai', 'hong-kong', 'guangzhou']

for season in range(1, 9):  # Season 1-8
    for loc in search_locations:
        try:
            # 不传 gender 和 division
            data = client.get_race(season=season, location=loc)
            if isinstance(data, pd.DataFrame) and len(data) > 0:
                matches = data[data['name'].str.lower().str.contains('yuanmin', na=False)]
                if len(matches) > 0:
                    for _, m in matches.iterrows():
                        print(f"Season {season} | {loc:20} | {m['name']:20} | gender={m.get('gender', 'N/A'):6} | div={m.get('division', 'N/A'):12} | time={m.get('total_time', 0):.2f} min")
                        results.append({
                            'season': season,
                            'location': loc,
                            'name': m['name'],
                            'gender': m.get('gender'),
                            'division': m.get('division'),
                            'total_time': m.get('total_time')
                        })
        except FileNotFoundError:
            pass  # Race doesn't exist
        except Exception as e:
            pass  # Other errors

print(f"\nTotal records found: {len(results)}")

# 3. 保存结果
if results:
    df = pd.DataFrame(results)
    df.to_csv("yuanmin_all_records.csv", index=False, encoding="utf-8-sig")
    print(f"Saved to: yuanmin_all_records.csv")
    
    # 显示汇总
    print("\n" + "=" * 60)
    print("3. Summary by Season and Location")
    print("=" * 60)
    print(df.to_string())

