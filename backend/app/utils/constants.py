"""
常量定义
"""

# 8个功能站 (字段名需与 pyrox 数据源一致)
WORKOUT_STATIONS = [
    {"key": "skiErg_time", "name": "SkiErg", "distance": "1000m"},
    {"key": "sledPush_time", "name": "Sled Push", "distance": "50m"},
    {"key": "sledPull_time", "name": "Sled Pull", "distance": "50m"},
    {"key": "burpeeBroadJump_time", "name": "Burpee Broad Jump", "distance": "80m"},
    {"key": "rowErg_time", "name": "Row", "distance": "1000m"},
    {"key": "farmersCarry_time", "name": "Farmers Carry", "distance": "200m"},
    {"key": "sandbagLunges_time", "name": "Sandbag Lunges", "distance": "100m"},
    {"key": "wallBalls_time", "name": "Wall Balls", "distance": "100 reps"},
]

# 8段跑步
RUN_SEGMENTS = [
    {"key": "run1_time", "name": "Run 1", "distance": "1km"},
    {"key": "run2_time", "name": "Run 2", "distance": "1km"},
    {"key": "run3_time", "name": "Run 3", "distance": "1km"},
    {"key": "run4_time", "name": "Run 4", "distance": "1km"},
    {"key": "run5_time", "name": "Run 5", "distance": "1km"},
    {"key": "run6_time", "name": "Run 6", "distance": "1km"},
    {"key": "run7_time", "name": "Run 7", "distance": "1km"},
    {"key": "run8_time", "name": "Run 8", "distance": "1km"},
]

# 国籍名称映射
NATIONALITY_NAMES = {
    # 亚洲
    "CHN": "China",
    "HKG": "Hong Kong",
    "TWN": "Taiwan",
    "JPN": "Japan",
    "KOR": "South Korea",
    "SGP": "Singapore",
    "MYS": "Malaysia",
    "THA": "Thailand",
    "PHL": "Philippines",
    "IDN": "Indonesia",
    "VNM": "Vietnam",
    "IND": "India",
    "PAK": "Pakistan",
    "KAZ": "Kazakhstan",
    "ARE": "UAE",
    "SAU": "Saudi Arabia",
    
    # 欧洲
    "GBR": "United Kingdom",
    "DEU": "Germany",
    "FRA": "France",
    "ITA": "Italy",
    "ESP": "Spain",
    "PRT": "Portugal",
    "NLD": "Netherlands",
    "BEL": "Belgium",
    "AUT": "Austria",
    "CHE": "Switzerland",
    "POL": "Poland",
    "CZE": "Czech Republic",
    "HUN": "Hungary",
    "SWE": "Sweden",
    "NOR": "Norway",
    "DNK": "Denmark",
    "FIN": "Finland",
    "IRL": "Ireland",
    "GRC": "Greece",
    "RUS": "Russia",
    "UKR": "Ukraine",
    "ROU": "Romania",
    
    # 美洲
    "USA": "United States",
    "CAN": "Canada",
    "MEX": "Mexico",
    "BRA": "Brazil",
    "ARG": "Argentina",
    "CHL": "Chile",
    "COL": "Colombia",
    "PER": "Peru",
    
    # 大洋洲
    "AUS": "Australia",
    "NZL": "New Zealand",
    
    # 非洲
    "ZAF": "South Africa",
    "EGY": "Egypt",
    "NGA": "Nigeria",
    "KEN": "Kenya",
}

# 组别名称映射
DIVISION_NAMES = {
    "open": "Open",
    "pro": "Pro",
    "doubles": "Doubles",
    "pro_doubles": "Pro Doubles",
}

# 性别名称映射
GENDER_NAMES = {
    "male": "Men's",
    "female": "Women's",
    "mixed": "Mixed",
}

# 年龄组列表
AGE_GROUPS = [
    "16-24",
    "25-29",
    "30-34",
    "35-39",
    "40-44",
    "45-49",
    "50-54",
    "55-59",
    "60-64",
    "65-69",
    "70-74",
    "75-79",
    "80+",
]

# 比赛地点映射（用于显示名称）
LOCATION_NAMES = {
    "hong-kong": "Hong Kong",
    "amsterdam": "Amsterdam",
    "london": "London",
    "berlin": "Berlin",
    "los-angeles": "Los Angeles",
    "new-york": "New York",
    "sydney": "Sydney",
    "munich": "Munich",
    "tokyo": "Tokyo",
    "singapore": "Singapore",
    "shanghai": "Shanghai",
    "miami": "Miami",
    "chicago": "Chicago",
    "manchester": "Manchester",
    "paris": "Paris",
    "madrid": "Madrid",
    "dallas": "Dallas",
    "anaheim": "Anaheim",
    "atlanta": "Atlanta",
    "birmingham": "Birmingham",
    "beijing": "Beijing",
    "acapulco": "Acapulco",
}

# 比赛日期映射 (可手动维护)
RACE_DATES = {
    # Season 8
    ("hong-kong", 8): "2025-01-12",
    ("amsterdam", 8): "2024-10-05",
    ("berlin", 8): "2024-09-15",
    # Season 7
    ("hong-kong", 7): "2024-01-14",
    ("amsterdam", 7): "2023-10-07",
}




