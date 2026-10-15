import type { HintNode } from './HintEngine';
import type { GameState, Item } from '@kitchen/core';

function itemHasIngredient(item: Item | null | undefined, id: string, state?: string): boolean {
  if (!item) return false;
  if (item.type === 'ingredient') {
    return item.id === id && (!state || item.state === state);
  }
  if (item.type === 'plate' && Array.isArray(item.contents)) {
    return item.contents.some(c => c.id === id && (!state || c.state === state));
  }
  return false;
}

function mapOrPlayersHaveIngredient(snap: GameState, id: string, state?: string): boolean {
  for (const p of snap.players || []) {
    if (itemHasIngredient(p.held, id, state)) return true;
  }
  for (const st of snap.stations || []) {
    if (itemHasIngredient(st.item, id, state)) return true;
  }
  return false;
}

function hasAssembledSalad(snap: GameState): boolean {
  const checkItem = (item: Item | null | undefined): boolean => {
    if (!item || item.type !== 'plate') return false;
    const hasTomato = item.contents.some(c => c.id === 'tomato' && c.state === 'chopped');
    const hasLettuce = item.contents.some(c => c.id === 'lettuce' && c.state === 'chopped');
    return hasTomato && hasLettuce;
  };
  for (const p of snap.players || []) {
    if (checkItem(p.held)) return true;
  }
  for (const st of snap.stations || []) {
    if (checkItem(st.item)) return true;
  }
  return false;
}

export const TUTORIAL_HINTS: HintNode[] = [
  {
    id: 'move',
    text: 'Chào mừng! Dùng WASD / Phím mũi tên hoặc Chạm vào sàn để di chuyển',
    target: { x: 3, y: 2 },
    condition: (snap, _events, localPlayerId) => {
      const p = snap.players.find(x => x.id === localPlayerId) || snap.players[0];
      return p ? (Math.abs(p.vx) > 0 || Math.abs(p.vy) > 0) : false;
    }
  },
  {
    id: 'take_order',
    text: 'Bước 1: Sang Bàn Khách (Q) bên phải (chạm vào bàn hoặc nhấn Space/E) để nhận đơn gọi món 💬',
    target: { x: 10, y: 3 },
    condition: (snap) => {
      return (snap.orders && snap.orders.length > 0) || snap.served > 0;
    }
  },
  {
    id: 'pickup_tomato',
    text: 'Bước 2: Đến Thùng Cà Chua (T) ở góc trên bên trái để lấy cà chua tươi 🍅',
    target: { x: 1, y: 1 },
    condition: (snap) => {
      return mapOrPlayersHaveIngredient(snap, 'tomato') || snap.served > 0;
    }
  },
  {
    id: 'chop_tomato',
    text: 'Bước 3: Đặt Cà chua lên Thớt (C) và thái lát 🔪 (Chạm vào thớt hoặc giữ phím F)',
    target: { x: 4, y: 1 },
    condition: (snap) => {
      return mapOrPlayersHaveIngredient(snap, 'tomato', 'chopped') || snap.served > 0;
    }
  },
  {
    id: 'place_tomato_counter',
    text: 'Bước 4: Đặt Cà chua đã thái lên Bàn trống (X) ngay cạnh thớt để rảnh tay',
    target: { x: 5, y: 1 },
    condition: (snap) => {
      const onStation = (snap.stations || []).some(
        st => st.type !== 'cutting' && itemHasIngredient(st.item, 'tomato', 'chopped')
      );
      const onPlateInHand = (snap.players || []).some(
        p => p.held?.type === 'plate' && itemHasIngredient(p.held, 'tomato', 'chopped')
      );
      return onStation || onPlateInHand || snap.served > 0;
    }
  },
  {
    id: 'pickup_lettuce',
    text: 'Bước 5: Lấy thêm Xà lách tươi tại Thùng Xà Lách (L) 🥬',
    target: { x: 2, y: 1 },
    condition: (snap) => {
      return mapOrPlayersHaveIngredient(snap, 'lettuce') || snap.served > 0;
    }
  },
  {
    id: 'chop_lettuce',
    text: 'Bước 6: Đem Xà lách tới Thớt (C) để thái nhỏ 🔪',
    target: { x: 4, y: 1 },
    condition: (snap) => {
      return mapOrPlayersHaveIngredient(snap, 'lettuce', 'chopped') || snap.served > 0;
    }
  },
  {
    id: 'pickup_plate',
    text: 'Bước 7: Lấy Đĩa sạch tại Kệ Đĩa (P) ở quầy giữa 🍽️',
    target: { x: 7, y: 2 },
    condition: (snap) => {
      const hasPlate =
        (snap.players || []).some(p => p.held?.type === 'plate') ||
        (snap.stations || []).some(st => st.item?.type === 'plate');
      return hasPlate || hasAssembledSalad(snap) || snap.served > 0;
    }
  },
  {
    id: 'assemble_salad',
    text: 'Bước 8: Cầm Đĩa chạm vào Cà chua thái & Xà lách thái để ghép thành món Salad 🥗!',
    target: { x: 5, y: 1 },
    condition: (snap) => {
      return hasAssembledSalad(snap) || snap.served > 0;
    }
  },
  {
    id: 'serve',
    text: 'Bước 9: Mang đĩa Salad hoàn chỉnh sang Bàn Khách (Q) để phục vụ!',
    target: { x: 10, y: 3 },
    condition: (snap, events) => {
      return snap.served > 0 || events.some(e => e.type === 'serve_ok');
    }
  },
  {
    id: 'done',
    text: '🎉 Tuyệt vời! Khi khách ăn xong để lại đĩa bẩn, hãy mang ra Bồn Rửa (W) để rửa sạch nhé!',
    target: { x: 7, y: 5 },
    condition: () => {
      return false; // Giữ thông báo chúc mừng cho đến khi hết màn
    }
  }
];
