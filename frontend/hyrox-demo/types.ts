
export enum AppTab {
  HOME = 'home',
  RACE = 'race', // Maps to PlanTab (Race Prep)
  ME = 'me'      // Maps to DataTab (Profile & History)
}

export interface SplitDetail {
  name: string;
  split: string;
  total: string;
  pace?: string;
  hrZone?: string;
  vsAvg?: string; // e.g. "-12s (Fast)"
  progress: number; // 0-100 for the bar
}

export interface TrainingSession {
  id: string;
  type: 'Key' | 'Endurance' | 'Power' | 'Strength' | 'Recovery';
  title: string;
  description: string;
  day: string;
  imageUrl: string;
  color: string;
  icon: string;
}

export interface AthleteResult {
  id: string;
  name: string;
  bib: string;
  status: 'Finished' | 'Running' | 'DNF' | 'Registered';
  group: string;
  rank: string;
  globalRank?: string;
  groupTotal?: string;
  globalTotal?: string;
  time: string;
  avgPace?: string;
  avgHR?: string;
  splits?: SplitDetail[];
  event?: string;
  date?: string;
}
