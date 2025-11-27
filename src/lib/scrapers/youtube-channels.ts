// Trusted Indian Motorcycle Channels

interface TrustedChannel {
  name: string;
  channelId: string;
  trustScore: number;  // 1-10
  contentType: ('review' | 'comparison' | 'ownership' | 'technical')[];
  language: 'english' | 'hindi' | 'mixed';
}

export const TRUSTED_CHANNELS: TrustedChannel[] = [
  // Tier 1: Professional Reviewers (Trust: 9-10)
  {
    name: 'PowerDrift',
    channelId: 'UCi5eq_U7_sVAkc0wFibLqOw',
    trustScore: 10,
    contentType: ['review', 'comparison'],
    language: 'english'
  },
  {
    name: 'BikeWale',
    channelId: 'UC_hBVVxQvfMThpGqLFJPq1w',
    trustScore: 10,
    contentType: ['review', 'comparison', 'technical'],
    language: 'mixed'
  },
  {
    name: 'xBhp',
    channelId: 'UC-eiuLLkx3_sZsVVQ7_cGNw',
    trustScore: 9,
    contentType: ['review', 'comparison', 'ownership'],
    language: 'english'
  },
  {
    name: 'Autocar India',
    channelId: 'UCEd9RcTz3IOZNBIm8kDnDHA',
    trustScore: 9,
    contentType: ['review', 'comparison'],
    language: 'english'
  },
  {
    name: 'ZigWheels',
    channelId: 'UC_E9G0UrJJVDB9rj40LFuKg',
    trustScore: 9,
    contentType: ['review', 'comparison'],
    language: 'mixed'
  },
  
  // Tier 2: Quality Vloggers (Trust: 7-8)
  {
    name: 'Bashan Vlogs',
    channelId: 'UCqGHRiHuT0qT6OGZ5VFZNTg',
    trustScore: 8,
    contentType: ['ownership', 'review'],
    language: 'english'
  },
  {
    name: 'Tech Burner',
    channelId: 'UCrRkJCsqvuvLBQBIHPVRWkQ',
    trustScore: 7,
    contentType: ['review'],
    language: 'mixed'
  },
  {
    name: 'K2K Motovlogs',
    channelId: 'UCFxZ25G2QfL6RTrp4E1aJeA',
    trustScore: 8,
    contentType: ['ownership', 'technical'],
    language: 'hindi'
  },
  {
    name: 'RJ Rohit Raj',
    channelId: 'UCk7TuWO7eQUXHEHZ_1vKzag',
    trustScore: 7,
    contentType: ['ownership', 'review'],
    language: 'mixed'
  },
  {
    name: 'RevNitro',
    channelId: 'UCl_PwzH_-WXAQ3W-zHHMqVQ',
    trustScore: 8,
    contentType: ['review', 'comparison'],
    language: 'english'
  },
  
  // Tier 3: Owner Reviewers (Trust: 6-7)
  {
    name: 'Dino\'s Vault',
    channelId: 'UC8gzSDI7DlS7V3S3kIYFHDQ',
    trustScore: 7,
    contentType: ['review', 'ownership'],
    language: 'english'
  },
  {
    name: 'C2W Music',
    channelId: 'UCFvBKoNTYCNsUPYd8j_Y-aQ',
    trustScore: 6,
    contentType: ['ownership'],
    language: 'hindi'
  }
];

/**
 * Score a video based on channel trust
 */
export function getChannelTrustScore(channelTitle: string): number {
  const channel = TRUSTED_CHANNELS.find(c => 
    channelTitle.toLowerCase().includes(c.name.toLowerCase()) ||
    c.name.toLowerCase().includes(channelTitle.toLowerCase())
  );
  
  return channel?.trustScore || 5;  // Default to 5 for unknown channels
}

/**
 * Check if channel is a known trusted source
 */
export function isTrustedChannel(channelTitle: string): boolean {
  return TRUSTED_CHANNELS.some(c => 
    channelTitle.toLowerCase().includes(c.name.toLowerCase())
  );
}

