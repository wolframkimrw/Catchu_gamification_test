import ramenThumb from "../assets/ramen-worldcup.svg";
import type { Game, GameDetailData, GameItem } from "../api/games";

export const LOCAL_WORLDCUP_ID = 0;

export const LOCAL_WORLDCUP_ITEMS: GameItem[] = [
  { id: 1, name: "신라면", file_name: ramenThumb, sort_order: 0 },
  { id: 2, name: "진라면", file_name: ramenThumb, sort_order: 1 },
  { id: 3, name: "너구리", file_name: ramenThumb, sort_order: 2 },
  { id: 4, name: "안성탕면", file_name: ramenThumb, sort_order: 3 },
  { id: 5, name: "짜파게티", file_name: ramenThumb, sort_order: 4 },
  { id: 6, name: "팔도비빔면", file_name: ramenThumb, sort_order: 5 },
  { id: 7, name: "불닭볶음면", file_name: ramenThumb, sort_order: 6 },
  { id: 8, name: "육개장", file_name: ramenThumb, sort_order: 7 },
];

export const LOCAL_WORLDCUP_GAME: Game = {
  id: LOCAL_WORLDCUP_ID,
  title: "라면 월드컵",
  type: "WORLD_CUP",
  thumbnail: ramenThumb,
};

export const getLocalWorldcupDetail = (): GameDetailData => {
  const items = LOCAL_WORLDCUP_ITEMS.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
  return {
    game: { ...LOCAL_WORLDCUP_GAME, items },
    items,
  };
};
