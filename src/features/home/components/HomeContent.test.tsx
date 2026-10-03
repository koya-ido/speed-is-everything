import { HomeContent } from "@/features/home/components/HomeContent";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
let mockRoomParam: string | null = null;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      mode_single: "シングルモード",
      mode_battle: "バトルモード",
      single_tag: "SOLO MODE",
      single_title: "SURVIVAL REFLEX",
      single_desc: "持ち時間3000msの限界に挑むソロ反射神経テスト",
      battle_tag: "PVP MODE",
      battle_title: "REALTIME 1vs1 BATTLE",
      battle_desc: "リアルタイムで対戦相手と競い合う反射神経バトル",
      init_game: "ゲームスタート",
      ranking: "ランキング",
      login_prompt: "ログインすると自己ベストが記録されます",
      mission_briefing: "ゲーム説明",
      rule1_1: "画面が",
      rule1_color: "緑色",
      rule1_2_pc: "になった瞬間にクリック",
      rule1_2_mobile: "になった瞬間に指を離す",
      rule2_1: "持ち時間 ",
      rule2_2: " からスタート",
      rule3_1: "お手つき、または持ち時間が ",
      rule3_2: " になるとゲームオーバー",
      rule4: "限界まで反射神経を研ぎ澄ませ",
      battle_briefing: "対戦ルール",
      battle_rule1_1: "画面が",
      battle_rule1_color: "緑色",
      battle_rule1_2: "になった瞬間に最速でタップ / クリック！",
      battle_rule2_1: "相手より速く反応して",
      battle_rule2_attack: "攻撃",
      battle_rule2_2: "！速度ランクやコンボによってダメージ倍率発生！",
      battle_rule3_1: "緑になる前のタップ（フライング）は",
      battle_rule3_defeat: "即敗北",
      battle_rule3_2: "！",
      battle_rule4: "相手のHPを先に0にしたプレイヤーの完全勝利！",
      dialog_battle_select_title: "対戦ロビー",
      dialog_battle_select_subtitle: "対戦の開始方法を選択してください",
      create_room_card_title: "部屋を作る",
      create_room_card_desc: "新しいルームを作成して対戦相手を招待します",
      join_room_card_title: "部屋に参加",
      join_room_card_desc: "ルームコードを入力して対戦に参加します",
      lobby_back: "戻る",
      lobby_close: "閉じる",
      lobby_create_title: "部屋を作る",
      lobby_join_title: "部屋に参加する",
      lobby_create_description: "ルームを作成して対戦相手を招待します",
      lobby_join_description: "ルームコードを入力して対戦に参加します",
      lobby_player_name: "プレイヤーネーム (表示名)",
      lobby_player_name_placeholder: "未入力時は自動生成されます",
      lobby_rules_title: "バトルルール",
      lobby_rule_false_start: "緑になる前のタップ（フライング）は即敗北！",
      lobby_rule_attack:
        "相手より速いタイムで攻撃。Excellent/Godlikeでコンボ倍率アップ！",
      lobby_create_submit: "部屋を作成して待機する",
      lobby_room_code_label: "6桁ルームコード (ROOM CODE)",
      lobby_room_code_placeholder: "例: 389-102",
      lobby_error_room_code:
        "6桁のルームコードを入力してください（例: 389-102）",
      lobby_join_instruction_code:
        "ホストから共有されたコードを入力するか、招待リンクから入室してください。",
      lobby_join_instruction_start:
        "入室後、ホストがゲームを開始するとラウンドがスタートします。",
      lobby_join_submit: "部屋に参加する",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/i18n/routing", () => ({
  Link: ({
    children,
    href,
    className,
    onClick,
  }: {
    children?: React.ReactNode;
    href?: string;
    className?: string;
    onClick?: () => void;
  }) => (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (param: string) => {
      if (param === "room") return mockRoomParam;
      return null;
    },
  }),
}));

describe("HomeContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRoomParam = null;
    document.cookie = "home-mode=; path=/; max-age=0";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders single mode by default and shows survival reflex rules", () => {
    render(<HomeContent isLoggedIn={false} />);

    // Default mode is single mode
    expect(screen.getByText("SURVIVAL REFLEX")).toBeInTheDocument();
    expect(screen.getByText("ゲーム説明")).toBeInTheDocument();
    expect(screen.getByText("3000ms")).toBeInTheDocument();

    // Start button links to /game
    const startLink = screen.getByRole("link", { name: /ゲームスタート/i });
    expect(startLink).toHaveAttribute("href", "/game");
  });

  it("switches to battle mode when clicking battle mode tab and displays battle rules", () => {
    render(<HomeContent isLoggedIn={false} />);

    // Switch to Battle Mode
    const battleTab = screen.getByRole("button", { name: /バトルモード/i });
    fireEvent.click(battleTab);

    // Battle mode elements appear
    expect(screen.getByText("REALTIME 1vs1 BATTLE")).toBeInTheDocument();
    expect(screen.getByText("対戦ルール")).toBeInTheDocument();
    expect(screen.getByText("即敗北")).toBeInTheDocument();

    // Single mode specific text should not be in heading
    expect(screen.queryByText("ゲーム説明")).not.toBeInTheDocument();
  });

  it("opens battle select dialog when clicking game start button in battle mode", () => {
    render(<HomeContent isLoggedIn={false} />);

    // Switch to Battle Mode
    const battleTab = screen.getByRole("button", { name: /バトルモード/i });
    fireEvent.click(battleTab);

    // Click Game Start button in Battle Mode
    const startButton = screen.getByRole("button", { name: /ゲームスタート/i });
    fireEvent.click(startButton);

    // Select modal opens with "部屋を作る" and "部屋に参加"
    expect(screen.getByText("対戦ロビー")).toBeInTheDocument();
    expect(screen.getByText("部屋を作る")).toBeInTheDocument();
    expect(screen.getByText("部屋に参加")).toBeInTheDocument();
  });

  it("opens create room modal when '部屋を作る' is clicked in select dialog", () => {
    render(<HomeContent isLoggedIn={false} defaultUserName="TestPlayer" />);

    // Switch to Battle Mode and open dialog
    fireEvent.click(screen.getByRole("button", { name: /バトルモード/i }));
    fireEvent.click(screen.getByRole("button", { name: /ゲームスタート/i }));

    // Click "部屋を作る"
    const createRoomCard = screen.getByRole("button", { name: /部屋を作る/i });
    fireEvent.click(createRoomCard);

    // Create room modal opens
    expect(
      screen.getByRole("button", { name: /部屋を作成して待機する/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("TestPlayer")).toBeInTheDocument();
  });

  it("opens join room modal when '部屋に参加' is clicked in select dialog", () => {
    render(<HomeContent isLoggedIn={false} />);

    // Switch to Battle Mode and open dialog
    fireEvent.click(screen.getByRole("button", { name: /バトルモード/i }));
    fireEvent.click(screen.getByRole("button", { name: /ゲームスタート/i }));

    // Click "部屋に参加"
    const joinRoomCard = screen.getByRole("button", { name: /部屋に参加/i });
    fireEvent.click(joinRoomCard);

    // Join room modal opens with room code input
    expect(screen.getByPlaceholderText(/例: 389-102/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /部屋に参加する/i }),
    ).toBeInTheDocument();
  });

  it("auto-opens join modal when room URL parameter is present", () => {
    mockRoomParam = "999-888";

    render(<HomeContent isLoggedIn={false} />);

    // Should automatically be in battle mode and show join modal with initial code
    expect(screen.getByDisplayValue("999-888")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /部屋に参加する/i }),
    ).toBeInTheDocument();
  });
});
