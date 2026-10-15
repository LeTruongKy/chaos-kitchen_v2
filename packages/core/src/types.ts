export type Vec2 = { x: number; y: number };

export type TileType =
  | 'wall'            // '#'  ngoài bản đồ, không đi được, không tương tác
  | 'floor'           // '.'  đi được
  | 'counter'         // 'X'  bàn trống: đặt được 1 vật
  | 'crate'           // 'T','L','B','M','N','H' thùng nguyên liệu (vô hạn)
  | 'cutting'         // 'C'  thớt
  | 'stove'           // 'S','s'  bếp
  | 'plate_dispenser' // 'P'  chỗ lấy đĩa sạch
  | 'sink'            // 'W'  bồn rửa
  | 'trash'           // 'D'  thùng rác
  | 'ice'             // '~'  băng
  | 'pit'             // '_'  hố
  | 'conveyor'        // '>','<','^','v' băng chuyền
  | 'extinguisher'    // 'E'  bình chữa cháy
  | 'table'           // 'Q'  bàn ăn cho khách
  | 'dish_return'     // 'R'  chỗ trả đĩa dơ
  | 'oven';           // 'U'  lò nướng

export type IngredientId = 'tomato' | 'lettuce' | 'bun' | 'meat' | 'onion' | 'mushroom' | 'soup_tomato' | 'soup_onion' | 'soup_mushroom' | 'dough' | 'cheese' | 'pizza';
export type IngredientState = 'raw' | 'chopped' | 'cooked' | 'burnt' | 'splat';
export type ToolId = 'pan' | 'pot' | 'extinguisher';

export interface IngredientItem { type: 'ingredient'; id: IngredientId; state: IngredientState; contents?: IngredientItem[]; }
export interface PlateItem { type: 'plate'; dirty: boolean; contents: IngredientItem[]; }
export interface ToolItem {
  type: 'tool';
  tool: ToolId;
  contents: IngredientItem[];
  progress: number;
}
export type Item = IngredientItem | PlateItem | ToolItem;

export type RecipeId = 'salad' | 'cheese_salad' | 'burger' | 'burger_tomato' | 'cheese_burger' | 'steak_dinner' | 'mushroom_steak' | 'tomato_soup' | 'onion_soup' | 'mushroom_soup' | 'pizza';

export interface Order { id: number; recipe: RecipeId; timeLeft: number; patience: number; customerId?: number; }

export interface PlayerInput { seq: number; mx: -1 | 0 | 1; my: -1 | 0 | 1; act: boolean; interact: boolean; dash: boolean; throw: boolean; }

export interface PlayerState {
  id: string;            // sessionId
  x: number; y: number;  // tile
  fx: number; fy: number;// hướng nhìn đơn vị (một trong 8 hướng, đã normalize)
  held: Item | null;
  acting: boolean;       // đang giữ phím hành động hợp lệ (thái/rửa)
  ackSeq: number;        // input seq cuối cùng đã xử lý
  vx: number; vy: number;
  dashT: number;
  dashCd: number;
  throwCd: number;
  sprintEnergy: number;
  sprintCooldown?: number;
  sprintExhausted?: boolean;
  ownerId?: string;
  autoAction?: 'chop' | 'wash';
}

export interface StationState {
  x: number; y: number; type: TileType;
  crate?: IngredientId;       // chỉ type 'crate'
  item: Item | null;          // counter/cutting/stove
  progress: number;           // cutting: giây đã thái; stove: giây đã nấu; sink: giây đã rửa
  dirtyCount: number;         // dish_return: số đĩa bẩn đang chờ; sink: số đĩa bẩn đã bỏ vào
  cleanCount: number;         // plate_dispenser: số đĩa sạch còn; sink: số đĩa sạch đã rửa xong
  pendingReturns: number[];   // dish_return: danh sách đếm ngược (giây) các đĩa bẩn sắp quay về
  lastActTick?: number;       // tick cuối cùng đài bị tương tác hành động (thái/rửa)
  onFire: boolean;
  fireTimer: number;
  burntTimer: number;
  dir?: 'up' | 'down' | 'left' | 'right'; // conveyor
  customerId?: number;        // table: ID của khách hàng đang ngồi
}

export type CustomerStateStatus = 'seated_waiting_order' | 'order_taken' | 'eating' | 'leaving';

export interface CustomerState {
  id: number;
  x: number; y: number;       // tọa độ của table đang ngồi
  state: 'seated_waiting_order' | 'order_taken' | 'eating' | 'leaving';
  recipe?: RecipeId;
  patience: number;
  maxPatience: number;
  timer: number;              // dùng cho eating duration hoặc leaving duration
  colorIndex: number;         // màu áo
  waitLeft?: number;          // thời gian chờ nhận order (khởi tạo CUSTOMER_ORDER_WAIT = 30)
  angry?: boolean;            // cờ giận: true khi patience < 20% hoặc khi rời do hết hạn
}

export interface Projectile { id: number; item: IngredientItem; x: number; y: number; vx: number; vy: number; traveled: number; ownerId: string; }

export interface GameState {
  levelId: string; width: number; height: number;
  tiles: TileType[];            // length = width*height, index = y*width+x
  stations: StationState[];     // chỉ các tile không phải wall/floor
  players: PlayerState[];
  orders: Order[];
  nextOrderId: number; nextOrderIn: number;
  score: number; served: number; expired: number;
  timeLeft: number; tick: number; timeElapsed: number;
  rngState: number;
  ended: boolean;
  recipeWeights: { id: RecipeId; weight: number }[];
  starThresholds: [number, number, number];
  projectiles: Projectile[];
  nextProjectileId: number;
  customers: CustomerState[];
  nextCustomerId: number;
  streak: number;
  maxStreak: number;
  servedByPlayer: Record<string, number>;
  orderScript?: { at: number; recipe: RecipeId }[];
  nextScriptIdx?: number;
}

export interface LevelDef {
  id: string; name: string; ascii: string[];       // mỗi dòng cùng độ dài
  duration: number;                                  // giây
  plates: number;                                    // số đĩa sạch ban đầu ở mỗi 'P'
  recipes: { id: RecipeId; weight: number }[];       // trọng số random đơn
  stars: [number, number, number];                   // ngưỡng điểm 1/2/3 sao
  world: number;
  orderScript?: { at: number; recipe: RecipeId }[];
  hints?: { at: number; text: string }[];
  unlockStars?: number;
  theme: 'diner' | 'ship' | 'space';
  maxPlayers?: number; // Tối đa số người chơi (mặc định MAX_PLAYERS = 4 nếu không quy định)
}

export type EventType = 'chop_done' | 'cook_done' | 'burnt' | 'serve_ok' | 'serve_fail' | 'order_new' | 'order_expired' | 'pickup' | 'drop' | 'wash_done' | 'trash' | 'timeup' | 'dash' | 'throw' | 'catch' | 'splat' | 'ignite' | 'extinguish' | 'pot_done' | 'soup_burnt' | 'oven_done' | 'pizza_burnt' | 'streak_up' | 'streak_lost' | 'customer_spawn' | 'customer_order' | 'customer_leave';

export type ServeFailReason = 'no_customer' | 'no_order' | 'wrong_dish' | 'wrong_table';
export type CustomerLeaveReason = 'served' | 'expired' | 'no_order_taken';

export interface GameEvent {
  type: EventType;
  x?: number;
  y?: number;
  playerId?: string;
  recipe?: RecipeId;
  baseScore?: number;
  tip?: number;
  streak?: number;
  reward?: number;
  reason?: ServeFailReason | CustomerLeaveReason;
  customerId?: number;
}

