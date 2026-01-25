"""
HYROX 选手查询脚本 v2
搜索特定选手的比赛成绩 - 支持多种姓名格式
"""

from pyrox import PyroxClient
import pandas as pd

def search_by_name_pattern(df, name_parts):
    """在 DataFrame 中搜索包含所有名字部分的选手"""
    if df is None or len(df) == 0:
        return pd.DataFrame()
    
    mask = pd.Series([True] * len(df))
    for part in name_parts:
        mask = mask & df['name'].str.lower().str.contains(part.lower(), na=False)
    
    return df[mask]

def main():
    print("=" * 70)
    print("HYROX Athlete Search v2")
    print("=" * 70)
    
    # 搜索参数
    search_names = [
        {"display": "Mitch Chen", "parts": ["mitch", "chen"]},
        {"display": "Chen Yuanmin", "parts": ["chen", "yuanmin"]},
    ]
    target_gender = "male"
    target_seasons = [7, 8]
    
    # 中国及亚洲地区关键词
    china_keywords = ["shanghai", "beijing", "shenzhen", "guangzhou", "hong kong", 
                      "hongkong", "china", "taipei", "singapore", "bangkok", 
                      "incheon", "mumbai"]
    
    client = PyroxClient()
    
    # 1. 获取所有比赛列表
    print("\n[1] Fetching all races...")
    all_races = client.list_races()
    print(f"    Total races in database: {len(all_races)}")
    
    # 2. 筛选目标赛季的中国/亚洲地区比赛
    print(f"\n[2] Filtering Season {target_seasons} races in China/Asia region...")
    target_races = all_races[
        (all_races['season'].isin(target_seasons)) &
        (all_races['location'].str.lower().apply(
            lambda x: any(kw in x for kw in china_keywords)
        ))
    ]
    print(f"    Found {len(target_races)} target races:")
    print(target_races[['season', 'location']].to_string())
    
    # 3. 搜索选手
    all_found_results = []
    
    for search_info in search_names:
        name_display = search_info["display"]
        name_parts = search_info["parts"]
        
        print(f"\n[3] Searching for: {name_display}")
        print(f"    Search parts: {name_parts}")
        print("-" * 70)
        
        for _, race in target_races.iterrows():
            season = race['season']
            location = race['location']
            
            try:
                print(f"    Season {season} - {location}...", end=" ")
                
                # 获取比赛数据
                race_data = client.get_race(
                    season=season,
                    location=location,
                    gender=target_gender
                )
                
                if isinstance(race_data, pd.DataFrame) and len(race_data) > 0:
                    # 搜索匹配的选手
                    matches = search_by_name_pattern(race_data, name_parts)
                    
                    if len(matches) > 0:
                        print(f"FOUND {len(matches)} match(es)!")
                        for _, match in matches.iterrows():
                            result = {
                                'search_name': name_display,
                                'season': season,
                                'location': location,
                                'name_in_db': match['name'],
                                'nationality': match.get('nationality', 'N/A'),
                                'division': match.get('division', 'N/A'),
                                'age_group': match.get('age_group', 'N/A'),
                                'total_time': match.get('total_time', None),
                                'run_time': match.get('run_time', None),
                                'work_time': match.get('work_time', None),
                                'skiErg_time': match.get('skiErg_time', None),
                                'sledPush_time': match.get('sledPush_time', None),
                                'sledPull_time': match.get('sledPull_time', None),
                                'burpeeBroadJump_time': match.get('burpeeBroadJump_time', None),
                                'rowErg_time': match.get('rowErg_time', None),
                                'farmersCarry_time': match.get('farmersCarry_time', None),
                                'sandbagLunges_time': match.get('sandbagLunges_time', None),
                                'wallBalls_time': match.get('wallBalls_time', None),
                            }
                            all_found_results.append(result)
                            print(f"        -> {match['name']} | {match.get('total_time', 0):.2f} min | {match.get('division', 'N/A')}")
                    else:
                        print("Not found")
                else:
                    print("No data")
                    
            except Exception as e:
                print(f"Error: {str(e)[:50]}")
    
    # 4. 显示结果汇总
    print("\n" + "=" * 70)
    print("SEARCH RESULTS SUMMARY")
    print("=" * 70)
    
    if all_found_results:
        results_df = pd.DataFrame(all_found_results)
        
        print(f"\nFound {len(results_df)} total result(s):\n")
        
        # 按搜索名字分组显示
        for search_name in results_df['search_name'].unique():
            subset = results_df[results_df['search_name'] == search_name]
            print(f"\n{'='*50}")
            print(f"Results for: {search_name}")
            print(f"{'='*50}")
            
            for i, (_, row) in enumerate(subset.iterrows(), 1):
                print(f"\n--- Record {i} ---")
                print(f"  Season: {row['season']}")
                print(f"  Location: {row['location']}")
                print(f"  Name in DB: {row['name_in_db']}")
                print(f"  Nationality: {row['nationality']}")
                print(f"  Division: {row['division']}")
                print(f"  Age Group: {row['age_group']}")
                
                if pd.notna(row['total_time']):
                    total_mins = int(row['total_time'])
                    total_secs = int((row['total_time'] - total_mins) * 60)
                    print(f"  Total Time: {total_mins}:{total_secs:02d} ({row['total_time']:.2f} min)")
                
                print(f"\n  Detailed Splits:")
                print(f"    Run Time:           {row['run_time']:.2f} min" if pd.notna(row['run_time']) else "    Run Time:           N/A")
                print(f"    Work Time:          {row['work_time']:.2f} min" if pd.notna(row['work_time']) else "    Work Time:          N/A")
                print(f"    SkiErg:             {row['skiErg_time']:.2f} min" if pd.notna(row['skiErg_time']) else "    SkiErg:             N/A")
                print(f"    Sled Push:          {row['sledPush_time']:.2f} min" if pd.notna(row['sledPush_time']) else "    Sled Push:          N/A")
                print(f"    Sled Pull:          {row['sledPull_time']:.2f} min" if pd.notna(row['sledPull_time']) else "    Sled Pull:          N/A")
                print(f"    Burpee Broad Jump:  {row['burpeeBroadJump_time']:.2f} min" if pd.notna(row['burpeeBroadJump_time']) else "    Burpee Broad Jump:  N/A")
                print(f"    Row Erg:            {row['rowErg_time']:.2f} min" if pd.notna(row['rowErg_time']) else "    Row Erg:            N/A")
                print(f"    Farmers Carry:      {row['farmersCarry_time']:.2f} min" if pd.notna(row['farmersCarry_time']) else "    Farmers Carry:      N/A")
                print(f"    Sandbag Lunges:     {row['sandbagLunges_time']:.2f} min" if pd.notna(row['sandbagLunges_time']) else "    Sandbag Lunges:     N/A")
                print(f"    Wall Balls:         {row['wallBalls_time']:.2f} min" if pd.notna(row['wallBalls_time']) else "    Wall Balls:         N/A")
        
        # 保存结果
        output_file = "athlete_search_results_v2.csv"
        results_df.to_csv(output_file, index=False, encoding="utf-8-sig")
        print(f"\n\nResults saved to: {output_file}")
        
    else:
        print("\nNo results found for any of the searched names.")
        print("\nSearched names:")
        for search_info in search_names:
            print(f"  - {search_info['display']}")

if __name__ == "__main__":
    main()

