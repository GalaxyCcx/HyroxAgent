"""
HYROX Data Fetch Script
Using pyrox-client to fetch HYROX race results
"""

from pyrox import PyroxClient
import pandas as pd
from datetime import datetime

def main():
    print("=" * 60)
    print("HYROX Data Fetch Test")
    print("=" * 60)
    
    # Initialize client
    print("\n[1] Initializing PyroxClient...")
    client = PyroxClient()
    print("    [OK] Client initialized")
    
    # Get race list (returns DataFrame)
    print("\n[2] Fetching race list...")
    try:
        races_df = client.list_races()
        print(f"    [OK] Got races DataFrame with {len(races_df)} rows")
        print(f"    Columns: {list(races_df.columns)}")
        
        # Show first 10 races
        print("\n    First 10 races:")
        print("-" * 60)
        print(races_df.head(10).to_string())
        
        # Save race list
        races_df.to_csv("hyrox_races_list.csv", index=False, encoding="utf-8-sig")
        print(f"\n    [OK] Race list saved to: hyrox_races_list.csv")
            
    except Exception as e:
        print(f"    [FAIL] Failed to get race list: {e}")
        import traceback
        traceback.print_exc()
        races_df = pd.DataFrame()
    
    # Get Season 7 races specifically
    print("\n[3] Fetching Season 7 race list...")
    try:
        s7_races = client.list_races(season=7)
        print(f"    [OK] Got Season 7 races: {len(s7_races)} rows")
        print(s7_races.head(10).to_string())
        
        # Save season 7 race list
        s7_races.to_csv("hyrox_season7_races.csv", index=False, encoding="utf-8-sig")
        print(f"\n    [OK] Season 7 race list saved to: hyrox_season7_races.csv")
        
    except Exception as e:
        print(f"    [FAIL] Failed to get Season 7 races: {e}")
        import traceback
        traceback.print_exc()
        s7_races = pd.DataFrame()
    
    # Try to get specific race data
    print("\n[4] Fetching specific race data (Season 7)...")
    
    # Get available locations from season 7
    if not s7_races.empty and 'location' in s7_races.columns:
        locations = s7_races['location'].unique()[:5]
        print(f"    Available locations (first 5): {list(locations)}")
        
        for loc in locations:
            try:
                print(f"\n    Trying location: {loc}")
                race_data = client.get_race(
                    season=7,
                    location=loc
                )
                
                if isinstance(race_data, pd.DataFrame) and len(race_data) > 0:
                    print(f"    [OK] Got {len(race_data)} athlete records")
                    print(f"    Columns: {list(race_data.columns)}")
                    
                    # Save first successful race
                    output_file = f"hyrox_race_{loc.replace(' ', '_')}.csv"
                    race_data.to_csv(output_file, index=False, encoding="utf-8-sig")
                    print(f"    [OK] Data saved to: {output_file}")
                    
                    # Show sample data
                    print("\n    Sample data (first 5 rows):")
                    print("-" * 60)
                    print(race_data.head().to_string())
                    break
                else:
                    print(f"    [WARN] No data for {loc}")
                    
            except Exception as e:
                print(f"    [FAIL] {loc}: {e}")
    
    # Try get_season to fetch all data for a season
    print("\n[5] Fetching entire season data (Season 7, limited)...")
    try:
        # Get only first 3 locations to avoid long wait
        if not s7_races.empty and 'location' in s7_races.columns:
            sample_locations = list(s7_races['location'].unique()[:3])
            print(f"    Fetching locations: {sample_locations}")
            
            season_data = client.get_season(
                season=7,
                locations=sample_locations,
                max_workers=4
            )
            
            if isinstance(season_data, pd.DataFrame) and len(season_data) > 0:
                print(f"    [OK] Got {len(season_data)} total records")
                print(f"    Columns: {list(season_data.columns)}")
                
                # Save combined data
                output_file = "hyrox_season7_sample.csv"
                season_data.to_csv(output_file, index=False, encoding="utf-8-sig")
                print(f"    [OK] Season data saved to: {output_file}")
                
                # Show summary
                if 'location' in season_data.columns:
                    print("\n    Records per location:")
                    print(season_data.groupby('location').size())
            else:
                print("    [WARN] No season data returned")
                
    except Exception as e:
        print(f"    [FAIL] Failed to get season data: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)
    
    # List generated files
    import os
    csv_files = [f for f in os.listdir('.') if f.endswith('.csv')]
    if csv_files:
        print("\nGenerated CSV files:")
        for f in csv_files:
            size = os.path.getsize(f)
            print(f"  - {f} ({size:,} bytes)")

if __name__ == "__main__":
    main()
