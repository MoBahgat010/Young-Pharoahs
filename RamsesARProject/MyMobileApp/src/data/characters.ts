// Character data types and mock data
export interface Character {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  audioUrl?: string;
}

// Mock characters - only the cat pharaoh king model is available
export const CHARACTERS: Character[] = [
  {
    id: 'cat_pharaoh__king',
    name: 'Ramses II',
    description: 'The Great Pharaoh',
    thumbnail: 'https://via.placeholder.com/100x100/FFD700/000000?text=R',
  },
];
