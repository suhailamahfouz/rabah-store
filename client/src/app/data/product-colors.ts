export interface ProductColor { hex: string; name: { ar: string; en: string }; }
const color = (hex: string, ar: string, en: string): ProductColor => ({ hex, name: { ar, en } });

export const PRODUCT_COLOR_GROUPS = [
  { title: 'الألوان الأساسية والمحايدة', colors: [
    color('#111111', 'أسود', 'Black'), color('#FFFFFF', 'أبيض', 'White'),
    color('#F5F0E6', 'أوف وايت', 'Off white'), color('#F1E4CF', 'كريمي', 'Cream'),
    color('#D8BE9D', 'بيج', 'Beige'), color('#BFA89A', 'نود', 'Nude'),
    color('#A59082', 'تاوب', 'Taupe'), color('#8E9297', 'رمادي', 'Grey'),
    color('#44464B', 'فحمي', 'Charcoal'), color('#17243D', 'كحلي', 'Navy'),
    color('#805236', 'بني', 'Brown'), color('#C18A50', 'هافان', 'Tan'),
    color('#B62032', 'أحمر', 'Red'), color('#7B1637', 'نبيتي', 'Burgundy'),
    color('#2C674F', 'أخضر', 'Green'), color('#2E63AC', 'أزرق', 'Blue'),
  ] },
  { title: 'درجات عصرية وهادئة', colors: [
    color('#452B24', 'بني شوكولاتة', 'Chocolate'), color('#8A6250', 'موكا', 'Mocha'),
    color('#C9A99B', 'لاتيه', 'Latte'), color('#941F3A', 'كرزي', 'Cherry'),
    color('#F4AFC1', 'بيبي بينك', 'Baby pink'), color('#FF7FA4', 'وردي', 'Pink'),
    color('#D91969', 'فوشيا', 'Fuchsia'), color('#B47D8A', 'روز ترابي', 'Dusty rose'),
    color('#C8B2DC', 'لافندر', 'Lavender'), color('#69416F', 'موف', 'Mauve'),
    color('#A9C7DF', 'أزرق سماوي', 'Sky blue'), color('#4D718B', 'أزرق جينز', 'Denim'),
    color('#00AFB0', 'تركواز', 'Turquoise'), color('#A8B7A0', 'سيج', 'Sage'),
    color('#B8C997', 'فستقي', 'Pistachio'), color('#71774B', 'زيتوني', 'Olive'),
    color('#F0E3A0', 'أصفر زبدة', 'Butter yellow'), color('#E4B744', 'مستردة', 'Mustard'),
    color('#E88C50', 'برتقالي', 'Orange'), color('#C85C2B', 'طوبي', 'Terracotta'),
    color('#D7B66E', 'ذهبي', 'Gold'), color('#BFC3C7', 'فضي', 'Silver'),
    color('#BE8B7D', 'روز جولد', 'Rose gold'), color('#94703D', 'برونزي', 'Bronze'),
  ] },
];
