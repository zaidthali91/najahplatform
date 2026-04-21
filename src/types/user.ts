export interface User {
  id:          string
  email:       string
  full_name:   string
  role:        'student' | 'admin' | 'teacher'
  credits:     number
  xp_points:   number
  level:       number
  streak_days: number
  governorate: string
  grade:       string
  theme:       'dark' | 'light'
  avatar_url?: string
  created_at?: string
}

export interface AuthResponse {
  user:   User
  tokens: { access: string; refresh: string }
  message: string
}

export enum TrackType {
  DAYTIME = 'daytime',
  EVENING = 'evening',
  OPEN = 'open'
}