"""
HYROX 选手查询脚本
搜索特定选手的比赛成绩
"""

from pyrox import PyroxClient
import pandas as pd

def main():
    print("=" * 60)
    print("HYROX Athlete Search")
    print("=" * 60)
    
    # 搜索参数
    athlete_name = "Mingyuan Chen"
    target_gender = "male"
    
    # 中国大陆可能的比赛地点关键词
    china_keywords = ["shanghai", "beijing", "shenzhen", "guangzhou", "hong kong", "hongkong", "china", "taipei"]
    
    client = PyroxClient()
    
    # 1. 获取所有比赛列表
    print("\n[1] Fetching all races...")
    all_races = client.list_races()
    print(f"    Total races: {len(all_races)}")
    
    # 2. 筛选中国地区的比赛
    print("\n[2] Filtering China region races...")
    china_races = all_races[
        all_races['location'].str.lower().apply(
            lambda x: any(kw in x for kw in china_keywords)
        )
    ]
    print(f"    Found {len(china_races)} China region races:")
    print(china_races.to_string())
    
    # 3. 在所有赛季的中国比赛中搜索该选手
    print(f"\n[3] Searching for athlete: {athlete_name}")
    print("-" * 60)
    
    found_results = []
    
    for _, race in china_races.iterrows():
        season = race['season']
        location = race['location']
        
        try:
            # 方法1: 使用 get_athlete_in_race
            print(f"    Searching in Season {season} - {location}...", end=" ")
            
            # 尝试不同的姓名格式
            name_formats = [
                athlete_name,                    # "Mingyuan Chen"
                "Chen, Mingyuan",               # "Chen, Mingyuan"
                athlete_name.upper(),            # "MINGYUAN CHEN"
                "CHEN, MINGYUAN",               # "CHEN, MINGYUAN"
            ]
            
            found = False
            for name_fmt in name_formats:
                try:
                    result = client.get_athlete_in_race(
                        season=season,
                        location=location,
                        athlete_name=name_fmt,
                        gender=target_gender
                    )
                    if result is not None:
                        print(f"FOUND with format '{name_fmt}'!")
                        found_results.append({
                            'season': season,
                            'location': location,
                            'name_format': name_fmt,
                            'data': result
                        })
                        found = True
                        break
                except Exception:
                    continue
            
            if not found:
                # 方法2: 获取整场比赛数据，然后筛选
                race_data = client.get_race(
                    season=season,
                    location=location,
                    gender=target_gender
                )
                
                if isinstance(race_data, pd.DataFrame) and len(race_data) > 0:
                    # 搜索包含 "Chen" 和 "Mingyuan" 的选手
                    matches = race_data[
                        race_data['name'].str.lower().str.contains('chen', na=False) &
                        race_data['name'].str.lower().str.contains('mingyuan', na=False)
                    ]
                    
                    if len(matches) > 0:
                        print(f"FOUND via search! ({len(matches)} matches)")
                        for _, match in matches.iterrows():
                            found_results.append({
                                'season': season,
                                'location': location,
                                'name_format': match['name'],
                                'data': match
                            })
                    else:
                        # 宽松搜索：只搜 Chen
                        chen_matches = race_data[
                            race_data['name'].str.lower().str.contains('chen', na=False)
                        ]
                        if len(chen_matches) > 0:
                            print(f"Found {len(chen_matches)} 'Chen' entries")
                        else:
                            print("Not found")
                else:
                    print("No data")
                    
        except Exception as e:
            print(f"Error: {e}")
    
    # 4. 显示结果
    print("\n" + "=" * 60)
    print("SEARCH RESULTS")
    print("=" * 60)
    
    if found_results:
        print(f"\nFound {len(found_results)} result(s) for {athlete_name}:\n")
        
        for i, result in enumerate(found_results, 1):
            print(f"--- Result {i} ---")
            print(f"Season: {result['season']}")
            print(f"Location: {result['location']}")
            print(f"Name in DB: {result['name_format']}")
            
            data = result['data']
            if isinstance(data, pd.Series):
                print(f"Total Time: {data.get('total_time', 'N/A'):.2f} minutes")
                print(f"Division: {data.get('division', 'N/A')}")
                print(f"Age Group: {data.get('age_group', 'N/A')}")
                print(f"Nationality: {data.get('nationality', 'N/A')}")
                
                # 详细成绩
                print("\nDetailed splits:")
                print(f"  Run Time: {data.get('run_time', 0):.2f} min")
                print(f"  Work Time: {data.get('work_time', 0):.2f} min")
                print(f"  SkiErg: {data.get('skiErg_time', 0):.2f} min")
                print(f"  Sled Push: {data.get('sledPush_time', 0):.2f} min")
                print(f"  Sled Pull: {data.get('sledPull_time', 0):.2f} min")
                print(f"  Burpee Broad Jump: {data.get('burpeeBroadJump_time', 0):.2f} min")
                print(f"  Row: {data.get('rowErg_time', 0):.2f} min")
                print(f"  Farmers Carry: {data.get('farmersCarry_time', 0):.2f} min")
                print(f"  Sandbag Lunges: {data.get('sandbagLunges_time', 0):.2f} min")
                print(f"  Wall Balls: {data.get('wallBalls_time', 0):.2f} min")
            print()
        
        # 保存结果
        if found_results:
            results_df = pd.DataFrame([
                {**{'season': r['season'], 'location': r['location']}, 
                 **(r['data'].to_dict() if isinstance(r['data'], pd.Series) else r['data'])}
                for r in found_results
            ])
            results_df.to_csv("athlete_search_results.csv", index=False, encoding="utf-8-sig")
            print(f"Results saved to: athlete_search_results.csv")
    else:
        print(f"\nNo results found for '{athlete_name}' in China region races.")
        print("\nTrying to list all 'Chen' athletes in these races...")
        
        # 列出所有姓 Chen 的选手
        all_chen = []
        for _, race in china_races.iterrows():
            try:
                race_data = client.get_race(
                    season=race['season'],
                    location=race['location'],
                    gender=target_gender
                )
                if isinstance(race_data, pd.DataFrame):
                    chen_in_race = race_data[
                        race_data['name'].str.lower().str.contains('chen', na=False)
                    ][['name', 'nationality', 'total_time', 'division']].copy()
                    if len(chen_in_race) > 0:
                        chen_in_race['season'] = race['season']
                        chen_in_race['location'] = race['location']
                        all_chen.append(chen_in_race)
            except:
                continue
        
        if all_chen:
            all_chen_df = pd.concat(all_chen, ignore_index=True)
            print(f"\nFound {len(all_chen_df)} athletes with 'Chen' in name:")
            print(all_chen_df.to_string())
            all_chen_df.to_csv("chen_athletes.csv", index=False, encoding="utf-8-sig")
            print(f"\nSaved to: chen_athletes.csv")

if __name__ == "__main__":
    main()

