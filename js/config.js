// Dragon Nest Lite - Configuration
export const CONFIG = {
    // Display
    SCREEN_WIDTH: window.innerWidth,
    SCREEN_HEIGHT: window.innerHeight,

    // Camera
    CAMERA_FOV: 50,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 500,
    CAMERA_OFFSET: { x: 0, y: 18, z: 14 },
    CAMERA_LOOK_OFFSET: { x: 0, y: 0, z: -2 },
    CAMERA_LERP_SPEED: 0.08,

    // Player
    PLAYER_MOVE_SPEED: 8,
    PLAYER_RUN_SPEED: 14,
    PLAYER_ROTATION_SPEED: 10,
    PLAYER_BASE_HP: 100,
    PLAYER_BASE_MP: 50,
    PLAYER_BASE_ATK: 15,
    PLAYER_BASE_DEF: 10,
    PLAYER_BASE_MATK: 15,
    PLAYER_BASE_MDEF: 8,

    // Combat
    CRITICAL_CHANCE: 0.1,
    CRITICAL_MULTIPLIER: 1.5,
    DAMAGE_VARIANCE: 0.1, // +/- 10%
    INVINCIBILITY_FRAMES: 500, // ms

    // Skill
    MAX_SKILL_SLOTS: 4,
    MAX_SKILL_LEVEL: 5,

    // Dungeon
    MAX_ENEMIES_PER_ROOM: 20,

    // SP Rewards
    SP_REWARDS: {
        DUNGEON_1_FIRST: 5,
        DUNGEON_2_FIRST: 7,
        DUNGEON_3_FIRST: 10,
        DUNGEON_REPEAT: 2
    },

    // Experience
    EXP_PER_LEVEL: [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000],
    LEVEL_STAT_BONUS: {
        hp: 15,
        mp: 8,
        atk: 2,
        def: 1,
        matk: 2,
        mdef: 1
    },

    // Physics
    GRAVITY: -9.8,
    GROUND_Y: 0,

    // Town
    TOWN_SIZE: { width: 60, depth: 60 },

    // Save
    SAVE_KEY: 'dragon_nest_lite_save',

    // Audio
    BGM_VOLUME: 0.4,
    SFX_VOLUME: 0.7,
    VOICE_VOLUME: 0.8,
    SFX_PITCH_VARIANCE: 0.05,

    // Colors
    COLORS: {
        HP_BAR: 0xe74c3c,
        HP_BAR_BG: 0x333333,
        MP_BAR: 0x3498db,
        MP_BAR_BG: 0x333333,
        DAMAGE_TEXT: '#ff4444',
        HEAL_TEXT: '#44ff44',
        CRITICAL_TEXT: '#ffaa00',
        ENEMY_HP: 0xe74c3c,
    },

    // Placeholder model colors
    PLACEHOLDER: {
        WARRIOR: 0xcc6633,
        MAGE: 0x6633cc,
        SLIME: 0x33cc33,
        GOBLIN: 0x996633,
        SKELETON: 0xcccccc,
        DRAGON: 0xcc3333,
        NPC_BLACKSMITH: 0x666666,
        NPC_SKILLMASTER: 0x3366cc,
        NPC_POTION: 0xcc33cc,
        GROUND_TOWN: 0x558833,
        GROUND_DUNGEON: 0x443322,
        WALL: 0x554433,
    }
};
