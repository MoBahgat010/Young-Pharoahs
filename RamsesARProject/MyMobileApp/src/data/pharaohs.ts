import type {ImageSourcePropType} from 'react-native';

/**
 * Pharaoh data for the Home Screen carousel
 */

export interface Pharaoh {
  id: string;
  name: string;
  gender: 'male' | 'female';
  imageUrl?: string;
  localImage?: ImageSourcePropType;
}

export const PHARAOHS: Pharaoh[] = [
  {
    id: 'ramses-ii',
    name: 'Ramses II',
    gender: 'male',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpcvcDP-OCNNP-PBuAVhmsuctcjr1Amg-PTQ&s',
  },
  {
    id: 'tutankhamun',
    name: 'Tutankhamun',
    gender: 'male',
    imageUrl:
      'https://cdn.britannica.com/99/4799-050-F1B26AEA/Tutankhamen-mask-tomb-king-Egyptian-Museum-Cairo.jpg',
  },
  {
    id: 'cleopatra-vii',
    name: 'Cleopatra VII',
    gender: 'female',
    imageUrl:
      'https://i1.sndcdn.com/artworks-kPTRyWC1jWWFWqjz-6bqJjA-t500x500.jpg',
  },
  {
    id: 'khufu',
    name: 'Khufu',
    gender: 'male',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9LV7GzdFMKIG6_15ldST8Mc1uOPGfixcsYw&s',
  },
  {
    id: 'hatshepsut',
    name: 'Hatshepsut',
    gender: 'female',
    localImage: require('../assets/images/hatshepsut.jpg'),
  },
  {
    id: 'seti-i',
    name: 'Seti I',
    gender: 'male',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSClPIFxmsoy_4UNu2nEipi0fKjcRqyySaJqw&s',
  },
  {
    id: 'thutmose-iii',
    name: 'Thutmose III',
    gender: 'male',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTKUcLGomW8XZuR2M87yn52bK4vTkd53KAcjDdIjpfza2_f1REDeHPnWrd_QbJniIMxa7xx3l4BVj0WmrhgJxOi76XFZqnITsEfsbrOLyjJ&s=10',
  },
  {
    id: 'amenhotep-iii',
    name: 'Amenhotep III',
    gender: 'male',
    imageUrl:
      'https://i0.wp.com/egypt-museum.com/wp-content/uploads/2022/10/Statue-of-Amenhotep-III.jpg?w=400&ssl=1',
  },
  {
    id: 'senusret-iii',
    name: 'Senusret III',
    gender: 'male',
    imageUrl:
      'https://thumbs.dreamstime.com/b/london-united-kingdom-senwosret-iii-th-dynasty-ruler-egypt-his-deeds-were-traditionally-conflated-predecessors-295392412.jpg',
  },
];

/** Background image for the Home Screen hero */
export const HOME_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCSNn7Ga-o441Uav4tpwi8W86eidgr6P7F-wYGTCBTQVjYdFrjlDz7gpIlGZS8ucwoKVfGP8ussuIFLoevPZmq4pVNdHyAm5MStUqUogQHaaMKnApYoGo2djbU0B5yIfIn4RXQMr4gO39sdOW5PJh1-l7ascRxKXZ-48bFHDYZ4HhXvqknZ4OCTcbxQ7OHuuOznlar0VN6YuHfP51EptpxTfUabDz58zAqRsf6vRaw5YpSWdEIyP0cbYs4Jhvu83Weh_YVKVJVizw';

/** User avatar placeholder */
export const USER_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDYgMdrm9tAMmRglGXmcvVzT8HGjmevjzpvEBcOVukKcZ6mq1H9LwPBiabzlSiwRHtgTSRjK_cbxtXHloGSuHG0Lpq-Zgb63FqlqXRwa5XwC0Q-UhpiSWe5P-T6oFHT6LqerrxPckA-Kj-svL1Yf3RzXtDCHlr-CWW841IMA7pqaKnsfIBU9x9-IkYTHYYgFkPBf90xrKqjHsJsrTnsx8rggkYl08yImkcdMjLmX3W5iO7LJLZxOmFvDXcQJ91KLhQUvwLUhWdl4Q';
