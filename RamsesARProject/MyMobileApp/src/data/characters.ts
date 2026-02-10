// Character data types and mock data
export interface Character {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  audioUrl?: string;
}

// Mock characters - replace with real pharaoh characters later
export const CHARACTERS: Character[] = [
  {
    id: 'ramses',
    name: 'Ramses II',
    description: 'The Great Pharaoh',
    thumbnail: 'https://via.placeholder.com/100x100/FFD700/000000?text=R',
  },
  {
    id: 'cleopatra',
    name: 'Cleopatra',
    description: 'Queen of Egypt',
    thumbnail: 'https://via.placeholder.com/100x100/9370DB/FFFFFF?text=C',
  },
  {
    id: 'tutankhamun',
    name: 'Tutankhamun',
    description: 'The Boy King',
    thumbnail: 'https://via.placeholder.com/100x100/4169E1/FFFFFF?text=T',
  },
];
