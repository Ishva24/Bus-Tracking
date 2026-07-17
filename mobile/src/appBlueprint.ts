export type MobileScreenName =
  | 'Login'
  | 'Register'
  | 'Home'
  | 'BusDetails'
  | 'TripETA'
  | 'Favorites'
  | 'Profile';

export interface AppBlueprint {
  name: string;
  status: string;
  screens: MobileScreenName[];
  endpoints: string[];
  realtimeEvents: string[];
  envKeys: string[];
}

export const busTrackMobileBlueprint: AppBlueprint = {
  name: 'BusTrack Mobile',
  status: 'scaffolded',
  screens: ['Login', 'Register', 'Home', 'BusDetails', 'TripETA', 'Favorites', 'Profile'],
  endpoints: [
    '/auth/login',
    '/auth/register',
    '/routes',
    '/buses',
    '/users/me/favorites',
    '/users/me/alerts',
    '/config/map-provider',
  ],
  realtimeEvents: ['bus:update', 'eta:update', 'route:update'],
  envKeys: [
    'API_BASE_URL',
    'SOCKET_URL',
    'GOOGLE_MAPS_API_KEY_ANDROID',
    'GOOGLE_MAPS_API_KEY_IOS',
  ],
};
