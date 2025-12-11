/**
 * 项目风格服务
 * 管理各种视觉风格配置，用于图片和视频生成
 */

// 风格类别
export type StyleCategory = 'animation' | 'live_action' | 'special';

// 动画子类型
export type AnimationSubType =
  | 'anime_2d'        // 日式2D动画
  | 'anime_3d'        // 3D动画
  | 'children'        // 儿童动画
  | 'clay'            // 粘土动画/定格动画
  | 'watercolor'      // 水彩风格
  | 'pixel'           // 像素风格
  | 'sketch';         // 素描/手绘风格

// 真人子类型
export type LiveActionSubType =
  | 'modern'          // 现代都市
  | 'period'          // 年代剧
  | 'fantasy'         // 奇幻/魔幻
  | 'scifi'           // 科幻
  | 'documentary';    // 纪录片风格

// 特定风格大师
export type SpecialStyle =
  | 'miyazaki'        // 宫崎骏
  | 'shinkai'         // 新海诚
  | 'shanghai_classic' // 上海美术电影制片厂
  | 'disney_classic'  // 经典迪士尼
  | 'pixar'           // 皮克斯
  | 'ghibli'          // 吉卜力通用
  | 'cyberpunk'       // 赛博朋克
  | 'noir'            // 黑色电影
  | 'wes_anderson';   // 韦斯·安德森

// 完整风格ID
export type StyleId =
  | `animation_${AnimationSubType}`
  | `live_action_${LiveActionSubType}`
  | `special_${SpecialStyle}`;

// 风格配置
export interface StyleConfig {
  id: StyleId;
  name: string;
  category: StyleCategory;
  subType: string;
  description: string;
  // 图片生成提示词模板
  imagePromptPrefix: string;
  imagePromptSuffix: string;
  // 视频生成提示词模板
  videoPromptPrefix: string;
  videoPromptSuffix: string;
  // 角色外貌描述模板
  characterPromptTemplate: string;
  // 负面提示词（避免生成的内容）
  negativePrompt: string;
  // 示例图片（用于预览）
  previewImage?: string;
}

// 所有可用风格配置
export const STYLE_CONFIGS: StyleConfig[] = [
  // ==================== 动画风格 ====================
  {
    id: 'animation_anime_2d',
    name: '日式2D动画',
    category: 'animation',
    subType: 'anime_2d',
    description: '经典日本动画风格，细腻的线条和丰富的表情',
    imagePromptPrefix: '【必须是日式动画风格】anime style，日本动画，2D手绘动画，精美的动画画面，清晰的轮廓线，',
    imagePromptSuffix: '，动画截图，高质量日本动画，细腻的线条，赛璐珞风格上色，鲜艳的色彩，专业动画制作，anime screenshot，cel shading，masterpiece',
    videoPromptPrefix: '日式2D动画，anime animation，流畅的动画，',
    videoPromptSuffix: '，Japanese anime，smooth animation，high quality anime',
    characterPromptTemplate: '【日式动画角色】anime character，{description}，动画风格的大眼睛，精致细腻的五官，标准的日本动画人物造型，赛璐珞上色风格，清晰的轮廓线条',
    negativePrompt: '真人，写实，照片，3D渲染，realistic，photo，3d render，western cartoon',
  },
  {
    id: 'animation_anime_3d',
    name: '3D动画',
    category: 'animation',
    subType: 'anime_3d',
    description: '现代3D渲染动画，如皮克斯、梦工厂风格',
    imagePromptPrefix: '【必须是3D动画风格】3D animation style，高质量3D渲染，卡通渲染，3D cartoon，cinema quality，',
    imagePromptSuffix: '，3D animation frame，精细的材质，柔和的光影，卡通渲染风格，subsurface scattering，soft lighting，Pixar quality，3D animated movie',
    videoPromptPrefix: '3D动画电影，cinema quality 3D animation，',
    videoPromptSuffix: '，3D animated，smooth 3D animation，movie quality',
    characterPromptTemplate: '【3D动画角色】3D animated character，{description}，卡通化的3D造型，圆润可爱的特征，夸张但协调的比例，生动丰富的表情，高质量3D渲染',
    negativePrompt: '2D，平面，真人，写实照片，flat，realistic photo，anime style',
  },
  {
    id: 'animation_children',
    name: '儿童动画',
    category: 'animation',
    subType: 'children',
    description: '适合儿童的可爱卡通风格，色彩明亮',
    imagePromptPrefix: '【必须是儿童动画风格】children cartoon style，可爱卡通，明亮鲜艳的色彩，萌系风格，Q版卡通，cute kawaii style，',
    imagePromptSuffix: '，kids animation，cute cartoon style，圆润可爱的造型，温馨欢快的氛围，适合儿童的风格，big eyes，round shapes，bright cheerful colors，adorable，child-friendly',
    videoPromptPrefix: '儿童动画，可爱卡通风格，明亮色彩，',
    videoPromptSuffix: '，children animation，bright colors，cute characters，kawaii',
    characterPromptTemplate: '【萌系儿童卡通角色】cute cartoon character for children，{description}，超级可爱的Q版造型，大头小身比例(头身比2-3头身)，圆润可爱的脸蛋，水汪汪的大眼睛，简洁可爱的设计，明亮欢快的色彩，kawaii style，chibi proportions',
    negativePrompt: '写实，恐怖，暴力，成人内容，realistic，horror，scary，mature，complex details，realistic proportions',
  },
  {
    id: 'animation_clay',
    name: '粘土/定格动画',
    category: 'animation',
    subType: 'clay',
    description: '粘土动画或定格动画风格，如《小羊肖恩》',
    imagePromptPrefix: '【必须是粘土动画风格】claymation style，stop motion animation，粘土材质，手工制作质感，clay texture，',
    imagePromptSuffix: '，stop motion animation，clay texture，handmade feel，温暖的粘土质感，visible clay texture，handcrafted，Aardman style，Wallace and Gromit style',
    videoPromptPrefix: '定格动画，粘土动画风格，stop motion，',
    videoPromptSuffix: '，claymation，stop motion，handcrafted animation，clay animation',
    characterPromptTemplate: '【粘土动画角色】claymation character，{description}，真实的粘土材质质感，手工制作的痕迹，圆润简洁的造型，可见的指纹和捏痕，温暖的手工感',
    negativePrompt: '平滑，数字感，2D平面，smooth，digital，flat，anime',
  },
  {
    id: 'animation_watercolor',
    name: '水彩风格',
    category: 'animation',
    subType: 'watercolor',
    description: '水彩画风格动画，柔和梦幻',
    imagePromptPrefix: '【必须是水彩画风格】watercolor painting style，水彩画，柔和的色彩晕染，水彩渲染，soft watercolor，',
    imagePromptSuffix: '，watercolor painting，soft edges，dreamy atmosphere，艺术感，水彩纸质感，color bleeding，wet on wet，transparent colors，artistic watercolor',
    videoPromptPrefix: '水彩动画风格，watercolor animation，',
    videoPromptSuffix: '，watercolor animation，soft and dreamy，artistic',
    characterPromptTemplate: '【水彩画风格角色】watercolor style character，{description}，柔和的水彩轮廓，色彩自然晕染过渡，梦幻柔美的质感，水彩画的透明感',
    negativePrompt: '锐利边缘，数字感，3D渲染，sharp edges，digital，3d，hard lines',
  },
  {
    id: 'animation_pixel',
    name: '像素风格',
    category: 'animation',
    subType: 'pixel',
    description: '复古像素游戏风格',
    imagePromptPrefix: '【必须是像素艺术风格】pixel art style，像素画，8-bit style，复古游戏风格，retro game aesthetic，',
    imagePromptSuffix: '，pixel art，8-bit style，retro game aesthetic，清晰可见的像素点，limited color palette，nostalgic，video game sprite，16-bit',
    videoPromptPrefix: '像素动画，复古游戏风格，pixel art，',
    videoPromptSuffix: '，pixel animation，8-bit animation，retro game',
    characterPromptTemplate: '【像素艺术角色】pixel art character，{description}，像素化造型，复古游戏人物风格，简洁的像素表现，清晰的像素块，有限的调色板',
    negativePrompt: '高清，写实，平滑渐变，anti-aliasing，smooth，realistic，high resolution details',
  },
  {
    id: 'animation_sketch',
    name: '素描/手绘',
    category: 'animation',
    subType: 'sketch',
    description: '手绘素描风格，铅笔线条感',
    imagePromptPrefix: '【必须是手绘素描风格】pencil sketch style，铅笔素描，hand drawn，黑白素描，sketch art，',
    imagePromptSuffix: '，hand drawn，sketch art，pencil strokes，纸张质感，graphite，pencil texture，paper texture，artistic sketch，monochrome',
    videoPromptPrefix: '手绘动画，素描风格，pencil animation，',
    videoPromptSuffix: '，sketch animation，hand drawn animation，pencil style',
    characterPromptTemplate: '【手绘素描角色】pencil sketch character，{description}，铅笔线条质感，素描风格阴影，手绘的质感和笔触，纸上素描的效果',
    negativePrompt: '上色，数字绘画，3D，colored，digital painting，3d render，vibrant colors',
  },

  // ==================== 真人风格 ====================
  {
    id: 'live_action_modern',
    name: '现代都市',
    category: 'live_action',
    subType: 'modern',
    description: '现代都市剧风格，真实自然',
    imagePromptPrefix: '【必须是真实感电影风格】cinematic photography，电影级画质，现代都市场景，写实风格，realistic，',
    imagePromptSuffix: '，cinematic，professional photography，natural lighting，现代感，8k quality，photorealistic，movie still，film grain',
    videoPromptPrefix: '现代都市剧，真实感，cinematic，',
    videoPromptSuffix: '，cinematic quality，natural，modern urban，realistic',
    characterPromptTemplate: '【真实感人物】realistic person，photorealistic，{description}，现代时尚装扮，自然妆容，都市气质，真实的皮肤质感，电影级人像',
    negativePrompt: '动画，卡通，夸张，anime，cartoon，illustration，painting，drawing，3d render',
  },
  {
    id: 'live_action_period',
    name: '年代剧',
    category: 'live_action',
    subType: 'period',
    description: '年代剧风格，复古怀旧',
    imagePromptPrefix: '【必须是复古年代风格】vintage photography，年代剧风格，复古怀旧，胶片质感，film photography，',
    imagePromptSuffix: '，period drama，vintage aesthetic，film grain，怀旧氛围，nostalgic，sepia tones，classic cinema，old film look',
    videoPromptPrefix: '年代剧，复古电影风格，vintage，',
    videoPromptSuffix: '，period piece，vintage film look，classic cinema',
    characterPromptTemplate: '【复古年代人物】vintage style person，{description}，复古服装造型，年代感妆容和发型，怀旧气质，老电影中的人物形象',
    negativePrompt: '现代元素，数字感，动画，modern，anime，cartoon，contemporary fashion',
  },
  {
    id: 'live_action_fantasy',
    name: '奇幻/魔幻',
    category: 'live_action',
    subType: 'fantasy',
    description: '奇幻魔幻风格，如《指环王》',
    imagePromptPrefix: '【必须是史诗奇幻风格】epic fantasy style，魔幻世界，Lord of the Rings style，奇幻电影，',
    imagePromptSuffix: '，fantasy film，magical atmosphere，epic scale，神秘氛围，cinematic fantasy，medieval fantasy，dramatic lighting，mystical',
    videoPromptPrefix: '奇幻电影风格，魔幻史诗，epic fantasy，',
    videoPromptSuffix: '，fantasy movie，epic fantasy，magical，cinematic',
    characterPromptTemplate: '【奇幻电影角色】epic fantasy character，{description}，奇幻世界的服装造型，可能穿着盔甲、长袍或奇幻服饰，神秘高贵的气质，电影级奇幻人物',
    negativePrompt: '现代都市，科技感，卡通，modern，sci-fi，anime，cartoon',
  },
  {
    id: 'live_action_scifi',
    name: '科幻',
    category: 'live_action',
    subType: 'scifi',
    description: '科幻风格，未来感科技感',
    imagePromptPrefix: '【必须是科幻电影风格】science fiction style，sci-fi movie，未来感，高科技，futuristic，',
    imagePromptSuffix: '，science fiction，futuristic，high tech，霓虹灯光，金属质感，cybernetic，holographic，advanced technology，cinematic sci-fi',
    videoPromptPrefix: '科幻电影，未来世界，sci-fi，',
    videoPromptSuffix: '，sci-fi movie，futuristic，high-tech，cinematic',
    characterPromptTemplate: '【科幻电影角色】sci-fi character，{description}，未来感科技装扮，可能穿着高科技服装、太空服或带有科技元素的服饰，未来感气质',
    negativePrompt: '古代，中世纪，卡通，medieval，fantasy，anime，cartoon，historical',
  },
  {
    id: 'live_action_documentary',
    name: '纪录片',
    category: 'live_action',
    subType: 'documentary',
    description: '纪录片风格，真实自然',
    imagePromptPrefix: '【必须是纪录片风格】documentary photography style，真实记录，自然光，authentic，natural，',
    imagePromptSuffix: '，documentary photography，natural，authentic，真实感，candid，unposed，real life，journalistic style',
    videoPromptPrefix: '纪录片风格，真实记录，documentary，',
    videoPromptSuffix: '，documentary，authentic，real footage style，natural',
    characterPromptTemplate: '【纪录片风格人物】documentary style person，{description}，自然真实的状态，无刻意修饰，真实生活中的样子，抓拍感',
    negativePrompt: '戏剧化，特效，动画，staged，dramatic，anime，cartoon，fantasy，sci-fi',
  },

  // ==================== 特定风格大师 ====================
  {
    id: 'special_miyazaki',
    name: '宫崎骏风格',
    category: 'special',
    subType: 'miyazaki',
    description: '宫崎骏/吉卜力经典风格，温暖细腻',
    imagePromptPrefix: '【必须是宫崎骏风格】Hayao Miyazaki style，Studio Ghibli style，温暖治愈的色调，细腻精美的手绘背景，',
    imagePromptSuffix: '，Hayao Miyazaki style animation，hand-painted backgrounds，温暖治愈的氛围，飘动的云朵，丰富的自然元素，吉卜力动画电影，Spirited Away style，Totoro style，masterpiece',
    videoPromptPrefix: '吉卜力动画风格，宫崎骏，Studio Ghibli，',
    videoPromptSuffix: '，Ghibli animation，Miyazaki style，warm and gentle，healing',
    characterPromptTemplate: '【宫崎骏吉卜力风格角色】Studio Ghibli character，Miyazaki style，{description}，温暖有灵气的眼神，自然柔和的表情，简洁但极富表现力的设计，吉卜力特有的人物造型',
    negativePrompt: '3D，写实，暗黑，赛博朋克，realistic，3d render，dark，cyberpunk，horror',
  },
  {
    id: 'special_shinkai',
    name: '新海诚风格',
    category: 'special',
    subType: 'shinkai',
    description: '新海诚风格，唯美光影，精致背景',
    imagePromptPrefix: '【必须是新海诚风格】Makoto Shinkai style，Your Name style，精致绝美的光影效果，唯美的天空，',
    imagePromptSuffix: '，Your Name style，Weathering with You，beautiful detailed sky，lens flare，超精细唯美背景，光线穿透云层，细腻的云彩，golden hour lighting，极致的光影美感，Kimi no Na wa',
    videoPromptPrefix: '新海诚动画风格，唯美光影，Makoto Shinkai，',
    videoPromptSuffix: '，Shinkai style animation，beautiful lighting，detailed backgrounds，romantic atmosphere',
    characterPromptTemplate: '【新海诚风格角色】Makoto Shinkai style character，{description}，精致细腻的面部，自然的光影效果，青春浪漫的气息，唯美的画风',
    negativePrompt: '粗糙，低质量，3D渲染，rough，low quality，3d render，simple background',
  },
  {
    id: 'special_shanghai_classic',
    name: '上海美术电影制片厂',
    category: 'special',
    subType: 'shanghai_classic',
    description: '经典中国动画风格，如《大闹天宫》《哪吒闹海》',
    imagePromptPrefix: '【必须是中国传统动画风格】Chinese traditional animation style，Shanghai Animation Film Studio，水墨画元素，民族风格，工笔重彩，',
    imagePromptSuffix: '，classic Chinese animation，传统国画美术，工笔画风格，京剧脸谱元素，中国传统配色，大闹天宫风格，哪吒闹海风格，敦煌壁画风格',
    videoPromptPrefix: '中国经典动画，传统美术风格，Shanghai Animation，',
    videoPromptSuffix: '，Chinese traditional animation，ink wash elements，classic Chinese art',
    characterPromptTemplate: '【中国传统动画角色】classic Chinese animation character，{description}，传统中国造型设计，可能有京剧或戏曲元素，中国古典美学，工笔画风格人物',
    negativePrompt: '日式动画，3D，西方卡通，Japanese anime，3d，western cartoon，realistic',
  },
  {
    id: 'special_disney_classic',
    name: '经典迪士尼',
    category: 'special',
    subType: 'disney_classic',
    description: '经典迪士尼2D动画风格',
    imagePromptPrefix: '【必须是经典迪士尼风格】classic Disney animation style，Disney princess style，华丽流畅的2D动画，',
    imagePromptSuffix: '，Disney animation，flowing animation，expressive characters，魔幻童话色彩，classic Disney movie，Snow White style，Cinderella style，beautiful animation',
    videoPromptPrefix: '迪士尼经典动画风格，Disney classic，',
    videoPromptSuffix: '，classic Disney animation，fluid movement，magical',
    characterPromptTemplate: '【经典迪士尼风格角色】classic Disney character，{description}，优雅夸张但协调的特征，极富表现力的动作，经典迪士尼公主或王子造型，魔幻童话气质',
    negativePrompt: '3D，写实，日式动画，3d render，realistic，Japanese anime，modern style',
  },
  {
    id: 'special_pixar',
    name: '皮克斯风格',
    category: 'special',
    subType: 'pixar',
    description: '皮克斯3D动画风格，温暖有爱',
    imagePromptPrefix: '【必须是皮克斯风格】Pixar animation style，Pixar movie，温暖治愈的3D渲染，高品质3D动画，',
    imagePromptSuffix: '，Pixar style，high quality 3D animation，expressive characters，温馨感人，精致的光影渲染，Toy Story style，Finding Nemo style，Inside Out style，heartwarming',
    videoPromptPrefix: '皮克斯动画风格，温暖的3D动画，Pixar，',
    videoPromptSuffix: '，Pixar animation，heartwarming，beautiful 3D，emotional',
    characterPromptTemplate: '【皮克斯风格角色】Pixar style character，{description}，卡通化但有质感的3D造型，圆润可爱的大眼睛，富有情感的表情，皮克斯特有的人物魅力',
    negativePrompt: '2D，写实，恐怖，flat 2D，realistic，horror，scary，dark',
  },
  {
    id: 'special_ghibli',
    name: '吉卜力通用',
    category: 'special',
    subType: 'ghibli',
    description: '吉卜力工作室通用风格',
    imagePromptPrefix: '【必须是吉卜力风格】Studio Ghibli style，手绘动画风格，温暖治愈的画面，',
    imagePromptSuffix: '，Ghibli animation，hand-painted，温暖的色彩，细腻精美的背景，自然与幻想的融合，治愈系，Ghibli movie，anime masterpiece',
    videoPromptPrefix: '吉卜力动画，手绘风格，Ghibli，',
    videoPromptSuffix: '，Ghibli animation style，warm colors，healing，magical',
    characterPromptTemplate: '【吉卜力风格角色】Ghibli style character，{description}，简洁温暖的设计，有灵气的眼神，自然可爱的表情，吉卜力特有的人物魅力',
    negativePrompt: '3D，写实，暗黑风格，3d render，realistic，dark style，horror',
  },
  {
    id: 'special_cyberpunk',
    name: '赛博朋克',
    category: 'special',
    subType: 'cyberpunk',
    description: '赛博朋克风格，霓虹灯，高科技低生活',
    imagePromptPrefix: '【必须是赛博朋克风格】cyberpunk style，Blade Runner style，霓虹灯光，未来废土，',
    imagePromptSuffix: '，cyberpunk aesthetic，neon lights，rain soaked streets，高对比度，紫色和青色霓虹，未来废土城市，Cyberpunk 2077 style，dystopian future，high tech low life',
    videoPromptPrefix: '赛博朋克，霓虹城市，cyberpunk，',
    videoPromptSuffix: '，cyberpunk，neon lights，futuristic dystopia，Blade Runner',
    characterPromptTemplate: '【赛博朋克风格角色】cyberpunk character，{description}，可能有机械改造或义体，霓虹色调的光影，未来感朋克装扮，赛博朋克美学',
    negativePrompt: '田园，古代，温暖明亮，pastoral，ancient，bright cheerful，medieval，fantasy',
  },
  {
    id: 'special_noir',
    name: '黑色电影',
    category: 'special',
    subType: 'noir',
    description: '黑色电影风格，高对比度，神秘氛围',
    imagePromptPrefix: '【必须是黑色电影风格】film noir style，classic noir，高对比度黑白，戏剧性光影，',
    imagePromptSuffix: '，film noir，dramatic shadows，mysterious atmosphere，烟雾缭绕，百叶窗光影，black and white，high contrast，1940s noir，detective story aesthetic',
    videoPromptPrefix: '黑色电影，高对比度，film noir，',
    videoPromptSuffix: '，film noir，dramatic lighting，shadows，mysterious，classic noir',
    characterPromptTemplate: '【黑色电影风格角色】film noir character，{description}，神秘阴郁的气质，可能穿风衣戴礼帽，面孔半隐于阴影中，经典黑色电影人物形象',
    negativePrompt: '明亮，彩色，卡通，bright，colorful，cartoon，anime，cheerful',
  },
  {
    id: 'special_wes_anderson',
    name: '韦斯·安德森',
    category: 'special',
    subType: 'wes_anderson',
    description: '韦斯·安德森风格，对称构图，糖果色调',
    imagePromptPrefix: '【必须是韦斯·安德森风格】Wes Anderson style，完美对称构图，糖果色马卡龙色调，',
    imagePromptSuffix: '，Wes Anderson aesthetic，pastel colors，perfectly symmetrical composition，复古柔和色调，精心设计的场景，Grand Budapest Hotel style，quirky，vintage aesthetic，whimsical',
    videoPromptPrefix: '韦斯·安德森电影风格，对称构图，Wes Anderson，',
    videoPromptSuffix: '，Wes Anderson style，symmetry，pastel palette，quirky，vintage',
    characterPromptTemplate: '【韦斯·安德森风格角色】Wes Anderson style character，{description}，复古精致的装扮，独特古怪的造型，略带古怪的气质，马卡龙色系服装',
    negativePrompt: '混乱，不对称，灰暗，chaotic，asymmetric，dark，gloomy，modern casual',
  },
];

// 按类别分组的风格
export const STYLE_CATEGORIES = {
  animation: {
    name: '动画',
    styles: STYLE_CONFIGS.filter(s => s.category === 'animation'),
  },
  live_action: {
    name: '真人',
    styles: STYLE_CONFIGS.filter(s => s.category === 'live_action'),
  },
  special: {
    name: '特定风格',
    styles: STYLE_CONFIGS.filter(s => s.category === 'special'),
  },
};

/**
 * 根据ID获取风格配置
 */
export function getStyleConfig(styleId: string): StyleConfig | null {
  return STYLE_CONFIGS.find(s => s.id === styleId) || null;
}

/**
 * 获取默认风格
 */
export function getDefaultStyleId(): StyleId {
  return 'animation_anime_2d';
}

/**
 * 将风格应用到图片生成提示词
 */
export function applyStyleToImagePrompt(prompt: string, styleId: string): string {
  const style = getStyleConfig(styleId);
  if (!style) return prompt;

  return `${style.imagePromptPrefix}${prompt}${style.imagePromptSuffix}`;
}

/**
 * 将风格应用到视频生成提示词
 */
export function applyStyleToVideoPrompt(prompt: string, styleId: string): string {
  const style = getStyleConfig(styleId);
  if (!style) return prompt;

  return `${style.videoPromptPrefix}${prompt}${style.videoPromptSuffix}`;
}

/**
 * 将风格应用到角色外貌描述
 */
export function applyStyleToCharacterDescription(description: string, styleId: string): string {
  const style = getStyleConfig(styleId);
  if (!style) return description;

  return style.characterPromptTemplate.replace('{description}', description);
}

/**
 * 获取风格的负面提示词
 */
export function getStyleNegativePrompt(styleId: string): string {
  const style = getStyleConfig(styleId);
  return style?.negativePrompt || '';
}

/**
 * 获取所有可用风格列表（用于前端选择）
 */
export function getAllStyles(): Array<{
  id: string;
  name: string;
  category: StyleCategory;
  categoryName: string;
  description: string;
}> {
  return STYLE_CONFIGS.map(style => ({
    id: style.id,
    name: style.name,
    category: style.category,
    categoryName: STYLE_CATEGORIES[style.category].name,
    description: style.description,
  }));
}
