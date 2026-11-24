const keys = 'language cabinet logoAdd logoEdit demo titleA titleB food drinks alcohol sections display previous next open back photo ingredients empty notFound close signIn signOut allCabinets openCabinet openMenu logo'.split(' ');

function language(name,values,direction='ltr') {
  const entries=values.split('|');
  if (entries.length!==keys.length) throw new Error('Incomplete translation: '+name);
  return {name,direction,strings:Object.fromEntries(keys.map((key,index)=>[key,entries[index]]))};
}

export const languages = {
  ru: language('Русский','Язык|Кабинет|Добавить логотип|Изменить логотип|Демо-меню|Наше|электронное меню|Блюда|Напитки|Алкоголь|Разделы меню|Витрина меню|Предыдущая позиция|Следующая позиция|Открыть|Вернуться в меню|Фото с указателями на ингредиенты|Ингредиенты|В этом разделе пока нет позиций|Позиция не найдена|Закрыть|Войти через Google|Выйти|Все кабинеты|Открыть кабинет|Открыть меню|Логотип'),
  uz: language('Oʻzbekcha','Til|Kabinet|Logotip qoʻshish|Logotipni oʻzgartirish|Namuna menyusi|Bizning|elektron menyumiz|Taomlar|Ichimliklar|Alkogolli ichimliklar|Menyu boʻlimlari|Menyu vitrinası|Oldingi taom yoki ichimlik|Keyingi taom yoki ichimlik|Ochish|Menyuga qaytish|Masalliqlar koʻrsatilgan surat|Masalliqlar|Bu boʻlim hozircha boʻsh|Menyu bandi topilmadi|Yopish|Google orqali kirish|Chiqish|Barcha kabinetlar|Kabinetni ochish|Menyuni ochish|Logotip'),
  en: language('English','Language|Dashboard|Add logo|Change logo|Demo menu|Our|digital menu|Food|Drinks|Alcohol|Menu categories|Menu showcase|Previous item|Next item|Open|Back to menu|Photo with ingredient labels|Ingredients|This category is empty|Item not found|Close|Sign in with Google|Sign out|All dashboards|Open dashboard|Open menu|Logo'),
  it: language('Italiano','Lingua|Area riservata|Aggiungi logo|Cambia logo|Menu dimostrativo|Il nostro|menu digitale|Piatti|Bevande|Alcolici|Categorie del menu|Vetrina del menu|Voce precedente|Voce successiva|Apri|Torna al menu|Foto con indicazioni degli ingredienti|Ingredienti|Questa categoria è vuota|Voce non trovata|Chiudi|Accedi con Google|Esci|Tutte le aree riservate|Apri area riservata|Apri menu|Logo'),
  es: language('Español','Idioma|Panel|Añadir logotipo|Cambiar logotipo|Menú de demostración|Nuestro|menú digital|Platos|Bebidas|Bebidas alcohólicas|Categorías del menú|Galería del menú|Elemento anterior|Elemento siguiente|Abrir|Volver al menú|Foto con etiquetas de ingredientes|Ingredientes|Esta categoría está vacía|Elemento no encontrado|Cerrar|Iniciar sesión con Google|Cerrar sesión|Todos los paneles|Abrir panel|Abrir menú|Logotipo'),
  fr: language('Français','Langue|Espace de gestion|Ajouter un logo|Modifier le logo|Menu de démonstration|Notre|menu numérique|Plats|Boissons|Boissons alcoolisées|Catégories du menu|Vitrine du menu|Article précédent|Article suivant|Ouvrir|Retour au menu|Photo avec ingrédients indiqués|Ingrédients|Cette catégorie est vide|Article introuvable|Fermer|Se connecter avec Google|Se déconnecter|Tous les espaces de gestion|Ouvrir l’espace de gestion|Ouvrir le menu|Logo'),
  de: language('Deutsch','Sprache|Verwaltung|Logo hinzufügen|Logo ändern|Demo-Speisekarte|Unsere|digitale Speisekarte|Gerichte|Getränke|Alkoholische Getränke|Menükategorien|Menügalerie|Vorheriger Eintrag|Nächster Eintrag|Öffnen|Zurück zur Speisekarte|Foto mit Zutatenhinweisen|Zutaten|Diese Kategorie ist leer|Eintrag nicht gefunden|Schließen|Mit Google anmelden|Abmelden|Alle Verwaltungsbereiche|Verwaltung öffnen|Speisekarte öffnen|Logo'),
  pt: language('Português','Idioma|Painel|Adicionar logótipo|Alterar logótipo|Menu de demonstração|O nosso|menu digital|Pratos|Bebidas|Bebidas alcoólicas|Categorias do menu|Galeria do menu|Item anterior|Item seguinte|Abrir|Voltar ao menu|Foto com indicações dos ingredientes|Ingredientes|Esta categoria está vazia|Item não encontrado|Fechar|Iniciar sessão com Google|Terminar sessão|Todos os painéis|Abrir painel|Abrir menu|Logótipo'),
  tr: language('Türkçe','Dil|Yönetim paneli|Logo ekle|Logoyu değiştir|Örnek menü|Dijital|menümüz|Yemekler|İçecekler|Alkollü içecekler|Menü kategorileri|Menü vitrini|Önceki öğe|Sonraki öğe|Aç|Menüye dön|Malzemelerin işaretlendiği fotoğraf|Malzemeler|Bu kategori boş|Öğe bulunamadı|Kapat|Google ile giriş yap|Çıkış yap|Tüm paneller|Paneli aç|Menüyü aç|Logo'),
  kk: language('Қазақша','Тіл|Жеке кабинет|Логотип қосу|Логотипті өзгерту|Үлгі мәзір|Біздің|электрондық мәзіріміз|Тағамдар|Сусындар|Алкогольді сусындар|Мәзір бөлімдері|Мәзір көрмесі|Алдыңғы позиция|Келесі позиция|Ашу|Мәзірге оралу|Ингредиенттері көрсетілген фото|Ингредиенттер|Бұл бөлім бос|Позиция табылмады|Жабу|Google арқылы кіру|Шығу|Барлық кабинеттер|Кабинетті ашу|Мәзірді ашу|Логотип'),
  ky: language('Кыргызча','Тил|Жеке кабинет|Логотип кошуу|Логотипти өзгөртүү|Үлгү меню|Биздин|электрондук менюбуз|Тамактар|Суусундуктар|Алкоголдук суусундуктар|Меню бөлүмдөрү|Меню көргөзмөсү|Мурунку позиция|Кийинки позиция|Ачуу|Менюга кайтуу|Ингредиенттери көрсөтүлгөн сүрөт|Ингредиенттер|Бул бөлүм бош|Позиция табылган жок|Жабуу|Google аркылуу кирүү|Чыгуу|Бардык кабинеттер|Кабинетти ачуу|Менюну ачуу|Логотип'),
  tg: language('Тоҷикӣ','Забон|Ҳуҷраи корӣ|Иловаи тамға|Тағйири тамға|Менюи намунавӣ|Менюи электронии|мо|Хӯрокҳо|Нӯшокиҳо|Нӯшокиҳои спиртӣ|Бахшҳои меню|Намоиши меню|Мавқеи пешина|Мавқеи навбатӣ|Кушодан|Бозгашт ба меню|Акс бо нишонаҳои таркиб|Таркиб|Ин бахш холӣ аст|Мавқеъ ёфт нашуд|Пӯшидан|Воридшавӣ тавассути Google|Баромадан|Ҳамаи ҳуҷраҳо|Кушодани ҳуҷра|Кушодани меню|Тамға'),
  az: language('Azərbaycanca','Dil|İdarəetmə paneli|Loqo əlavə et|Loqonu dəyiş|Nümunə menyu|Elektron|menyumuz|Yeməklər|İçkilər|Alkoqollu içkilər|Menyu kateqoriyaları|Menyu vitrini|Əvvəlki seçim|Növbəti seçim|Aç|Menyuya qayıt|İnqrediyentləri işarələnmiş foto|İnqrediyentlər|Bu bölmə boşdur|Menyu mövqeyi tapılmadı|Bağla|Google ilə daxil ol|Çıxış|Bütün panellər|Paneli aç|Menyunu aç|Loqo'),
  ar: language('العربية','اللغة|لوحة الإدارة|إضافة شعار|تغيير الشعار|قائمة تجريبية|قائمتنا|الإلكترونية|الأطباق|المشروبات|المشروبات الكحولية|أقسام القائمة|عرض القائمة|العنصر السابق|العنصر التالي|فتح|العودة إلى القائمة|صورة مع أسماء المكونات|المكونات|هذا القسم فارغ|العنصر غير موجود|إغلاق|تسجيل الدخول باستخدام Google|تسجيل الخروج|جميع لوحات الإدارة|فتح لوحة الإدارة|فتح القائمة|الشعار','rtl'),
  zh: language('简体中文','语言|管理后台|添加标志|更换标志|示例菜单|我们的|电子菜单|菜品|饮品|酒类|菜单分类|菜单展示|上一项|下一项|打开|返回菜单|标注配料的照片|配料|此分类暂无内容|未找到该项目|关闭|使用 Google 登录|退出登录|所有管理面板|打开管理面板|打开菜单|标志'),
  ja: language('日本語','言語|管理画面|ロゴを追加|ロゴを変更|デモメニュー|当店の|デジタルメニュー|料理|ドリンク|お酒|メニューのカテゴリー|メニュー一覧|前の項目|次の項目|開く|メニューに戻る|材料を示した写真|材料|このカテゴリーは空です|項目が見つかりません|閉じる|Google でログイン|ログアウト|すべての管理画面|管理画面を開く|メニューを開く|ロゴ'),
  ko: language('한국어','언어|관리 화면|로고 추가|로고 변경|데모 메뉴|우리의|디지털 메뉴|요리|음료|주류|메뉴 카테고리|메뉴 갤러리|이전 항목|다음 항목|열기|메뉴로 돌아가기|재료가 표시된 사진|재료|이 카테고리는 비어 있습니다|항목을 찾을 수 없습니다|닫기|Google로 로그인|로그아웃|모든 관리 화면|관리 화면 열기|메뉴 열기|로고'),
  hi: language('हिन्दी','भाषा|डैशबोर्ड|लोगो जोड़ें|लोगो बदलें|नमूना मेन्यू|हमारा|डिजिटल मेन्यू|व्यंजन|पेय|मादक पेय|मेन्यू की श्रेणियाँ|मेन्यू प्रदर्शनी|पिछला आइटम|अगला आइटम|खोलें|मेन्यू पर लौटें|सामग्री के संकेतों वाली फ़ोटो|सामग्री|इस श्रेणी में कोई आइटम नहीं है|आइटम नहीं मिला|बंद करें|Google से साइन इन करें|साइन आउट करें|सभी डैशबोर्ड|डैशबोर्ड खोलें|मेन्यू खोलें|लोगो'),
  uk: language('Українська','Мова|Кабінет|Додати логотип|Змінити логотип|Демо-меню|Наше|електронне меню|Страви|Напої|Алкоголь|Розділи меню|Вітрина меню|Попередня позиція|Наступна позиція|Відкрити|Повернутися до меню|Фото з позначками інгредієнтів|Інгредієнти|У цьому розділі поки немає позицій|Позицію не знайдено|Закрити|Увійти через Google|Вийти|Усі кабінети|Відкрити кабінет|Відкрити меню|Логотип'),
  pl: language('Polski','Język|Panel|Dodaj logo|Zmień logo|Menu demonstracyjne|Nasze|cyfrowe menu|Dania|Napoje|Alkohole|Kategorie menu|Galeria menu|Poprzednia pozycja|Następna pozycja|Otwórz|Wróć do menu|Zdjęcie z oznaczonymi składnikami|Składniki|Ta kategoria jest pusta|Nie znaleziono pozycji|Zamknij|Zaloguj się przez Google|Wyloguj się|Wszystkie panele|Otwórz panel|Otwórz menu|Logo')
};

const sectionKeys='hot grill soups salads cold-starters hot-starters pizza sides toppings dairy desserts'.split(' ');
const sectionLabels={
  uz:'Issiq taomlar|Mangaldagi taomlar|Shoʻrvalar|Salatlar|Sovuq gazaklar|Issiq gazaklar|Pitsa|Garnirlar|Toppinglar|Sut mahsulotlari|Shirinliklar',
  en:'Hot dishes|Grilled dishes|Soups|Salads|Cold starters|Hot starters|Pizza|Side dishes|Toppings|Dairy products|Desserts',
  it:'Piatti caldi|Piatti alla griglia|Zuppe|Insalate|Antipasti freddi|Antipasti caldi|Pizza|Contorni|Condimenti|Latticini|Dolci',
  es:'Platos calientes|Platos a la parrilla|Sopas|Ensaladas|Entrantes fríos|Entrantes calientes|Pizza|Guarniciones|Extras|Lácteos|Postres',
  fr:'Plats chauds|Grillades|Soupes|Salades|Entrées froides|Entrées chaudes|Pizzas|Accompagnements|Suppléments|Produits laitiers|Desserts',
  de:'Warme Gerichte|Grillgerichte|Suppen|Salate|Kalte Vorspeisen|Warme Vorspeisen|Pizza|Beilagen|Extras|Milchprodukte|Desserts',
  pt:'Pratos quentes|Grelhados|Sopas|Saladas|Entradas frias|Entradas quentes|Pizza|Acompanhamentos|Extras|Laticínios|Sobremesas',
  tr:'Sıcak yemekler|Izgaralar|Çorbalar|Salatalar|Soğuk başlangıçlar|Sıcak başlangıçlar|Pizza|Garnitürler|Ek malzemeler|Süt ürünleri|Tatlılar',
  kk:'Ыстық тағамдар|Мангалдағы тағамдар|Сорпалар|Салаттар|Салқын тіскебасарлар|Ыстық тіскебасарлар|Пицца|Гарнирлер|Қоспалар|Сүт өнімдері|Десерттер',
  ky:'Ысык тамактар|Мангалдагы тамактар|Шорполор|Салаттар|Муздак закускалар|Ысык закускалар|Пицца|Гарнирлер|Кошумчалар|Сүт азыктары|Десерттер',
  tg:'Таомҳои гарм|Таомҳои мангалӣ|Шӯрбоҳо|Хӯришҳо|Газакҳои хунук|Газакҳои гарм|Питса|Гарнирҳо|Иловаҳо|Маҳсулоти ширӣ|Шириниҳо',
  az:'İsti yeməklər|Manqal yeməkləri|Şorbalar|Salatlar|Soyuq qəlyanaltılar|İsti qəlyanaltılar|Pizza|Qarnirlər|Əlavələr|Süd məhsulları|Desertlər',
  ar:'أطباق ساخنة|مشاوي|شوربات|سلطات|مقبلات باردة|مقبلات ساخنة|بيتزا|أطباق جانبية|إضافات|منتجات الألبان|حلويات',
  zh:'热菜|烧烤|汤品|沙拉|冷前菜|热前菜|披萨|配菜|加料|乳制品|甜点',
  ja:'温かい料理|グリル料理|スープ|サラダ|冷たい前菜|温かい前菜|ピザ|付け合わせ|トッピング|乳製品|デザート',
  ko:'따뜻한 요리|그릴 요리|수프|샐러드|차가운 전채|따뜻한 전채|피자|곁들임 요리|토핑|유제품|디저트',
  hi:'गरम व्यंजन|ग्रिल्ड व्यंजन|सूप|सलाद|ठंडे स्टार्टर|गरम स्टार्टर|पिज़्ज़ा|साइड डिश|टॉपिंग|दुग्ध उत्पाद|मिठाइयाँ',
  uk:'Гарячі страви|Страви на мангалі|Супи|Салати|Холодні закуски|Гарячі закуски|Піца|Гарніри|Топінги|Молочні продукти|Десерти',
  pl:'Dania na ciepło|Dania z grilla|Zupy|Sałatki|Zimne przystawki|Gorące przystawki|Pizza|Dodatki do dań|Dodatki|Nabiał|Desery'
};

export const sectionTranslations=Object.fromEntries(Object.entries(sectionLabels).map(([code,labels])=>{
  const names=labels.split('|');
  if (names.length!==sectionKeys.length) throw new Error('Incomplete menu sections: '+code);
  return [code,Object.fromEntries(sectionKeys.map((key,index)=>[key,names[index]]))];
}));

export const nutritionLabels={
  ru:['Пищевая ценность','Калории','Белки','Жиры','Углеводы','ккал'],
  uz:['Ozuqaviy qiymati','Kaloriya','Oqsillar','Yogʻlar','Uglevodlar','kkal'],
  en:['Nutrition','Calories','Protein','Fat','Carbohydrates','kcal'],
  it:['Valori nutrizionali','Calorie','Proteine','Grassi','Carboidrati','kcal'],
  es:['Información nutricional','Calorías','Proteínas','Grasas','Carbohidratos','kcal'],
  fr:['Valeurs nutritionnelles','Calories','Protéines','Lipides','Glucides','kcal'],
  de:['Nährwerte','Kalorien','Eiweiß','Fett','Kohlenhydrate','kcal'],
  pt:['Informação nutricional','Calorias','Proteínas','Gorduras','Carboidratos','kcal'],
  tr:['Besin değeri','Kalori','Protein','Yağ','Karbonhidrat','kcal'],
  kk:['Тағамдық құндылығы','Калория','Ақуыздар','Майлар','Көмірсулар','ккал'],
  ky:['Азыктык баалуулугу','Калория','Белоктор','Майлар','Углеводдор','ккал'],
  tg:['Арзиши ғизоӣ','Калория','Сафедаҳо','Равғанҳо','Карбогидратҳо','ккал'],
  az:['Qida dəyəri','Kalori','Zülallar','Yağlar','Karbohidratlar','kkal'],
  ar:['القيمة الغذائية','السعرات الحرارية','البروتين','الدهون','الكربوهيدرات','كيلوكالوري'],
  zh:['营养成分','热量','蛋白质','脂肪','碳水化合物','千卡'],
  ja:['栄養成分','エネルギー','たんぱく質','脂質','炭水化物','kcal'],
  ko:['영양 정보','열량','단백질','지방','탄수화물','kcal'],
  hi:['पोषण मूल्य','कैलोरी','प्रोटीन','वसा','कार्बोहाइड्रेट','किलो कैलोरी'],
  uk:['Поживна цінність','Калорії','Білки','Жири','Вуглеводи','ккал'],
  pl:['Wartość odżywcza','Kalorie','Białko','Tłuszcz','Węglowodany','kcal']
};
