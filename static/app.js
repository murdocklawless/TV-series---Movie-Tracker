const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

let favGenres = new Set();
let favActors = new Map();

const HEART_SVG = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`;

const CHECK_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

const FILM_SVG = `<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="7" y1="3" x2="7" y2="21"></line><line x1="17" y1="3" x2="17" y2="21"></line><line x1="3" y1="7" x2="21" y2="7"></line><line x1="3" y1="17" x2="21" y2="17"></line></svg>`;

window.noPosterFallback = function () {
  return `<div class="no-poster">${FILM_SVG}</div>`;
};

let currentLang = "tr";
const I18N = {
  app_title: { tr: "Takip Listesi", en: "Watchlist", de: "Watchlist", fr: "Ma liste", es: "Mi lista", it: "Watchlist", ru: "Список просмотра", ar: "قائمة المشاهدة", pt: "Minha lista", nl: "Watchlist", pl: "Lista śledzenia", ja: "ウォッチリスト", ko: "시청 목록", zh: "观看列表" },
  logo_title: { tr: "Dizi · Film · Anime Takip", en: "TV · Movie · Anime Tracker", de: "Serien · Film · Anime Tracker", fr: "Suivi Séries · Films · Anime", es: "Seguimiento Series · Pelis · Anime", it: "Tracker Serie · Film · Anime", ru: "Трекер сериалов · фильмов · аниме", ar: "متابعة المسلسلات · الأفلام · الأنمي", pt: "Acompanhamento Séries · Filmes · Anime", nl: "Serie · Film · Anime Tracker", pl: "Śledzenie seriali · filmów · anime", ja: "ドラマ・映画・アニメ追跡", ko: "드라마·영화·애니메 추적", zh: "剧集·电影·动漫追踪" },
  tab_followed: { tr: "Dizi & Film", en: "Shows & Movies", de: "Serien & Filme", fr: "Séries & Films", es: "Series y Películas", it: "Serie e Film", ru: "Сериалы и фильмы", ar: "مسلسلات وأفلام", pt: "Séries e Filmes", nl: "Series en Films", pl: "Seriale i filmy", ja: "アニメと映画", ko: "시리즈 및 영화", zh: "剧集和电影" },
  tab_search: { tr: "Ara & Ekle", en: "Search & Add", de: "Suchen & Hinzufügen", fr: "Rechercher & Ajouter", es: "Buscar & Añadir", it: "Cerca & Aggiungi", ru: "Поиск и добавление", ar: "بحث وإضافة", pt: "Pesquisar & Adicionar", nl: "Zoeken & Toevoegen", pl: "Szukaj i dodaj", ja: "検索と追加", ko: "검색 및 추가", zh: "搜索和添加" },
  tab_anime: { tr: "Anime", en: "Anime", de: "Anime", fr: "Anime", es: "Anime", it: "Anime", ru: "Аниме", ar: "أنمي", pt: "Anime", nl: "Anime", pl: "Anime", ja: "アニメ", ko: "애니메", zh: "动漫" },
  anime_placeholder: { tr: "Anime ara...", en: "Search anime...", de: "Anime suchen...", fr: "Rechercher un anime...", es: "Buscar anime...", it: "Cerca anime...", ru: "Поиск аниме...", ar: "ابحث عن أنمي...", pt: "Pesquisar anime...", nl: "Anime zoeken...", pl: "Szukaj anime...", ja: "アニメを検索...", ko: "애니메 검색...", zh: "搜索动漫..." },
  anime_empty_1: { tr: "Henüz takip ettiğiniz anime yok.", en: "No anime in your list yet.", de: "Noch kein Anime in Ihrer Liste.", fr: "Aucun anime dans votre liste pour l'instant.", es: "Aún no hay anime en tu lista.", it: "Non c'è ancora nessun anime nella tua lista.", ru: "В вашем списке пока нет аниме.", ar: "لا يوجد أنمي في قائمتك بعد.", pt: "Nenhum anime na sua lista ainda.", nl: "Nog geen anime in uw lijst.", pl: "Na razie nie masz anime na liście.", ja: "リストにはまだアニメがありません。", ko: "목록에 아직 애니메가 없습니다.", zh: "列表中还没有动漫。" },
  anime_empty_2: { tr: "Yayınlanmasını istediğiniz animeleri arayın ve ekleyin.", en: "Search and add the anime you want to track.", de: "Suchen Sie das Anime, das Sie verfolgen möchten.", fr: "Recherchez et ajoutez l'anime que vous voulez suivre.", es: "Busca y añade el anime que quieras seguir.", it: "Cerca e aggiungi l'anime che vuoi seguire.", ru: "Найдите и добавьте аниме, за которым хотите следить.", ar: "ابحث وأضف الأنمي الذي تريد متابعته.", pt: "Pesquise e adicione o anime que deseja acompanhar.", nl: "Zoek en voeg de anime toe die u wilt volgen.", pl: "Znajdź i dodaj anime, które chcesz śledzić.", ja: "追跡したいアニメを検索して追加してください。", ko: "추적하고 싶은 애니메를 검색해 추가하세요.", zh: "搜索并添加您想关注的动漫。" },
  anime_status_releasing: { tr: "Yayında", en: "Airing", de: "Läuft", fr: "En cours", es: "En emisión", it: "In onda", ru: "Идёт", ar: "يُعرض", pt: "No ar", nl: "Wordt uitgezonden", pl: "W emisji", ja: "放送中", ko: "방영 중", zh: "播出中" },
  anime_status_finished: { tr: "Bitti", en: "Finished", de: "Abgeschlossen", fr: "Terminé", es: "Terminado", it: "Finito", ru: "Завершено", ar: "منتهي", pt: "Finalizado", nl: "Voltooid", pl: "Zakończone", ja: "完結", ko: "완결", zh: "已完结" },
  anime_status_upcoming: { tr: "Yakında", en: "Upcoming", de: "Demnächst", fr: "À venir", es: "Próximamente", it: "In arrivo", ru: "Скоро", ar: "قريبًا", pt: "Em breve", nl: "Binnenkort", pl: "Wkrótce", ja: "近日", ko: "곧", zh: "即将" },
  sort_title: { tr: "Sırala", en: "Sort", de: "Sortieren", fr: "Trier", es: "Ordenar", it: "Ordina", ru: "Сортировать", ar: "ترتيب", pt: "Ordenar", nl: "Sorteren", pl: "Sortuj", ja: "並べ替え", ko: "정렬", zh: "排序" },
  sort_added: { tr: "Ekleme sırası", en: "Recently added", de: "Zuletzt hinzugefügt", fr: "Ajoutés récemment", es: "Añadidos recientes", it: "Aggiunti di recente", ru: "Недавно добавленные", ar: "أضيف مؤخرًا", pt: "Adicionados recentemente", nl: "Recent toegevoegd", pl: "Ostatnio dodane", ja: "最近追加順", ko: "최근 추가순", zh: "最近添加" },
  sort_alpha: { tr: "Alfabetik", en: "Alphabetical", de: "Alphabetisch", fr: "Alphabétique", es: "Alfabético", it: "Alfabetico", ru: "По алфавиту", ar: "أبجدي", pt: "Alfabético", nl: "Alfabetisch", pl: "Alfabetycznie", ja: "アルファベット順", ko: "가나다순", zh: "按字母顺序" },
  sort_score: { tr: "Puana göre", en: "By score", de: "Nach Bewertung", fr: "Par note", es: "Por puntuación", it: "Per voto", ru: "По рейтингу", ar: "حسب التقييم", pt: "Por nota", nl: "Op score", pl: "Według oceny", ja: "スコア順", ko: "평점순", zh: "按评分" },
  sort_date: { tr: "Yaklaşan tarih", en: "Upcoming date", de: "Nächster Termin", fr: "Date à venir", es: "Próxima fecha", it: "Prossima data", ru: "Ближайшая дата", ar: "الموعد القادم", pt: "Próxima data", nl: "Aanstaande datum", pl: "Najbliższy termin", ja: "予定日順", ko: "다가오는 날짜순", zh: "即将上线" },
  sort_type: { tr: "Türe göre", en: "By type", de: "Nach Typ", fr: "Par type", es: "Por tipo", it: "Per tipo", ru: "По типу", ar: "حسب النوع", pt: "Por tipo", nl: "Op type", pl: "Według typu", ja: "タイプ順", ko: "유형순", zh: "按类型" },
  no_credits: { tr: "Bu oyuncunun film/dizi kaydı bulunamadı.", en: "No movie/TV credits found for this actor.", de: "Keine Film-/Serien-Credits für diesen Schauspieler gefunden.", fr: "Aucun crédit film/série trouvé pour cet acteur.", es: "No se encontraron créditos de películas/series para este actor.", it: "Nessun credito film/serie trovato per questo attore.", ru: "Актёрские работы не найдены.", ar: "لم يتم العثور على أعمال لهذا الممثل.", pt: "Nenhum trabalho de filme/série encontrado para este ator.", nl: "Geen film-/seriecredits gevonden voor deze acteur.", pl: "Nie znaleziono filmów/seriali dla tego aktora.", ja: "この俳優の映画・ドラマ作品は見つかりませんでした。", ko: "이 배우의 영화/드라마 작품을 찾을 수 없습니다.", zh: "未找到该演员的电影/剧集作品。" },
  person_char: { tr: "{char} rolünde", en: "as {char}", de: "als {char}", fr: "dans le rôle de {char}", es: "como {char}", it: "nel ruolo di {char}", ru: "в роли {char}", ar: "بدور {char}", pt: "como {char}", nl: "als {char}", pl: "jako {char}", ja: "{char} 役", ko: "{char} 역", zh: "饰演 {char}" },
  search_type_show: { tr: "Dizi & Film", en: "Shows & Movies", de: "Serien & Filme", fr: "Séries & Films", es: "Series y Películas", it: "Serie e Film", ru: "Сериалы и фильмы", ar: "مسلسلات وأفلام", pt: "Séries e Filmes", nl: "Series en Films", pl: "Seriale i filmy", ja: "アニメと映画", ko: "시리즈 및 영화", zh: "剧集和电影" },
  search_type_anime: { tr: "Anime", en: "Anime", de: "Anime", fr: "Anime", es: "Anime", it: "Anime", ru: "Аниме", ar: "أنمي", pt: "Anime", nl: "Anime", pl: "Anime", ja: "アニメ", ko: "애니메", zh: "动漫" },
  search_type_actor: { tr: "Oyuncu", en: "Actor", de: "Schauspieler", fr: "Acteur", es: "Actor", it: "Attore", ru: "Актёр", ar: "ممثل", pt: "Ator", nl: "Acteur", pl: "Aktor", ja: "俳優", ko: "배우", zh: "演员" },
  filter_actor: { tr: "Oyuncu", en: "Actor", de: "Schauspieler", fr: "Acteur", es: "Actor", it: "Attore", ru: "Актёр", ar: "ممثل", pt: "Ator", nl: "Acteur", pl: "Aktor", ja: "俳優", ko: "배우", zh: "演员" },
  filter_genre: { tr: "Tür", en: "Genre", de: "Genre", fr: "Genre", es: "Género", it: "Genere", ru: "Жанр", ar: "نوع", pt: "Gênero", nl: "Genre", pl: "Gatunek", ja: "ジャンル", ko: "장르", zh: "类型" },
  search_basic: { tr: "Ara", en: "Search", de: "Suchen", fr: "Rechercher", es: "Buscar", it: "Cerca", ru: "Поиск", ar: "بحث", pt: "Pesquisar", nl: "Zoeken", pl: "Szukaj", ja: "検索", ko: "검색", zh: "搜索" },
  search_combo: { tr: "Çoklu Ara", en: "Multi Search", de: "Multi-Suche", fr: "Recherche multiple", es: "Búsqueda múltiple", it: "Ricerca multipla", ru: "Мультипоиск", ar: "بحث متعدد", pt: "Pesquisa múltipla", nl: "Multi-zoeken", pl: "Wyszukiwanie wielokrotne", ja: "複合検索", ko: "다중 검색", zh: "多重搜索" },
  cancel: { tr: "İptal", en: "Cancel", de: "Abbrechen", fr: "Annuler", es: "Cancelar", it: "Annulla", ru: "Отмена", ar: "إلغاء", pt: "Cancelar", nl: "Annuleren", pl: "Anuluj", ja: "キャンセル", ko: "취소", zh: "取消" },
  chip_actor: { tr: "Oyuncu", en: "Actor", de: "Schauspieler", fr: "Acteur", es: "Actor", it: "Attore", ru: "Актёр", ar: "ممثل", pt: "Ator", nl: "Acteur", pl: "Aktor", ja: "俳優", ko: "배우", zh: "演员" },
  chip_genre: { tr: "Tür", en: "Genre", de: "Genre", fr: "Genre", es: "Género", it: "Genere", ru: "Жанр", ar: "نوع", pt: "Gênero", nl: "Genre", pl: "Gatunek", ja: "ジャンル", ko: "장르", zh: "类型" },
  chip_year: { tr: "Yıl", en: "Year", de: "Jahr", fr: "Année", es: "Año", it: "Anno", ru: "Год", ar: "سنة", pt: "Ano", nl: "Jaar", pl: "Rok", ja: "年", ko: "연도", zh: "年份" },
  chip_score: { tr: "Puan", en: "Score", de: "Bewertung", fr: "Note", es: "Puntuación", it: "Voto", ru: "Рейтинг", ar: "تقييم", pt: "Nota", nl: "Score", pl: "Ocena", ja: "スコア", ko: "평점", zh: "评分" },
  search_type_genre: { tr: "Tür", en: "Genre", de: "Genre", fr: "Genre", es: "Género", it: "Genere", ru: "Жанр", ar: "نوع", pt: "Gênero", nl: "Genre", pl: "Gatunek", ja: "ジャンル", ko: "장르", zh: "类型" },
  search_type_fav_actor: { tr: "Favori Oyuncu", en: "Favorite Actor", de: "Lieblingsschauspieler", fr: "Acteur favori", es: "Actor favorito", it: "Attore preferito", ru: "Любимый актёр", ar: "ممثل مفضل", pt: "Ator favorito", nl: "Favoriete acteur", pl: "Ulubiony aktor", ja: "お気に入りの俳優", ko: "즐겨찾는 배우", zh: "最喜欢的演员" },
  search_type_fav_genre: { tr: "Favori Tür", en: "Favorite Genre", de: "Lieblingsgenre", fr: "Genre favori", es: "Género favorito", it: "Genere preferito", ru: "Любимый жанр", ar: "نوع مفضل", pt: "Gênero favorito", nl: "Favoriete genre", pl: "Ulubiony gatunek", ja: "お気に入りのジャンル", ko: "즐겨찾는 장르", zh: "最喜欢的类型" },
  search_type_year: { tr: "Yıl", en: "Year", de: "Jahr", fr: "Année", es: "Año", it: "Anno", ru: "Год", ar: "سنة", pt: "Ano", nl: "Jaar", pl: "Rok", ja: "年", ko: "연도", zh: "年份" },
  search_type_score: { tr: "Puan", en: "Score", de: "Bewertung", fr: "Note", es: "Puntuación", it: "Voto", ru: "Рейтинг", ar: "تقييم", pt: "Nota", nl: "Score", pl: "Ocena", ja: "スコア", ko: "평점", zh: "评分" },
  picker_add: { tr: "Ekle", en: "Add", de: "Hinzufügen", fr: "Ajouter", es: "Añadir", it: "Aggiungi", ru: "Добавить", ar: "إضافة", pt: "Adicionar", nl: "Toevoegen", pl: "Dodaj", ja: "追加", ko: "추가", zh: "添加" },
  picker_actor_title: { tr: "Favori Oyuncular", en: "Favorite Actors", de: "Lieblingsschauspieler", fr: "Acteurs favoris", es: "Actores favoritos", it: "Attori preferiti", ru: "Любимые актёры", ar: "الممثلون المفضلون", pt: "Atores favoritos", nl: "Favoriete acteurs", pl: "Ulubieni aktorzy", ja: "お気に入りの俳優", ko: "즐겨찾는 배우", zh: "最喜欢的演员" },
  picker_actor_search: { tr: "Oyuncu Ara", en: "Search Actor", de: "Schauspieler suchen", fr: "Rechercher un acteur", es: "Buscar actor", it: "Cerca attore", ru: "Поиск актёра", ar: "ابحث عن ممثل", pt: "Pesquisar ator", nl: "Acteur zoeken", pl: "Szukaj aktora", ja: "俳優を検索", ko: "배우 검색", zh: "搜索演员" },
  picker_fav_actor_search: { tr: "Favori Oyuncu Ara", en: "Search Favorite Actor", de: "Lieblingsschauspieler suchen", fr: "Rechercher un acteur favori", es: "Buscar actor favorito", it: "Cerca attore preferito", ru: "Поиск любимого актёра", ar: "ابحث عن ممثل مفضل", pt: "Pesquisar ator favorito", nl: "Favoriete acteur zoeken", pl: "Szukaj ulubionego aktora", ja: "お気に入りの俳優を検索", ko: "즐겨찾는 배우 검색", zh: "搜索最喜欢的演员" },
  picker_genre_title: { tr: "Favori Türler", en: "Favorite Genres", de: "Lieblingsgenres", fr: "Genres favoris", es: "Géneros favoritos", it: "Generi preferiti", ru: "Любимые жанры", ar: "الأنواع المفضلة", pt: "Gêneros favoritos", nl: "Favoriete genres", pl: "Ulubione gatunki", ja: "お気に入りのジャンル", ko: "즐겨찾는 장르", zh: "最喜欢的类型" },
  picker_genre_search: { tr: "Tür Ara", en: "Search Genre", de: "Genre suchen", fr: "Rechercher un genre", es: "Buscar género", it: "Cerca genere", ru: "Поиск жанра", ar: "ابحث عن نوع", pt: "Pesquisar gênero", nl: "Genre zoeken", pl: "Szukaj gatunku", ja: "ジャンルを検索", ko: "장르 검색", zh: "搜索类型" },
  picker_fav_genre_search: { tr: "Favori Tür Ara", en: "Search Favorite Genre", de: "Lieblingsgenre suchen", fr: "Rechercher un genre favori", es: "Buscar género favorito", it: "Cerca genere preferito", ru: "Поиск любимого жанра", ar: "ابحث عن نوع مفضل", pt: "Pesquisar gênero favorito", nl: "Favoriete genre zoeken", pl: "Szukaj ulubionego gatunku", ja: "お気に入りのジャンルを検索", ko: "즐겨찾는 장르 검색", zh: "搜索最喜欢的类型" },
  ask_title: { tr: "Nerede aransın?", en: "Where to search?", de: "Wo suchen?", fr: "Où chercher ?", es: "¿Dónde buscar?", it: "Dove cercare?", ru: "Где искать?", ar: "أين تبحث؟", pt: "Onde pesquisar?", nl: "Waar zoeken?", pl: "Gdzie szukać?", ja: "どこを検索しますか？", ko: "어디서 검색할까요?", zh: "在哪里搜索？" },
  year_placeholder: { tr: "Yıl girin (örn. 2020)", en: "Enter a year (e.g. 2020)", de: "Jahr eingeben (z.B. 2020)", fr: "Entrez une année (ex. 2020)", es: "Ingresa un año (ej. 2020)", it: "Inserisci un anno (es. 2020)", ru: "Введите год (напр. 2020)", ar: "أدخل سنة (مثال 2020)", pt: "Digite um ano (ex. 2020)", nl: "Voer een jaar in (bijv. 2020)", pl: "Wpisz rok (np. 2020)", ja: "年を入力（例：2020）", ko: "연도를 입력하세요 (예: 2020)", zh: "输入年份（例如 2020）" },
  score_placeholder: { tr: "Puan girin (örn. 7.4)", en: "Enter a score (e.g. 7.4)", de: "Bewertung eingeben (z.B. 7.4)", fr: "Entrez une note (ex. 7.4)", es: "Ingresa una puntuación (ej. 7.4)", it: "Inserisci un voto (es. 7.4)", ru: "Введите рейтинг (напр. 7.4)", ar: "أدخل تقييم (مثال 7.4)", pt: "Digite uma nota (ex. 7.4)", nl: "Voer een score in (bijv. 7.4)", pl: "Wpisz ocenę (np. 7.4)", ja: "スコアを入力（例：7.4）", ko: "평점을 입력하세요 (예: 7.4)", zh: "输入评分（例如 7.4）" },
  year_invalid: { tr: "Yıl 4 haneli ve 1900-{max} arasında olmalı (örn. 2020)", en: "Year must be 4 digits between 1900 and {max} (e.g. 2020)", de: "Jahr muss 4-stellig zwischen 1900 und {max} sein (z.B. 2020)", fr: "L'année doit avoir 4 chiffres entre 1900 et {max} (ex. 2020)", es: "El año debe tener 4 dígitos entre 1900 y {max} (ej. 2020)", it: "L'anno deve avere 4 cifre tra 1900 e {max} (es. 2020)", ru: "Год должен быть 4-значным от 1900 до {max} (напр. 2020)", ar: "يجب أن تكون السنة 4 أرقام بين 1900 و{max} (مثال 2020)", pt: "O ano deve ter 4 dígitos entre 1900 e {max} (ex. 2020)", nl: "Jaar moet 4 cijfers hebben tussen 1900 en {max} (bijv. 2020)", pl: "Rok musi mieć 4 cyfry od 1900 do {max} (np. 2020)", ja: "年は1900〜{max}の4桁で入力してください（例：2020）", ko: "연도는 1900~{max} 사이의 4자리여야 합니다 (예: 2020)", zh: "年份必须是1900到{max}之间的4位数字（例如2020）" },
  score_invalid: { tr: "Puan 7, 7.4 veya 7,4 formatında olmalı", en: "Score must be like 7, 7.4 or 7,4", de: "Bewertung muss wie 7, 7.4 oder 7,4 sein", fr: "La note doit être comme 7, 7.4 ou 7,4", es: "La puntuación debe ser como 7, 7.4 o 7,4", it: "Il voto deve essere come 7, 7.4 o 7,4", ru: "Рейтинг должен быть как 7, 7.4 или 7,4", ar: "يجب أن يكون التقييم مثل 7 أو 7.4 أو 7,4", pt: "A nota deve ser como 7, 7.4 ou 7,4", nl: "Score moet zijn zoals 7, 7.4 of 7,4", pl: "Ocena musi być jak 7, 7.4 lub 7,4", ja: "スコアは7、7.4、7,4のような形式で入力してください", ko: "평점은 7, 7.4 또는 7,4 형식이어야 합니다", zh: "评分格式应为7、7.4或7,4" },
  no_fav_actor: { tr: "Henüz favori oyuncunuz yok. Oyuncu detayında kalbe tıklayın.", en: "No favorite actors yet. Click the heart on an actor's details.", de: "Noch keine Lieblingsschauspieler. Klicken Sie auf das Herz in den Details.", fr: "Aucun acteur favori. Cliquez sur le cœur dans les détails.", es: "Aún no hay actores favoritos. Toca el corazón en los detalles.", it: "Nessun attore preferito. Tocca il cuore nei dettagli.", ru: "Нет любимых актёров. Нажмите на сердце в деталях.", ar: "لا يوجد ممثلون مفضلون بعد. اضغط على القلب في التفاصيل.", pt: "Nenhum ator favorito ainda. Toque no coração nos detalhes.", nl: "Nog geen favoriete acteurs. Klik op het hart in de details.", pl: "Brak ulubionych aktorów. Kliknij serce w szczegółach.", ja: "お気に入りの俳優がいません。詳細でハートをクリックしてください。", ko: "즐겨찾는 배우가 없습니다. 상세에서 하트를 클릭하세요.", zh: "还没有喜欢的演员。在详情中点击心形。" },
  no_fav_genre: { tr: "Henüz favori türünüz yok. Tür etiketine tıklayın.", en: "No favorite genres yet. Click a genre tag.", de: "Noch keine Lieblingsgenres. Klicken Sie auf ein Genre-Tag.", fr: "Aucun genre favori. Cliquez sur une étiquette de genre.", es: "Aún no hay géneros favoritos. Toca una etiqueta de género.", it: "Nessun genere preferito. Tocca un'etichetta di genere.", ru: "Нет любимых жанров. Нажмите на метку жанра.", ar: "لا توجد أنواع مفضلة بعد. اضغط على علامة النوع.", pt: "Nenhum gênero favorito ainda. Toque em uma etiqueta de gênero.", nl: "Nog geen favoriete genres. Klik op een genre-tag.", pl: "Brak ulubionych gatunków. Kliknij etykietę gatunku.", ja: "お気に入りのジャンルがありません。ジャンルのタグをクリックしてください。", ko: "즐겨찾는 장르가 없습니다. 장르 태그를 클릭하세요.", zh: "还没有喜欢的类型。点击类型标签。" },
  empty_1: { tr: "Henüz takip ettiğiniz bir şey yok.", en: "Nothing in your list yet.", de: "Noch nichts in Ihrer Liste.", fr: "Rien dans votre liste pour l'instant.", es: "Aún no hay nada en tu lista.", it: "Non c'è ancora nulla nella tua lista.", ru: "В вашем списке пока ничего нет.", ar: "لا يوجد شيء في قائمتك بعد.", pt: "Nada na sua lista ainda.", nl: "Nog niets in uw lijst.", pl: "Na razie nic nie masz na liście.", ja: "リストにはまだ何もありません。", ko: "아직 목록에 아무것도 없습니다.", zh: "列表中还没有任何内容。" },
  empty_2: { tr: "Yayınlanmasını istediğiniz dizi ve filmleri ekleyin.", en: "Add the shows and movies you want to track.", de: "Fügen Sie die Serien und Filme hinzu, die Sie verfolgen möchten.", fr: "Ajoutez les séries et films que vous souhaitez suivre.", es: "Añade las series y películas que quieras seguir.", it: "Aggiungi le serie e i film che vuoi seguire.", ru: "Добавьте сериалы и фильмы, за которыми хотите следить.", ar: "أضف المسلسلات والأفلام التي تريد متابعتها.", pt: "Adicione as séries e filmes que deseja acompanhar.", nl: "Voeg de series en films toe die u wilt volgen.", pl: "Dodaj seriale i filmy, które chcesz śledzić.", ja: "追跡したいドラマや映画を追加してください。", ko: "추적하고 싶은 시리즈와 영화를 추가하세요.", zh: "添加您想关注的剧集和电影。" },
  search_placeholder: { tr: "Film veya dizi ara...", en: "Search movies or shows...", de: "Filme oder Serien suchen...", fr: "Rechercher des films ou séries...", es: "Buscar películas o series...", it: "Cerca film o serie...", ru: "Поиск фильмов или сериалов...", ar: "ابحث عن أفلام أو مسلسلات...", pt: "Pesquisar filmes ou séries...", nl: "Zoek films of series...", pl: "Szukaj filmów lub seriali...", ja: "映画やドラマを検索...", ko: "영화나 시리즈 검색...", zh: "搜索电影或剧集..." },
  actor_placeholder: { tr: "Oyuncu adı girin...", en: "Enter actor name...", de: "Schauspielername eingeben...", fr: "Entrez un nom d'acteur...", es: "Ingresa nombre de actor...", it: "Inserisci nome attore...", ru: "Введите имя актёра...", ar: "أدخل اسم الممثل...", pt: "Digite o nome do ator...", nl: "Voer acteernaam in...", pl: "Wpisz nazwisko aktora...", ja: "俳優名を入力...", ko: "배우 이름 입력...", zh: "输入演员姓名..." },
  genre_placeholder: { tr: "Tür adı girin...", en: "Enter genre name...", de: "Genrenamen eingeben...", fr: "Entrez un nom de genre...", es: "Ingresa nombre de género...", it: "Inserisci nome genere...", ru: "Введите название жанра...", ar: "أدخل اسم النوع...", pt: "Digite o nome do gênero...", nl: "Voer genrenaam in...", pl: "Wpisz nazwę gatunku...", ja: "ジャンル名を入力...", ko: "장르 이름 입력...", zh: "输入类型名称..." },
  no_actor_results: { tr: "Oyuncu bulunamadı", en: "No actor found", de: "Kein Schauspieler gefunden", fr: "Aucun acteur trouvé", es: "No se encontró actor", it: "Nessun attore trovato", ru: "Актёр не найден", ar: "لم يتم العثور على ممثل", pt: "Nenhum ator encontrado", nl: "Geen acteur gevonden", pl: "Nie znaleziono aktora", ja: "俳優が見つかりません", ko: "배우를 찾을 수 없습니다", zh: "未找到演员" },
  no_genre_results: { tr: "Tür bulunamadı", en: "No genre found", de: "Kein Genre gefunden", fr: "Aucun genre trouvé", es: "No se encontró género", it: "Nessun genere trovato", ru: "Жанр не найден", ar: "لم يتم العثور على نوع", pt: "Nenhum gênero encontrado", nl: "Geen genre gevonden", pl: "Nie znaleziono gatunku", ja: "ジャンルが見つかりません", ko: "장르를 찾을 수 없습니다", zh: "未找到类型" },
  no_show_results: { tr: "Sonuç bulunamadı", en: "No results found", de: "Keine Ergebnisse gefunden", fr: "Aucun résultat trouvé", es: "No se encontraron resultados", it: "Nessun risultato trovato", ru: "Результаты не найдены", ar: "لا توجد نتائج", pt: "Nenhum resultado encontrado", nl: "Geen resultaten gevonden", pl: "Nie znaleziono wyników", ja: "結果が見つかりません", ko: "결과를 찾을 수 없습니다", zh: "未找到结果" },
  settings_title: { tr: "Ayarlar", en: "Settings", de: "Einstellungen", fr: "Paramètres", es: "Ajustes", it: "Impostazioni", ru: "Настройки", ar: "الإعدادات", pt: "Configurações", nl: "Instellingen", pl: "Ustawienia", ja: "設定", ko: "설정", zh: "设置" },
  label_tmdb: { tr: "TMDB API Key", en: "TMDB API Key", de: "TMDB-API-Schlüssel", fr: "Clé API TMDB", es: "Clave API de TMDB", it: "Chiave API TMDB", ru: "Ключ API TMDB", ar: "مفتاح TMDB API", pt: "Chave da API TMDB", nl: "TMDB API-sleutel", pl: "Klucz API TMDB", ja: "TMDB APIキー", ko: "TMDB API 키", zh: "TMDB API 密钥" },
  label_token: { tr: "Telegram Bot Token", en: "Telegram Bot Token", de: "Telegram-Bot-Token", fr: "Jeton du bot Telegram", es: "Token del bot de Telegram", it: "Token del bot Telegram", ru: "Токен бота Telegram", ar: "رمز بوت تيليجرام", pt: "Token do bot do Telegram", nl: "Telegram-bot-token", pl: "Token bota Telegram", ja: "Telegramボットトークン", ko: "텔레그램 봇 토큰", zh: "Telegram 机器人令牌" },
  label_chat: { tr: "Telegram Chat ID", en: "Telegram Chat ID", de: "Telegram-Chat-ID", fr: "ID de discussion Telegram", es: "ID de chat de Telegram", it: "ID chat Telegram", ru: "ID чата Telegram", ar: "معرف المحادثة في تيليجرام", pt: "ID do chat do Telegram", nl: "Telegram-chat-ID", pl: "ID czatu Telegram", ja: "TelegramチャットID", ko: "텔레그램 채팅 ID", zh: "Telegram 聊天 ID" },
  label_hour: { tr: "Bildirim Saati (günlük)", en: "Notification Time (daily)", de: "Benachrichtigungszeit (täglich)", fr: "Heure de notification (quotidienne)", es: "Hora de notificación (diaria)", it: "Ora di notifica (giornaliera)", ru: "Время уведомлений (ежедневно)", ar: "وقت الإشعار (يوميًا)", pt: "Horário de notificação (diário)", nl: "Meldingstijd (dagelijks)", pl: "Godzina powiadomień (codziennie)", ja: "通知時間（毎日）", ko: "알림 시간 (매일)", zh: "通知时间（每日）" },
  time_hour: { tr: "Saat", en: "Hour", de: "Stunde", fr: "Heure", es: "Hora", it: "Ora", ru: "Час", ar: "ساعة", pt: "Hora", nl: "Uur", pl: "Godzina", ja: "時間", ko: "시", zh: "时" },
  time_minute: { tr: "Dakika", en: "Minute", de: "Minute", fr: "Minute", es: "Minuto", it: "Minuto", ru: "Минута", ar: "دقيقة", pt: "Minuto", nl: "Minuut", pl: "Minuta", ja: "分", ko: "분", zh: "分" },
  label_ntfy: { tr: "ntfy Konu", en: "ntfy Topic", de: "ntfy Thema", fr: "Sujet ntfy", es: "Tema ntfy", it: "Argomento ntfy", ru: "Тема ntfy", ar: "موضوع ntfy", pt: "Tópico ntfy", nl: "ntfy onderwerp", pl: "Temat ntfy", ja: "ntfyトピック", ko: "ntfy 토픽", zh: "ntfy 主题" },
  ntfy_placeholder: { tr: "konu-adi", en: "topic-name", de: "thema-name", fr: "nom-du-sujet", es: "nombre-tema", it: "nome-argomento", ru: "имя-темы", ar: "اسم-الموضوع", pt: "nome-topico", nl: "onderwerp-naam", pl: "nazwa-tematu", ja: "トピック名", ko: "토픽 이름", zh: "主题名称" },
  label_tz: { tr: "Zaman Dilimi", en: "Time Zone", de: "Zeitzone", fr: "Fuseau horaire", es: "Zona horaria", it: "Fuso orario", ru: "Часовой пояс", ar: "المنطقة الزمنية", pt: "Fuso horário", nl: "Tijdzone", pl: "Strefa czasowa", ja: "タイムゾーン", ko: "시간대", zh: "时区" },
  tz_placeholder: { tr: "Yazın ve seçin...", en: "Type and select...", de: "Tippen und auswählen...", fr: "Tapez et sélectionnez...", es: "Escribe y selecciona...", it: "Digita e seleziona...", ru: "Введите и выберите...", ar: "اكتب واختر...", pt: "Digite e selecione...", nl: "Typ en selecteer...", pl: "Wpisz i wybierz...", ja: "入力して選択...", ko: "입력하고 선택...", zh: "输入并选择..." },
  label_lang: { tr: "Uygulama Dili / TMDB Dili", en: "App Language / TMDB Language", de: "App-Sprache / TMDB-Sprache", fr: "Langue de l'app / Langue TMDB", es: "Idioma de la app / Idioma de TMDB", it: "Lingua app / Lingua TMDB", ru: "Язык приложения / Язык TMDB", ar: "لغة التطبيق / لغة TMDB", pt: "Idioma do app / Idioma TMDB", nl: "App-taal / TMDB-taal", pl: "Język aplikacji / Język TMDB", ja: "アプリの言語 / TMDBの言語", ko: "앱 언어 / TMDB 언어", zh: "应用语言 / TMDB 语言" },
  save: { tr: "Kaydet", en: "Save", de: "Speichern", fr: "Enregistrer", es: "Guardar", it: "Salva", ru: "Сохранить", ar: "حفظ", pt: "Salvar", nl: "Opslaan", pl: "Zapisz", ja: "保存", ko: "저장", zh: "保存" },
  test_message: { tr: "Test Mesajı Gönder", en: "Send Test Message", de: "Testnachricht senden", fr: "Envoyer un message test", es: "Enviar mensaje de prueba", it: "Invia messaggio di prova", ru: "Отправить тестовое сообщение", ar: "إرسال رسالة اختبار", pt: "Enviar mensagem de teste", nl: "Testbericht verzenden", pl: "Wyślij wiadomość testową", ja: "テストメッセージを送信", ko: "테스트 메시지 보내기", zh: "发送测试消息" },
  close: { tr: "Kapat", en: "Close", de: "Schließen", fr: "Fermer", es: "Cerrar", it: "Chiudi", ru: "Закрыть", ar: "إغلاق", pt: "Fechar", nl: "Sluiten", pl: "Zamknij", ja: "閉じる", ko: "닫기", zh: "关闭" },
  calendar_title: { tr: "Yayın takvimi", en: "Release schedule", de: "Ausstrahlungsplan", fr: "Calendrier des sorties", es: "Calendario de estrenos", it: "Calendario uscite", ru: "Расписание выходов", ar: "جدول الإصدارات", pt: "Calendário de lançamentos", nl: "Uitzendschema", pl: "Harmonogram emisji", ja: "放送予定", ko: "방영 일정", zh: "播出时间表" },
  confirm_unfollow: { tr: "Takibi Bırak", en: "Unfollow", de: "Nicht mehr verfolgen", fr: "Ne plus suivre", es: "Dejar de seguir", it: "Smetti di seguire", ru: "Отписаться", ar: "إلغاء المتابعة", pt: "Deixar de seguir", nl: "Ontvolgen", pl: "Przestań obserwować", ja: "フォロー解除", ko: "팔로우 해제", zh: "取消关注" },
  confirm_yes: { tr: "Evet, Sil", en: "Yes, Remove", de: "Ja, entfernen", fr: "Oui, supprimer", es: "Sí, eliminar", it: "Sì, rimuovi", ru: "Да, удалить", ar: "نعم، حذف", pt: "Sim, remover", nl: "Ja, verwijderen", pl: "Tak, usuń", ja: "はい、削除", ko: "예, 삭제", zh: "是，删除" },
  confirm_no: { tr: "Vazgeç", en: "Cancel", de: "Abbrechen", fr: "Annuler", es: "Cancelar", it: "Annulla", ru: "Отмена", ar: "إلغاء", pt: "Cancelar", nl: "Annuleren", pl: "Anuluj", ja: "キャンセル", ko: "취소", zh: "取消" },
  type_tv: { tr: "Dizi", en: "TV", de: "Serie", fr: "Série", es: "Serie", it: "Serie", ru: "Сериал", ar: "مسلسل", pt: "Série", nl: "Serie", pl: "Serial", ja: "ドラマ", ko: "드라마", zh: "剧集" },
  type_movie: { tr: "Film", en: "Movie", de: "Film", fr: "Film", es: "Película", it: "Film", ru: "Фильм", ar: "فيلم", pt: "Filme", nl: "Film", pl: "Film", ja: "映画", ko: "영화", zh: "电影" },
  date_unknown: { tr: "Tarih bilinmiyor", en: "Date unknown", de: "Datum unbekannt", fr: "Date inconnue", es: "Fecha desconocida", it: "Data sconosciuta", ru: "Дата неизвестна", ar: "التاريخ غير معروف", pt: "Data desconhecida", nl: "Datum onbekend", pl: "Data nieznana", ja: "日付不明", ko: "날짜 불명", zh: "日期未知" },
  today_release: { tr: "Bugün yayında", en: "Airing today", de: "Läuft heute", fr: "Diffusé aujourd'hui", es: "Se emite hoy", it: "In onda oggi", ru: "Сегодня в эфире", ar: "يُعرض اليوم", pt: "No ar hoje", nl: "Vandaag op tv", pl: "Emisja dzisiaj", ja: "今日放送", ko: "오늘 방영", zh: "今日播出" },
  days_left_1: { tr: "Yayına 1 gün kaldı", en: "1 day to air", de: "Noch 1 Tag", fr: "Encore 1 jour", es: "1 día para el estreno", it: "1 giorno all'uscita", ru: "1 день до выхода", ar: "يوم واحد متبقٍ", pt: "1 dia para o lançamento", nl: "Nog 1 dag", pl: "1 dzień do emisji", ja: "放送まであと1日", ko: "방영까지 1일", zh: "距离播出还有1天" },
  days_left: { tr: "Yayına {n} gün kaldı", en: "{n} days to air", de: "Noch {n} Tage", fr: "Encore {n} jours", es: "{n} días para el estreno", it: "{n} giorni all'uscita", ru: "{n} дней до выхода", ar: "{n} أيام متبقية", pt: "{n} dias para o lançamento", nl: "Nog {n} dagen", pl: "{n} dni do emisji", ja: "放送まであと{n}日", ko: "방영까지 {n}일", zh: "距离播出还有{n}天" },
  loading: { tr: "Yükleniyor...", en: "Loading...", de: "Wird geladen...", fr: "Chargement...", es: "Cargando...", it: "Caricamento...", ru: "Загрузка...", ar: "جارٍ التحميل...", pt: "Carregando...", nl: "Laden...", pl: "Ładowanie...", ja: "読み込み中...", ko: "불러오는 중...", zh: "加载中..." },
  data_failed: { tr: "Veri alınamadı", en: "Could not load data", de: "Daten konnten nicht geladen werden", fr: "Impossible de charger les données", es: "No se pudieron cargar los datos", it: "Impossibile caricare i dati", ru: "Не удалось загрузить данные", ar: "تعذر تحميل البيانات", pt: "Não foi possível carregar os dados", nl: "Gegevens konden niet worden geladen", pl: "Nie można załadować danych", ja: "データを読み込めませんでした", ko: "데이터를 불러올 수 없습니다", zh: "无法加载数据" },
  err_anilist: { tr: "AniList'ten veri alınamadı", en: "Could not fetch from AniList", de: "AniList-Daten konnten nicht geladen werden", fr: "Impossible de récupérer depuis AniList", es: "No se pudo obtener de AniList", it: "Impossibile recuperare da AniList", ru: "Не удалось получить данные из AniList", ar: "تعذر الحصول على البيانات من AniList", pt: "Não foi possível obter dados do AniList", nl: "AniList-gegevens konden niet worden opgehaald", pl: "Nie można pobrać danych z AniList", ja: "AniListからデータを取得できませんでした", ko: "AniList에서 데이터를 가져올 수 없습니다", zh: "无法从 AniList 获取数据" },
  err_tmdb: { tr: "TMDB'den veri alınamadı", en: "Could not fetch from TMDB", de: "TMDB-Daten konnten nicht geladen werden", fr: "Impossible de récupérer depuis TMDB", es: "No se pudo obtener de TMDB", it: "Impossibile recuperare da TMDB", ru: "Не удалось получить данные из TMDB", ar: "تعذر الحصول على البيانات من TMDB", pt: "Não foi possível obter dados do TMDB", nl: "TMDB-gegevens konden niet worden opgehaald", pl: "Nie można pobrać danych z TMDB", ja: "TMDBからデータを取得できませんでした", ko: "TMDB에서 데이터를 가져올 수 없습니다", zh: "无法从 TMDB 获取数据" },
  err_missing: { tr: "Eksik bilgi", en: "Missing information", de: "Fehlende Informationen", fr: "Informations manquantes", es: "Información faltante", it: "Informazioni mancanti", ru: "Отсутствует информация", ar: "معلومات ناقصة", pt: "Informações ausentes", nl: "Ontbrekende informatie", pl: "Brakujące informacje", ja: "情報が不足しています", ko: "정보가 없습니다", zh: "缺少信息" },
  err_invalid: { tr: "Geçersiz istek", en: "Invalid request", de: "Ungültige Anfrage", fr: "Requête invalide", es: "Solicitud no válida", it: "Richiesta non valida", ru: "Неверный запрос", ar: "طلب غير صالح", pt: "Requisição inválida", nl: "Ongeldige aanvraag", pl: "Nieprawidłowe żądanie", ja: "無効なリクエスト", ko: "잘못된 요청", zh: "无效请求" },
  err_already: { tr: "Zaten takipte", en: "Already following", de: "Wird bereits verfolgt", fr: "Déjà suivi", es: "Ya en seguimiento", it: "Già seguito", ru: "Уже отслеживается", ar: "تتم متابعته بالفعل", pt: "Já está sendo acompanhado", nl: "Wordt al gevolgd", pl: "Już śledzone", ja: "既にフォロー中", ko: "이미 팔로우 중", zh: "已在关注中" },
  err_follow_missing: { tr: "Takip bulunamadı", en: "Follow not found", de: "Nicht gefolgt", fr: "Suivi introuvable", es: "Seguimiento no encontrado", it: "Seguito non trovato", ru: "Отслеживание не найдено", ar: "لم يتم العثور على المتابعة", pt: "Acompanhamento não encontrado", nl: "Follow niet gevonden", pl: "Nie znaleziono śledzenia", ja: "フォローが見つかりません", ko: "팔로우를 찾을 수 없습니다", zh: "未找到关注" },
  err_season: { tr: "Sezon bilgisi alınamadı", en: "Could not load season info", de: "Staffelinformationen konnten nicht geladen werden", fr: "Impossible de charger les infos de saison", es: "No se pudieron cargar los datos de temporada", it: "Impossibile caricare le info sulla stagione", ru: "Не удалось получить информацию о сезоне", ar: "تعذر تحميل معلومات الموسم", pt: "Não foi possível carregar as informações da temporada", nl: "Seizoensinformatie kon niet worden geladen", pl: "Nie można załadować informacji o sezonie", ja: "シーズン情報を読み込めませんでした", ko: "시즌 정보를 불러올 수 없습니다", zh: "无法加载季信息" },
  err_channel: { tr: "Telegram veya ntfy bilgisi gereklidir", en: "Telegram or ntfy information is required", de: "Telegram- oder ntfy-Informationen erforderlich", fr: "Les informations Telegram ou ntfy sont requises", es: "Se requiere información de Telegram o ntfy", it: "Sono richieste le informazioni Telegram o ntfy", ru: "Требуется информация Telegram или ntfy", ar: "معلومات Telegram أو ntfy مطلوبة", pt: "Informações do Telegram ou ntfy são necessárias", nl: "Telegram- of ntfy-informatie is vereist", pl: "Wymagane są informacje Telegram lub ntfy", ja: "Telegramまたはntfyの情報が必要です", ko: "Telegram 또는 ntfy 정보가 필요합니다", zh: "需要 Telegram 或 ntfy 信息" },
  err_tmdb_key: { tr: "TMDB API anahtarı geçersiz veya ayarlanmamış", en: "TMDB API key is invalid or not set", de: "TMDB-API-Schlüssel ungültig oder nicht gesetzt", fr: "Clé API TMDB invalide ou non définie", es: "Clave de API de TMDB inválida o no configurada", it: "Chiave API TMDB non valida o non impostata", ru: "Ключ API TMDB недействителен или не задан", ar: "مفتاح API الخاص بـ TMDB غير صالح أو غير مضبوط", pt: "Chave da API TMDB inválida ou não definida", nl: "TMDB API-sleutel ongeldig of niet ingesteld", pl: "Klucz API TMDB jest nieprawidłowy lub nieustawiony", ja: "TMDB APIキーが無効または未設定です", ko: "TMDB API 키가 유효하지 않거나 설정되지 않았습니다", zh: "TMDB API 密钥无效或未设置" },
  no_release_date: { tr: "Yayın tarihi bulunamadı.", en: "No release date found.", de: "Kein Ausstrahlungsdatum gefunden.", fr: "Aucune date de sortie trouvée.", es: "No se encontró fecha de estreno.", it: "Nessuna data di uscita trovata.", ru: "Дата выхода не найдена.", ar: "لم يتم العثور على تاريخ الإصدار.", pt: "Nenhuma data de lançamento encontrada.", nl: "Geen uitzenddatum gevonden.", pl: "Nie znaleziono daty emisji.", ja: "放送日が見つかりません。", ko: "방영 날짜를 찾을 수 없습니다.", zh: "未找到播出日期。" },
  release_date: { tr: "Yayın Tarihi", en: "Release Date", de: "Ausstrahlungsdatum", fr: "Date de sortie", es: "Fecha de estreno", it: "Data di uscita", ru: "Дата выхода", ar: "تاريخ الإصدار", pt: "Data de lançamento", nl: "Uitzenddatum", pl: "Data emisji", ja: "公開日", ko: "공개 날짜", zh: "发布日期" },
  other: { tr: "Diğer", en: "Other", de: "Sonstige", fr: "Autre", es: "Otros", it: "Altro", ru: "Другое", ar: "أخرى", pt: "Outros", nl: "Overige", pl: "Inne", ja: "その他", ko: "기타", zh: "其他" },
  season: { tr: "Sezon {n}", en: "Season {n}", de: "Staffel {n}", fr: "Saison {n}", es: "Temporada {n}", it: "Stagione {n}", ru: "Сезон {n}", ar: "الموسم {n}", pt: "Temporada {n}", nl: "Seizoen {n}", pl: "Sezon {n}", ja: "シーズン{n}", ko: "시즌 {n}", zh: "第{n}季" },
  col_episode: { tr: "Bölüm", en: "Episode", de: "Folge", fr: "Épisode", es: "Episodio", it: "Episodio", ru: "Эпизод", ar: "حلقة", pt: "Episódio", nl: "Aflevering", pl: "Odcinek", ja: "エピソード", ko: "에피소드", zh: "集数" },
  season_ep: { tr: "Sezon {s} · Bölüm {e}", en: "Season {s} · Episode {e}", de: "Staffel {s} · Folge {e}", fr: "Saison {s} · Épisode {e}", es: "Temporada {s} · Episodio {e}", it: "Stagione {s} · Episodio {e}", ru: "Сезон {s} · Серия {e}", ar: "الموسم {s} · الحلقة {e}", pt: "Temporada {s} · Episódio {e}", nl: "Seizoen {s} · Aflevering {e}", pl: "Sezon {s} · Odcinek {e}", ja: "シーズン{s} · 第{e}話", ko: "시즌 {s} · 에피소드 {e}", zh: "第{s}季 · 第{e}集" },
  col_date: { tr: "Tarih", en: "Date", de: "Datum", fr: "Date", es: "Fecha", it: "Data", ru: "Дата", ar: "التاريخ", pt: "Data", nl: "Datum", pl: "Data", ja: "日付", ko: "날짜", zh: "日期" },
  clear: { tr: "Temizle", en: "Clear", de: "Zurücksetzen", fr: "Effacer", es: "Limpiar", it: "Pulisci", ru: "Очистить", ar: "مسح", pt: "Limpar", nl: "Wissen", pl: "Wyczyść", ja: "クリア", ko: "지우기", zh: "清除" },
  watch_all: { tr: "Tümünü izle", en: "Mark all watched", de: "Alle als gesehen markieren", fr: "Tout marquer comme vu", es: "Marcar todo como visto", it: "Segna tutto come visto", ru: "Отметить все просмотренными", ar: "تحديد الكل كمُشاهَد", pt: "Marcar tudo como assistido", nl: "Alles als bekeken markeren", pl: "Oznacz wszystkie jako obejrzane", ja: "すべて視聴済みにする", ko: "모두 본 것으로 표시", zh: "全部标记为已看" },
  conn_error: { tr: "Bağlantı hatası oluştu.", en: "A connection error occurred.", de: "Es ist ein Verbindungsfehler aufgetreten.", fr: "Une erreur de connexion s'est produite.", es: "Se produjo un error de conexión.", it: "Si è verificato un errore di connessione.", ru: "Произошла ошибка соединения.", ar: "حدث خطأ في الاتصال.", pt: "Ocorreu um erro de conexão.", nl: "Er is een verbindingsfout opgetreden.", pl: "Wystąpił błąd połączenia.", ja: "接続エラーが発生しました。", ko: "연결 오류가 발생했습니다.", zh: "发生连接错误。" },
  seasons: { tr: "{n} Sezon", en: "{n} Seasons", de: "{n} Staffeln", fr: "{n} saisons", es: "{n} temporadas", it: "{n} stagioni", ru: "{n} сезонов", ar: "{n} مواسم", pt: "{n} temporadas", nl: "{n} seizoenen", pl: "{n} sezony", ja: "{n}シーズン", ko: "{n}시즌", zh: "{n}季" },
  episodes: { tr: "{n} Bölüm", en: "{n} Episodes", de: "{n} Folgen", fr: "{n} épisodes", es: "{n} episodios", it: "{n} episodi", ru: "{n} эпизодов", ar: "{n} حلقات", pt: "{n} episódios", nl: "{n} afleveringen", pl: "{n} odcinków", ja: "{n}エピソード", ko: "{n}에피소드", zh: "{n}集" },
  votes: { tr: "({n} oy)", en: "({n} votes)", de: "({n} Stimmen)", fr: "({n} votes)", es: "({n} votos)", it: "({n} voti)", ru: "({n} голосов)", ar: "({n} أصوات)", pt: "({n} votos)", nl: "({n} stemmen)", pl: "({n} głosów)", ja: "({n}票)", ko: "({n}표)", zh: "({n}票)" },
  today_airing: { tr: "Bugün Yayında", en: "Airing Today", de: "Läuft heute", fr: "Diffusé aujourd'hui", es: "Se emite hoy", it: "In onda oggi", ru: "Сегодня в эфире", ar: "يُعرض اليوم", pt: "No ar hoje", nl: "Vandaag op tv", pl: "Emisja dzisiaj", ja: "今日放送", ko: "오늘 방영", zh: "今日播出" },
  new_season: { tr: "Yeni Sezon Bekleniyor", en: "New Season Coming", de: "Neue Staffel erwartet", fr: "Nouvelle saison à venir", es: "Nueva temporada próxima", it: "Nuova stagione in arrivo", ru: "Ожидается новый сезон", ar: "موسم جديد قادم", pt: "Nova temporada a caminho", nl: "Nieuw seizoen verwacht", pl: "Nowy sezon nadchodzi", ja: "新シーズン予定", ko: "새 시즌 예정", zh: "新季即将推出" },
  today_theaters: { tr: "Bugün Vizyonda", en: "In Theaters Today", de: "Heute im Kino", fr: "En salles aujourd'hui", es: "En cines hoy", it: "Oggi al cinema", ru: "Сегодня в прокате", ar: "في الصالات اليوم", pt: "Nos cinemas hoje", nl: "Vandaag in de bioscoop", pl: "Dziś w kinach", ja: "今日公開", ko: "오늘 개봉", zh: "今日上映" },
  notified: { tr: "Bildirildi", en: "Notified", de: "Benachrichtigt", fr: "Notifié", es: "Notificado", it: "Notificato", ru: "Уведомлено", ar: "تم الإشعار", pt: "Notificado", nl: "Gemeld", pl: "Powiadomiono", ja: "通知済み", ko: "알림됨", zh: "已通知" },
  unfollow_title: { tr: "Takibi bırak", en: "Unfollow", de: "Nicht mehr verfolgen", fr: "Ne plus suivre", es: "Dejar de seguir", it: "Smetti di seguire", ru: "Отписаться", ar: "إلغاء المتابعة", pt: "Deixar de seguir", nl: "Ontvolgen", pl: "Przestań obserwować", ja: "フォロー解除", ko: "팔로우 해제", zh: "取消关注" },
  unfollow_confirm: { tr: '"{title}" takibini bırakmak istiyor musunuz?', en: 'Are you sure you want to unfollow "{title}"?', de: 'Möchten Sie "{title}" wirklich nicht mehr verfolgen?', fr: 'Voulez-vous vraiment ne plus suivre "{title}" ?', es: '¿Seguro que quieres dejar de seguir "{title}"?', it: 'Vuoi davvero smettere di seguire "{title}"?', ru: 'Вы уверены, что хотите отписаться от «{title}»?', ar: 'هل أنت متأكد من إلغاء متابعة "{title}"؟', pt: 'Tem certeza de que deseja deixar de seguir "{title}"?', nl: 'Weet u zeker dat u "{title}" wilt ontvolgen?', pl: 'Czy na pewno chcesz przestać obserwować „{title}"?', ja: '「{title}」のフォローを解除しますか？', ko: '"{title}" 팔로우를 해제하시겠습니까?', zh: '确定要取消关注"{title}"吗？' },
  unfollowed: { tr: "Takip bırakıldı", en: "Unfollowed", de: "Nicht mehr verfolgt", fr: "Suivi abandonné", es: "Dejaste de seguir", it: "Non segui più", ru: "Отписка выполнена", ar: "تم إلغاء المتابعة", pt: "Deixou de seguir", nl: "Ontvolgd", pl: "Przestano obserwować", ja: "フォロー解除しました", ko: "팔로우를 해제했습니다", zh: "已取消关注" },
  added: { tr: "Takibe eklendi", en: "Added to list", de: "Zur Liste hinzugefügt", fr: "Ajouté à la liste", es: "Añadido a la lista", it: "Aggiunto alla lista", ru: "Добавлено в список", ar: "تمت الإضافة إلى القائمة", pt: "Adicionado à lista", nl: "Aan de lijst toegevoegd", pl: "Dodano do listy", ja: "リストに追加しました", ko: "목록에 추가됨", zh: "已添加到列表" },
  search_error: { tr: "Arama hatası", en: "Search error", de: "Suchfehler", fr: "Erreur de recherche", es: "Error de búsqueda", it: "Errore di ricerca", ru: "Ошибка поиска", ar: "خطأ في البحث", pt: "Erro de pesquisa", nl: "Zoekfout", pl: "Błąd wyszukiwania", ja: "検索エラー", ko: "검색 오류", zh: "搜索错误" },
  error: { tr: "Hata", en: "Error", de: "Fehler", fr: "Erreur", es: "Error", it: "Errore", ru: "Ошибка", ar: "خطأ", pt: "Erro", nl: "Fout", pl: "Błąd", ja: "エラー", ko: "오류", zh: "错误" },
  no_results: { tr: "Sonuç bulunamadı.", en: "No results found.", de: "Keine Ergebnisse gefunden.", fr: "Aucun résultat trouvé.", es: "No se encontraron resultados.", it: "Nessun risultato trovato.", ru: "Результаты не найдены.", ar: "لم يتم العثور على نتائج.", pt: "Nenhum resultado encontrado.", nl: "Geen resultaten gevonden.", pl: "Nie znaleziono wyników.", ja: "結果が見つかりません。", ko: "결과를 찾을 수 없습니다.", zh: "未找到结果。" },
  follow: { tr: "Takip et", en: "Follow", de: "Verfolgen", fr: "Suivre", es: "Seguir", it: "Segui", ru: "Подписаться", ar: "متابعة", pt: "Seguir", nl: "Volgen", pl: "Obserwuj", ja: "フォロー", ko: "팔로우", zh: "关注" },
  saved_ok: { tr: "Ayarlar kaydedildi", en: "Settings saved", de: "Einstellungen gespeichert", fr: "Paramètres enregistrés", es: "Ajustes guardados", it: "Impostazioni salvate", ru: "Настройки сохранены", ar: "تم حفظ الإعدادات", pt: "Configurações salvas", nl: "Instellingen opgeslagen", pl: "Ustawienia zapisano", ja: "設定を保存しました", ko: "설정이 저장되었습니다", zh: "设置已保存" },
  save_failed: { tr: "Ayarlar kaydedilemedi", en: "Could not save settings", de: "Einstellungen konnten nicht gespeichert werden", fr: "Impossible d'enregistrer les paramètres", es: "No se pudieron guardar los ajustes", it: "Impossibile salvare le impostazioni", ru: "Не удалось сохранить настройки", ar: "تعذر حفظ الإعدادات", pt: "Não foi possível salvar as configurações", nl: "Instellingen konden niet worden opgeslagen", pl: "Nie można zapisać ustawień", ja: "設定を保存できませんでした", ko: "설정을 저장할 수 없습니다", zh: "无法保存设置" },
  saved: { tr: "Kaydedildi", en: "Saved", de: "Gespeichert", fr: "Enregistré", es: "Guardado", it: "Salvato", ru: "Сохранено", ar: "تم الحفظ", pt: "Salvo", nl: "Opgeslagen", pl: "Zapisano", ja: "保存済み", ko: "저장됨", zh: "已保存" },
  need_bot_token: { tr: "Bot token gerekli", en: "Bot token required", de: "Bot-Token erforderlich", fr: "Jeton de bot requis", es: "Token del bot requerido", it: "Token del bot richiesto", ru: "Требуется токен бота", ar: "مطلوب رمز البوت", pt: "Token do bot obrigatório", nl: "Bot-token vereist", pl: "Token bota wymagany", ja: "ボットトークンが必要です", ko: "봇 토큰 필요", zh: "需要机器人令牌" },
  need_chat_id: { tr: "Chat ID gerekli", en: "Chat ID required", de: "Chat-ID erforderlich", fr: "ID de chat requise", es: "ID de chat requerida", it: "ID chat richiesta", ru: "Требуется ID чата", ar: "مطلوب معرف الدردشة", pt: "ID do chat obrigatório", nl: "Chat-ID vereist", pl: "ID czatu wymagane", ja: "チャットIDが必要です", ko: "채팅 ID 필요", zh: "需要聊天ID" },
  need_bot_chat: { tr: "Bot token ve Chat ID gerekli", en: "Bot token and Chat ID required", de: "Bot-Token und Chat-ID erforderlich", fr: "Jeton de bot et ID de chat requis", es: "Token del bot y ID de chat requeridos", it: "Token del bot e ID chat richiesti", ru: "Требуются токен бота и ID чата", ar: "مطلوب رمز البوت ومعرف الدردشة", pt: "Token do bot e ID do chat obrigatórios", nl: "Bot-token en Chat-ID vereist", pl: "Token bota i ID czatu wymagane", ja: "ボットトークンとチャットIDが必要です", ko: "봇 토큰 및 채팅 ID 필요", zh: "需要机器人令牌和聊天ID" },
  need_ntfy_topic: { tr: "ntfy konusu gerekli", en: "ntfy topic required", de: "ntfy-Thema erforderlich", fr: "Sujet ntfy requis", es: "Tema ntfy requerido", it: "Argomento ntfy richiesto", ru: "Требуется тема ntfy", ar: "مطلوب موضوع ntfy", pt: "Tópico ntfy obrigatório", nl: "ntfy-onderwerp vereist", pl: "Temat ntfy wymagany", ja: "ntfyトピックが必要です", ko: "ntfy 주제 필요", zh: "需要ntfy主题" },
  tmdb_key_needed: { tr: "Sistem gerekli bilgileri TMDB den {link} çektiği için TMDB'ye üye olup API anahtarı almanız ve TMDB ve Telegram seçeneğinden API anahtarını girmeniz gerekmektedir. TMDB ye üye olduktan sonra {api_link} adresinden API anahtarınızı alabilirsiniz.", en: "Since the system fetches the required information from TMDB {link}, you need to sign up to TMDB, get an API key, and enter it from the TMDB & Telegram option. After signing up to TMDB, you can get your API key at {api_link}.", de: "Da das System die benötigten Informationen von TMDB {link} abruft, müssen Sie sich bei TMDB registrieren, einen API-Schlüssel erhalten und ihn über die Option TMDB und Telegram eingeben. Nach der Registrierung bei TMDB erhalten Sie Ihren API-Schlüssel unter {api_link}.", fr: "Le système récupère les informations nécessaires depuis TMDB {link}, vous devez donc créer un compte TMDB, obtenir une clé API et la saisir depuis l'option TMDB et Telegram. Après votre inscription à TMDB, vous pouvez obtenir votre clé API à l'adresse {api_link}.", es: "Como el sistema obtiene la información necesaria de TMDB {link}, debe registrarse en TMDB, obtener una clave API e introducirla desde la opción TMDB y Telegram. Tras registrarse en TMDB, puede obtener su clave API en {api_link}.", it: "Poiché il sistema recupera le informazioni necessarie da TMDB {link}, devi iscriverti a TMDB, ottenere una chiave API e inserirla dall'opzione TMDB e Telegram. Dopo l'iscrizione a TMDB, puoi ottenere la tua chiave API all'indirizzo {api_link}.", ru: "Поскольку система получает необходимую информацию из TMDB {link}, вам необходимо зарегистрироваться в TMDB, получить API-ключ и ввести его через опцию TMDB и Telegram. После регистрации в TMDB вы можете получить свой API-ключ по адресу {api_link}.", ar: "بما أن النظام يجلب المعلومات اللازمة من TMDB {link}، يجب عليك التسجيل في TMDB والحصول على مفتاح API وإدخاله من خيار TMDB وتيليجرام. بعد التسجيل في TMDB، يمكنك الحصول على مفتاح API الخاص بك من {api_link}.", pt: "Como o sistema obtém as informações necessárias do TMDB {link}, você precisa se cadastrar no TMDB, obter uma chave de API e inseri-la pela opção TMDB e Telegram. Após o cadastro no TMDB, você pode obter sua chave de API em {api_link}.", nl: "Omdat het systeem benodigde informatie van TMDB {link} ophaalt, moet u zich bij TMDB registreren, een API-sleutel verkrijgen en deze invoeren via de optie TMDB en Telegram. Na registratie bij TMDB kunt u uw API-sleutel verkrijgen via {api_link}.", pl: "Ponieważ system pobiera niezbędne informacje z TMDB {link}, musisz zarejestrować się w TMDB, uzyskać klucz API i wprowadzić go z opcji TMDB i Telegram. Po rejestracji w TMDB możesz uzyskać swój klucz API pod adresem {api_link}.", ja: "システムは必要な情報をTMDB {link}から取得するため、TMDBに登録してAPIキーを取得し、「TMDBとTelegram」オプションからAPIキーを入力する必要があります。TMDBに登録後、{api_link} からAPIキーを取得できます。", ko: "시스템이 필요한 정보를 TMDB {link}에서 가져오므로 TMDB에 가입하여 API 키를 받고 TMDB 및 텔레그램 옵션에서 API 키를 입력해야 합니다. TMDB에 가입한 후 {api_link}에서 API 키를 받을 수 있습니다.", zh: "系统需要从 TMDB {link} 获取必要信息，因此您需要注册 TMDB、获取 API 密钥，并从“TMDB和Telegram”选项中输入 API 密钥。注册 TMDB 后，您可以从 {api_link} 获取您的 API 密钥。" },
  test_sent: { tr: "Test mesajı gönderildi", en: "Test message sent", de: "Testnachricht gesendet", fr: "Message test envoyé", es: "Mensaje de prueba enviado", it: "Messaggio di prova inviato", ru: "Тестовое сообщение отправлено", ar: "تم إرسال رسالة الاختبار", pt: "Mensagem de teste enviada", nl: "Testbericht verzonden", pl: "Wysłano wiadomość testową", ja: "テストメッセージを送信しました", ko: "테스트 메시지를 보냈습니다", zh: "测试消息已发送" },
  runtime_hm: { tr: "{h} sa {m} dk", en: "{h}h {m}m", de: "{h} Std. {m} Min.", fr: "{h} h {m} min", es: "{h} h {m} min", it: "{h} h {m} min", ru: "{h} ч {m} мин", ar: "{h} س {m} د", pt: "{h} h {m} min", nl: "{h} u {m} min", pl: "{h} godz. {m} min", ja: "{h}時間{m}分", ko: "{h}시간 {m}분", zh: "{h}小时{m}分" },
  runtime_h: { tr: "{h} sa", en: "{h}h", de: "{h} Std.", fr: "{h} h", es: "{h} h", it: "{h} h", ru: "{h} ч", ar: "{h} س", pt: "{h} h", nl: "{h} u", pl: "{h} godz.", ja: "{h}時間", ko: "{h}시간", zh: "{h}小时" },
  runtime_m: { tr: "{m} dk", en: "{m}m", de: "{m} Min.", fr: "{m} min", es: "{m} min", it: "{m} min", ru: "{m} мин", ar: "{m} د", pt: "{m} min", nl: "{m} min", pl: "{m} min", ja: "{m}分", ko: "{m}분", zh: "{m}分" },
  fav_actor: { tr: "Favori oyuncu", en: "Favorite actor", de: "Lieblingsschauspieler", fr: "Acteur favori", es: "Actor favorito", it: "Attore preferito", ru: "Любимый актёр", ar: "ممثل مفضل", pt: "Ator favorito", nl: "Favoriete acteur", pl: "Ulubiony aktor", ja: "お気に入りの俳優", ko: "즐겨찾는 배우", zh: "最喜欢的演员" },
  fav_actor_added: { tr: "Favori oyunculara eklendi", en: "Added to favorite actors", de: "Zu Lieblingsschauspielern hinzugefügt", fr: "Ajouté aux acteurs favoris", es: "Añadido a actores favoritos", it: "Aggiunto agli attori preferiti", ru: "Добавлен в любимые актёры", ar: "تمت الإضافة إلى الممثلين المفضلين", pt: "Adicionado aos atores favoritos", nl: "Toegevoegd aan favoriete acteurs", pl: "Dodano do ulubionych aktorów", ja: "お気に入りの俳優に追加しました", ko: "즐겨찾는 배우에 추가했습니다", zh: "已添加到最喜欢的演员" },
  fav_actor_removed: { tr: "Favori oyunculardan çıkarıldı", en: "Removed from favorite actors", de: "Aus Lieblingsschauspielern entfernt", fr: "Retiré des acteurs favoris", es: "Eliminado de actores favoritos", it: "Rimosso dagli attori preferiti", ru: "Удалён из любимых актёров", ar: "تمت الإزالة من الممثلين المفضلين", pt: "Removido dos atores favoritos", nl: "Verwijderd uit favoriete acteurs", pl: "Usunięto z ulubionych aktorów", ja: "お気に入りの俳優から削除しました", ko: "즐겨찾는 배우에서 제거했습니다", zh: "已从最喜欢的演员中移除" },
  fav_genre_removed: { tr: "Favori türlerden çıkarıldı", en: "Removed from favorite genres", de: "Aus Lieblingsgenres entfernt", fr: "Retiré des genres favoris", es: "Eliminado de géneros favoritos", it: "Rimosso dai generi preferiti", ru: "Удалён из любимых жанров", ar: "تمت الإزالة من الأنواع المفضلة", pt: "Removido dos gêneros favoritos", nl: "Verwijderd uit favoriete genres", pl: "Usunięto z ulubionych gatunków", ja: "お気に入りのジャンルから削除しました", ko: "즐겨찾는 장르에서 제거했습니다", zh: "已从最喜欢的类型中移除" },
  settings_menu: { tr: "Menü", en: "Menu", de: "Menü", fr: "Menu", es: "Menú", it: "Menu", ru: "Меню", ar: "القائمة", pt: "Menu", nl: "Menu", pl: "Menu", ja: "メニュー", ko: "메뉴", zh: "菜单" },
  settings_lang: { tr: "Dil ve Zaman", en: "Language & Time", de: "Sprache & Zeit", fr: "Langue et heure", es: "Idioma y hora", it: "Lingua e ora", ru: "Язык и время", ar: "اللغة والوقت", pt: "Idioma e horário", nl: "Taal en tijd", pl: "Język i czas", ja: "言語と時間", ko: "언어 및 시간", zh: "语言和时间" },
  settings_tmdb: { tr: "TMDB ve Telegram", en: "TMDB & Telegram", de: "TMDB und Telegram", fr: "TMDB et Telegram", es: "TMDB y Telegram", it: "TMDB e Telegram", ru: "TMDB и Telegram", ar: "TMDB وتيليجرام", pt: "TMDB e Telegram", nl: "TMDB en Telegram", pl: "TMDB i Telegram", ja: "TMDBとTelegram", ko: "TMDB 및 텔레그램", zh: "TMDB和Telegram" },
  settings_favactors: { tr: "Favori Oyuncular", en: "Favorite Actors", de: "Lieblingsschauspieler", fr: "Acteurs favoris", es: "Actores favoritos", it: "Attori preferiti", ru: "Любимые актёры", ar: "الممثلون المفضلون", pt: "Atores favoritos", nl: "Favoriete acteurs", pl: "Ulubieni aktorzy", ja: "お気に入りの俳優", ko: "즐겨찾는 배우", zh: "最喜欢的演员" },
  settings_favgenres: { tr: "Favori Türler", en: "Favorite Genres", de: "Lieblingsgenres", fr: "Genres favoris", es: "Géneros favoritos", it: "Generi preferiti", ru: "Любимые жанры", ar: "الأنواع المفضلة", pt: "Gêneros favoritos", nl: "Favoriete genres", pl: "Ulubione gatunki", ja: "お気に入りのジャンル", ko: "즐겨찾는 장르", zh: "最喜欢的类型" },
  settings_notify: { tr: "Bildirim Ayarları", en: "Notification Settings", de: "Benachrichtigungseinstellungen", fr: "Paramètres de notification", es: "Configuración de notificaciones", it: "Impostazioni notifiche", ru: "Настройки уведомлений", ar: "إعدادات الإشعارات", pt: "Configurações de notificação", nl: "Notificatie-instellingen", pl: "Ustawienia powiadomień", ja: "通知設定", ko: "알림 설정", zh: "通知设置" },
  fav_actor_remove: { tr: "Favorilerden çıkar", en: "Remove from favorites", de: "Aus Favoriten entfernen", fr: "Retirer des favoris", es: "Quitar de favoritos", it: "Rimuovi dai preferiti", ru: "Удалить из избранного", ar: "إزالة من المفضلة", pt: "Remover dos favoritos", nl: "Uit favorieten verwijderen", pl: "Usuń z ulubionych", ja: "お気に入りから削除", ko: "즐겨찾기에서 제거", zh: "从收藏中移除" },
  fav_genre_remove: { tr: "Favorilerden çıkar", en: "Remove from favorites", de: "Aus Favoriten entfernen", fr: "Retirer des favoris", es: "Quitar de favoritos", it: "Rimuovi dai preferiti", ru: "Удалить из избранного", ar: "إزالة من المفضلة", pt: "Remover dos favoritos", nl: "Uit favorieten verwijderen", pl: "Usuń z ulubionych", ja: "お気に入りから削除", ko: "즐겨찾기에서 제거", zh: "从收藏中移除" },
};

function t(key, vars) {
  let s = I18N[key] ? I18N[key][currentLang] || I18N[key].en || key : key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.split("{" + k + "}").join(vars[k]);
    });
  }
  return s;
}

const ERROR_MAP = {
  "TMDB API anahtarı geçersiz veya ayarlanmamış": "err_tmdb_key",
  "TMDB'den veri alınamadı": "err_tmdb",
  "AniList'ten veri alınamadı": "err_anilist",
  "anilist_id gereklidir": "err_missing",
  "anime_id gereklidir": "err_missing",
  "anime_id gereklidir": "err_missing",
  "Anime bulunamadı": "err_anilist",
  "Eksik bilgi": "err_missing",
  "Zaten takipte": "err_already",
  "Geçersiz istek": "err_invalid",
  "Takip bulunamadı": "err_follow_missing",
  "Sezon bilgisi alınamadı": "err_season",
  "Telegram veya ntfy bilgisi gereklidir": "err_channel",
};

function errText(err) {
  if (!err) return "";
  const key = ERROR_MAP[err];
  return key ? t(key) : err;
}

let tmdbKeySet = false;
function checkTmdbKey(hasKey) {
  tmdbKeySet = !!hasKey;
  const banner = document.getElementById("tmdb-key-banner");
  if (!banner) return;
  if (tmdbKeySet) {
    banner.style.display = "none";
    return;
  }
  const msg = document.getElementById("tmdb-key-msg");
  if (msg) msg.innerHTML = t("tmdb_key_needed", { link: '<a href="https://www.themoviedb.org" target="_blank" rel="noopener">https://www.themoviedb.org</a>', api_link: '<a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">https://www.themoviedb.org/settings/api</a>' });
  banner.style.display = "flex";
}

function applyLang(lang) {
  currentLang = lang || "tr";
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (el.tagName === "INPUT") el.placeholder = t(key);
    else el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.setAttribute("data-tip", t(el.dataset.i18nTitle));
  });
  document.title = t("app_title");
  checkTmdbKey(tmdbKeySet);
  if (views.followed.classList.contains("active")) loadFollowed();
}

const views = {
  followed: document.getElementById("view-followed"),
  anime: document.getElementById("view-anime"),
  search: document.getElementById("view-search"),
};

const tabs = {
  followed: document.getElementById("tab-followed"),
  anime: document.getElementById("tab-anime"),
  search: document.getElementById("tab-search"),
};

function switchView(name) {
  if (name !== "search" && views.search.classList.contains("active")) {
    chips.length = 0;
    renderChips();
    closeResultsModal();
  }
  Object.keys(views).forEach((k) => views[k].classList.remove("active"));
  Object.keys(tabs).forEach((k) => tabs[k].classList.remove("active"));
  views[name].classList.add("active");
  tabs[name].classList.add("active");
  try {
    localStorage.setItem("activeView", name);
  } catch (e) {}
  if (name === "followed") loadFollowed();
  if (name === "anime") loadAnime();
}

tabs.followed.onclick = () => switchView("followed");
tabs.anime.onclick = () => switchView("anime");
tabs.search.onclick = () => switchView("search");
document.getElementById("search-close").onclick = () => switchView("followed");

// ---- Sorting ----
let sortKey = "added";
try {
  sortKey = localStorage.getItem("sortKey") || "added";
} catch (e) {}

function sortValue(item) {
  if (sortKey === "alpha") return (item.title || "").toLocaleLowerCase();
  if (sortKey === "score") return item.score != null ? item.score : item.vote_average || 0;
  if (sortKey === "date") {
    if (item.media_type) {
      if (item.media_type === "tv") return item.next_episode ? item.next_episode.air_date || "" : "";
      return item.release_date || "";
    }
    return item.next_episode ? new Date(item.next_episode.airing_at * 1000).toISOString() : "";
  }
  if (sortKey === "type") return item.media_type || item.format || "";
  return item.id;
}

function compareItems(a, b) {
  let av = sortValue(a);
  let bv = sortValue(b);
  if (sortKey === "added") return bv - av;
  if (sortKey === "score") return (bv || 0) - (av || 0);
  if (sortKey === "date") {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const aPast = !av || av < today;
    const bPast = !bv || bv < today;
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    if (av === bv) return 0;
    if (!av) return 1;
    if (!bv) return -1;
    return av < bv ? -1 : 1;
  }
  av = String(av).toLocaleLowerCase();
  bv = String(bv).toLocaleLowerCase();
  return av < bv ? -1 : av > bv ? 1 : 0;
}

function applySort(items) {
  const arr = items.slice();
  arr.sort(compareItems);
  return arr;
}

function updateSortMenu() {
  document.querySelectorAll(".sort-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sort === sortKey);
  });
}

const sortMenu = document.getElementById("sort-menu");
document.getElementById("tab-sort").onclick = (e) => {
  e.stopPropagation();
  closeSettingsMenu();
  const open = sortMenu.classList.contains("open");
  sortMenu.classList.toggle("open", !open);
  updateSortMenu();
};
document.querySelectorAll(".sort-item").forEach((btn) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    sortKey = btn.dataset.sort;
    try {
      localStorage.setItem("sortKey", sortKey);
    } catch (e2) {}
    sortMenu.classList.remove("open");
    if (views.followed.classList.contains("active")) loadFollowed();
    if (views.anime.classList.contains("active")) loadAnime();
  };
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sort-wrap")) sortMenu.classList.remove("open");
});

function posterHTML(posterPath, title) {
  if (posterPath) {
    return `<img src="${IMAGE_BASE}${posterPath}" alt="${title}" onerror="this.outerHTML=noPosterFallback()" />`;
  }
  return `<div class="no-poster">${FILM_SVG}</div>`;
}

function scoreTag(v) {
  if (!v || Number(v) <= 0) return "";
  return `<span class="badge badge-score">${Number(v).toFixed(1)}</span>`;
}

function typeLabel(mediaType) {
  return mediaType === "tv" ? t("type_tv") : t("type_movie");
}

function toast(msg, isErr) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = "toast"), 2500);
}

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyTitleHint(card) {
  const el = card.querySelector(".info .title");
  if (!el) return;
  if (el.scrollHeight > el.clientHeight) {
    el.setAttribute("data-tip", el.textContent);
  }
}

const CALENDAR_SVG = `
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>`;

let currentTz = "Europe/Istanbul";
let allTimezones = [];

function tzLocale() {
  const z = allTimezones.find((x) => x.value === currentTz);
  if (z && z.locale) return z.locale;
  return "tr-TR";
}

function formatDate(dateStr) {
  if (!dateStr) return { text: t("date_unknown"), day: "" };
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return { text: dateStr, day: "" };
  const loc = tzLocale();
  let text;
  try {
    text = new Intl.DateTimeFormat(loc, {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).format(d);
  } catch (e) {
    text = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  let day;
  try {
    day = new Intl.DateTimeFormat(loc, { weekday: "long" }).format(d);
  } catch (e) {
    day = "";
  }
  return { text, day };
}

function utcTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function utcDayStr(epochSec) {
  if (!epochSec) return "";
  const d = new Date(epochSec * 1000);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function utcStateStr(it) {
  const today = utcTodayStr();
  if (it.air_time) {
    const day = utcDayStr(it.air_time);
    if (!day) return "";
    if (day < today) return "date-past";
    if (day > today) return "date-future";
    return "date-today";
  }
  if (!it.date) return "";
  if (it.date < today) return "date-past";
  if (it.date > today) return "date-future";
  return "date-today";
}

function canSelectAll(it) {
  const today = utcTodayStr();
  if (it.air_time) {
    const day = utcDayStr(it.air_time);
    return !!day && day < today;
  }
  return !!it.date && it.date < today;
}

function isNewEpisode(it) {
  if (it.watched) return false;
  if (it.air_time) {
    const day = utcDayStr(it.air_time);
    return !!day && day <= utcTodayStr();
  }
  const st = dateState(it.date);
  return st === "date-past" || st === "date-today";
}

function isNewTr(tr) {
  const air = tr.dataset.air ? Number(tr.dataset.air) : null;
  if (air) {
    const day = utcDayStr(air);
    return !!day && day <= utcTodayStr();
  }
  const st = dateState(tr.dataset.date);
  return st === "date-past" || st === "date-today";
}

function shortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const loc = tzLocale();
  try {
    return new Intl.DateTimeFormat(loc, { day: "numeric", month: "long" }).format(d);
  } catch (e) {
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }
}

function shortDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const loc = tzLocale();
  try {
    return new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" }).format(d);
  } catch (e) {
    const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }
}

function isMobile() {
  return window.innerWidth <= 600;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = todayInTz();
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function daysHint(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return "";
  if (days <= 0) return t("today_release");
  if (days === 1) return t("days_left_1");
  return t("days_left", { n: days });
}

function todayInTz() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: currentTz,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00`);
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  return d.getTime() === todayInTz().getTime();
}

function dateState(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  const today = todayInTz();
  if (d.getTime() < today.getTime()) return "date-past";
  if (d.getTime() > today.getTime()) return "date-future";
  return "date-today";
}

async function openReleases(mediaType, tmdbId, title) {
  const modal = document.getElementById("releases-modal");
  const body = document.getElementById("releases-body");
  document.getElementById("releases-title").textContent = title || "";
  body.innerHTML = `<div class="releases-loading">${t("loading")}</div>`;
  modal.style.display = "flex";

  try {
    const res = await fetch(`/api/releases?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${encodeURIComponent(tmdbId)}&title=${encodeURIComponent(title || "")}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${errText(data.error) || t("data_failed")}</div>`;
      return;
    }
    document.getElementById("releases-title").textContent = data.title || title || "";

    if (!data.items.length) {
      body.innerHTML = `<div class="releases-error">${t("no_release_date")}</div>`;
      return;
    }

    const groups = {};
    data.items.forEach((it) => {
      const season = it.season != null ? it.season : "other";
      if (!groups[season]) groups[season] = [];
      groups[season].push(it);
    });

    const seasonNames = Object.keys(groups).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return 0;
    });

    let html = "";
    seasonNames.forEach((seasonKey) => {
      const seasonItems = groups[seasonKey];
      const seasonLabel =
        seasonKey === "other"
          ? data.media_type === "movie"
            ? t("release_date")
            : t("other")
          : t("season", { n: seasonKey });
      html += `<div class="season-box">`;
      if (data.media_type === "tv") {
        const releasedItems = seasonItems.filter((it) => canSelectAll(it));
        const total = seasonItems.length;
        const watched = seasonItems.filter((it) => it.watched).length;
        const pct = total ? Math.round((watched / total) * 100) : 0;
        const allWatched = total > 0 && watched === total;
        const btnDisabled = releasedItems.length === 0 ? " disabled" : "";
        html += `<div class="season-box-title"><span class="season-name">${seasonLabel}</span><div class="season-progress"><div class="season-progress-fill" style="width:${pct}%"></div><span class="season-progress-text">${watched}/${total} · %${pct}</span></div><button class="season-watch-all" data-s="${seasonKey}" data-w="${allWatched ? 0 : 1}"${btnDisabled}>${allWatched ? t("clear") : t("watch_all")}</button></div>`;
      } else {
        html += `<div class="season-box-title">${seasonLabel}</div>`;
      }
      html += `<table class="releases-table"><thead><tr><th>${t("col_episode")}</th><th>${t("col_date")}</th></tr></thead><tbody>`;
      seasonItems.forEach((it) => {
        const f = formatDate(it.date);
        const st = utcStateStr(it);
        const dateClass = st ? ` class="${st}"` : "";
        const epName = it.episode_name
          ? `<div class="episode-name">${it.episode_name}</div>`
          : "";
        const watchedClass = it.watched ? " watched" : "";
        const aired = isNewEpisode(it); // yayınlandı mı (bold kriteri)
        const btnDisabled = !aired ? " disabled" : "";
        const selectable = canSelectAll(it) ? 1 : 0;
        const btnCls = it.watched ? "watch-btn on" : "watch-btn";
        const checkIcon = it.watched ? CHECK_SVG : "";
        const newCls = isNewEpisode(it) ? " new" : "";
        const dateText = f.text;
        html += `<tr class="${watchedClass}${newCls}" data-released="${selectable}" data-air="${it.air_time || ""}" data-date="${it.date || ""}">`;
        if (data.media_type === "tv") {
          html += `<td><button class="${btnCls}" data-s="${it.season}" data-e="${it.episode}" data-w="${it.watched ? 1 : 0}"${btnDisabled}>${checkIcon}</button><span class="episode-cell"><span class="episode-label">${t("season_ep", { s: it.season, e: it.episode })}</span>${epName}</span></td>`;
        } else {
          html += `<td><div class="episode-label">${t("release_date")}</div>${epName}</td>`;
        }
        html += `<td${dateClass}>${dateText}</td></tr>`;
      });
      html += "</tbody></table></div>";
    });

    body.innerHTML = html || `<div class="releases-error">${t("no_release_date")}</div>`;

    if (data.media_type === "tv") {
      body.querySelectorAll(".watch-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          if (btn.disabled) return;
          const season = btn.dataset.s;
          const episode = btn.dataset.e;
          const watched = btn.dataset.w === "1" ? 0 : 1;
          const res = await fetch("/api/episode/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdb_id: tmdbId,
              season: Number(season),
              episode: Number(episode),
              watched,
            }),
          });
          if (!res.ok) return;
          btn.dataset.w = String(watched);
          btn.classList.toggle("on", watched === 1);
          btn.innerHTML = watched ? CHECK_SVG : "";
          const tr = btn.closest("tr");
          tr.classList.toggle("watched", watched === 1);
          tr.classList.toggle("new", watched === 0 && isNewTr(tr));

          const seasonBox = btn.closest(".season-box");
          const allRows = seasonBox.querySelectorAll("tbody tr");
          const releasedCount = seasonBox.querySelectorAll("tbody tr[data-released='1']").length;
          const total = allRows.length;
          const done = seasonBox.querySelectorAll("tbody tr.watched").length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const prog = seasonBox.querySelector(".season-progress-text");
          const bar = seasonBox.querySelector(".season-progress-fill");
          if (prog) prog.textContent = `${done}/${total} · %${pct}`;
          if (bar) bar.style.width = pct + "%";
          const allBtn = seasonBox.querySelector(".season-watch-all");
          if (allBtn) {
            const allDone = total > 0 && done === total;
            allBtn.dataset.w = allDone ? 0 : 1;
            allBtn.textContent = allDone ? t("clear") : t("watch_all");
            allBtn.disabled = releasedCount === 0;
          }
        });
      });

      body.querySelectorAll(".season-watch-all").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const season = btn.dataset.s;
          const watched = btn.dataset.w === "1" ? 1 : 0;
          const res = await fetch("/api/season/watch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdb_id: tmdbId,
              season: Number(season),
              watched,
            }),
          });
          if (!res.ok) return;
          const seasonBox = btn.closest(".season-box");
          const rows = seasonBox.querySelectorAll("tbody tr");
          rows.forEach((tr) => {
            const isReleased = tr.dataset.released === "1";
            const b = tr.querySelector(".watch-btn");
            if (watched === 1 && !isReleased) {
              if (b) b.disabled = true;
              return;
            }
            tr.classList.toggle("watched", watched === 1);
            b.dataset.w = String(watched);
            b.classList.toggle("on", watched === 1);
            b.innerHTML = watched ? CHECK_SVG : "";
            b.disabled = false;
            tr.classList.toggle("new", watched === 0 && isNewTr(tr));
          });
          const releasedCount = seasonBox.querySelectorAll("tbody tr[data-released='1']").length;
          const total = rows.length;
          const done = seasonBox.querySelectorAll("tbody tr.watched").length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          const prog = seasonBox.querySelector(".season-progress-text");
          const bar = seasonBox.querySelector(".season-progress-fill");
          if (prog) prog.textContent = `${done}/${total} · %${pct}`;
          if (bar) bar.style.width = pct + "%";
          const allDone = total > 0 && done === total;
          btn.dataset.w = allDone ? 0 : 1;
          btn.textContent = allDone ? t("clear") : t("watch_all");
          btn.disabled = releasedCount === 0;
        });
      });
    }
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

function closeReleases() {
  document.getElementById("releases-modal").style.display = "none";
}

function closeDetails() {
  document.getElementById("details-modal").style.display = "none";
}

function closeModals() {
  closeReleases();
  closeDetails();
  closeConfirm();
}

function closeConfirm() {
  document.getElementById("confirm-modal").style.display = "none";
}

function showConfirm(text, onYes) {
  document.getElementById("confirm-text").textContent = text;
  document.getElementById("confirm-modal").style.display = "flex";
  document.getElementById("confirm-yes").onclick = () => {
    closeConfirm();
    onYes();
  };
  document.getElementById("confirm-no").onclick = closeConfirm;
  document.getElementById("confirm-close").onclick = closeConfirm;
  document.getElementById("confirm-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeConfirm();
  });
}

document.getElementById("releases-close").onclick = closeReleases;
document.getElementById("releases-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeReleases();
});
document.getElementById("details-close").onclick = closeDetails;
document.getElementById("details-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeDetails();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});

function fmtRuntime(min) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return t("runtime_hm", { h, m });
  if (h) return t("runtime_h", { h });
  return t("runtime_m", { m });
}

function fmtScore(v) {
  if (v == null) return "";
  return Number(v).toFixed(1);
}

async function openDetails(mediaType, tmdbId, title, highlightPerson, highlightPersonId, highlightGenre) {
  const modal = document.getElementById("details-modal");
  const body = document.getElementById("details-body");
  const calBtn = document.getElementById("details-calendar");
  document.getElementById("details-title").textContent = title || "";
  body.innerHTML = `<div class="releases-loading">${t("loading")}</div>`;
  modal.style.display = "flex";
  calBtn.style.display = "flex";
  calBtn.onclick = () => {
    closeDetails();
    openReleases(mediaType, tmdbId, title);
  };

  try {
    const res = await fetch(`/api/details?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${encodeURIComponent(tmdbId)}${highlightPerson ? `&highlight_person=${encodeURIComponent(highlightPerson)}` : ""}${highlightPersonId ? `&highlight_person_id=${encodeURIComponent(highlightPersonId)}` : ""}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${errText(data.error) || t("data_failed")}</div>`;
      return;
    }
    document.getElementById("details-title").textContent = data.title || title || "";

    let html = '<div class="details-wrap">';
    html += '<div class="details-poster-col">';
    if (data.poster_path) {
      html += `<img class="details-poster" src="${IMAGE_BASE}${data.poster_path}" alt="${data.title}" />`;
    }

    const badges = [];
    if (data.media_type === "tv") {
      badges.push(t("type_tv"));
      if (data.number_of_seasons) badges.push(t("seasons", { n: data.number_of_seasons }));
      if (data.number_of_episodes) badges.push(t("episodes", { n: data.number_of_episodes }));
      if (data.status) badges.push(data.status);
      if (data.first_air_date) badges.push(formatDate(data.first_air_date).text);
    } else {
      badges.push(t("type_movie"));
      if (data.release_date) badges.push(formatDate(data.release_date).text);
    }
    if (data.runtime) badges.push(fmtRuntime(data.runtime));

    html += '<div class="details-meta">';
    badges.forEach((b) => {
      html += `<span class="detail-badge">${b}</span>`;
    });
    html += "</div>";

    if (data.genres && data.genres.length) {
      html += '<div class="genre-tags">';
      const hg = highlightGenre ? highlightGenre.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
      data.genres.forEach((g) => {
        const fav = favGenres.has(g) || hg.includes(g.toLowerCase());
        html += `<span class="detail-badge genre-tag${fav ? " fav" : ""}" data-genre="${g.replace(/"/g, "&quot;")}">${g}</span>`;
      });
      html += "</div>";
    }

    if (data.vote_average != null) {
      html += `<div class="details-rating">${fmtScore(data.vote_average)} / 10 <span class="details-votes">${t("votes", { n: data.vote_count || 0 })}</span></div>`;
    }
    html += "</div>";

    html += '<div class="details-main">';

    if (data.tagline) {
      html += `<div class="details-tagline">${data.tagline}</div>`;
    }

    if (data.overview) {
      html += `<p class="details-overview">${data.overview}</p>`;
    }

    if (data.cast && data.cast.length) {
      html += '<div class="details-cast"><div class="details-cast-list">';
      data.cast.forEach((c) => {
        const img = c.profile_path
          ? `<img class="cast-avatar" src="${IMAGE_BASE}${c.profile_path}" alt="${c.name}" />`
          : `<div class="cast-avatar cast-avatar-fallback">${c.name.charAt(0)}</div>`;
        const fav = c.id && favActors.has(String(c.id)) ? " fav" : "";
        html += `<div class="cast-item" data-person-id="${c.id || ""}" role="button" tabindex="0">${img}<div class="cast-info"><div class="cast-name">${c.name}</div><div class="cast-char">${c.character || ""}</div></div>${
          c.id ? `<button class="cast-fav${fav}" data-person-id="${c.id}" data-person-name="${c.name.replace(/"/g, "&quot;")}" data-tip="${t("fav_actor")}">${HEART_SVG}</button>` : ""
        }</div>`;
      });
      html += "</div></div>";
    }

    html += "</div></div>";

    body.innerHTML = html;
    body.querySelectorAll(".cast-item").forEach((el) => {
      const pid = el.dataset.personId;
      if (!pid) return;
      el.onclick = () => openPerson(pid, el.querySelector(".cast-name").textContent);
    });
    body.querySelectorAll(".cast-fav").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleFavActor(btn);
      };
    });
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

async function toggleFavActor(btn) {
  const personId = btn.dataset.personId;
  const name = btn.dataset.personName || "";
  const prevFav = favActors.has(personId);
  try {
    const r = await fetch("/api/fav_actors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person_id: personId, name }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    if (j.added) favActors.set(personId, name);
    else favActors.delete(personId);
    btn.classList.toggle("fav", j.added);
    toast(j.added ? t("fav_actor_added") : t("fav_actor_removed"));
  } catch (err) {
    if (prevFav) favActors.delete(personId);
    else favActors.delete(personId);
    btn.classList.toggle("fav", prevFav);
    toast(errText(err.message) || t("error"));
  }
}

async function openPerson(personId, name) {
  const modal = document.getElementById("person-modal");
  const body = document.getElementById("person-body");
  document.getElementById("person-title").textContent = name || "";
  body.innerHTML = `<div class="releases-loading">${t("loading")}</div>`;
  modal.style.display = "flex";
  try {
    const res = await fetch(`/api/person/${encodeURIComponent(personId)}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${errText(data.error) || t("data_failed")}</div>`;
      return;
    }
if (!data.length) {
    grid.innerHTML = "";
    toast(mode === "actor" ? t("no_actor_results") : mode === "genre" ? t("no_genre_results") : t("no_show_results"));
    return;
  }
    const grid = document.createElement("div");
    grid.className = "poster-grid person-grid";
data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
<div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${item.media_type === "tv" && item.number_of_seasons ? `<div class="season-line"><span class="season-count-badge">${t("seasons", { n: item.number_of_seasons })}</span>${item.number_of_episodes ? `<span class="episode-count">${t("episodes", { n: item.number_of_episodes })}</span>` : ""}</div>` : `<div class="season-line"></div>`}
          ${item.release_date ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>` : ""}
        </div>
        </div>
        ${item.media_type === "tv" ? `<button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>` : ""}
        <button class="remove" style="display:block" data-tip="${t("follow")}">+</button>
      `;
      div.querySelector(".remove").onclick = async (e) => {
        e.stopPropagation();
        const r = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdb_id: item.tmdb_id,
            media_type: item.media_type,
            title: item.title,
            poster_path: item.poster_path,
          }),
        });
        const j = await r.json();
        toast(r.ok ? t("added") : j.error || t("error"));
        if (r.ok) {
          loadFollowed();
          switchView("followed");
          modal.style.display = "none";
        }
      };
      const calBtn = div.querySelector(".calendar-btn");
      if (calBtn) {
        calBtn.onclick = (e) => {
          e.stopPropagation();
          openReleases(item.media_type, item.tmdb_id, item.title);
        };
      }
      div.onclick = () => {
        openDetails(item.media_type, item.tmdb_id, item.title);
        modal.style.display = "none";
      };
      grid.appendChild(div);
      applyTitleHint(div);
    });
    body.innerHTML = "";
    body.appendChild(grid);
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

document.getElementById("person-close").onclick = () => {
  document.getElementById("person-modal").style.display = "none";
};
document.getElementById("person-modal").onclick = (e) => {
  if (e.target === e.currentTarget) document.getElementById("person-modal").style.display = "none";
};

// ---- Followed ----
async function loadFollowed() {
  const res = await fetch("/api/followed");
  let items = await res.json();
  items = applySort(items);
  const grid = document.getElementById("poster-grid");
  const empty = document.getElementById("empty-followed");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${
            item.media_type === "tv"
              ? item.next_episode
                ? isToday(item.next_episode.air_date)
                  ? `<div class="next-ep today">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} ${t("today_airing")}</div>`
                  : `<div class="next-ep">S${String(item.next_episode.season).padStart(2, "0")}E${String(item.next_episode.episode).padStart(2, "0")} · ${isMobile() ? shortDateShort(item.next_episode.air_date) : shortDate(item.next_episode.air_date)}${isMobile() ? "" : " · "}<span class="next-ep-days" data-tip="${daysHint(item.next_episode.air_date)}">${daysUntil(item.next_episode.air_date)}</span></div>`
                : `<div class="next-ep muted">${t("new_season")}</div>`
              : item.release_date
                ? dateState(item.release_date) === "date-past"
                  ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
                  : dateState(item.release_date) === "date-today"
                    ? `<div class="next-ep today">${formatDate(item.release_date).text} ${t("today_theaters")}</div>`
                    : `<div class="next-ep">${formatDate(item.release_date).text} · <span class="next-ep-days" data-tip="${daysHint(item.release_date)}">${daysUntil(item.release_date)}</span></div>`
                : `<div>${t("date_unknown")}</div>`
          }
          ${item.notified ? `<div style="color:#6ee7a0">${t("notified")}</div>` : ""}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      <button class="remove" data-tip="${t("unfollow_title")}">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        t("unfollow_confirm", { title: item.title }),
        async () => {
          await fetch(`/api/unfollow/${item.id}`, { method: "DELETE" });
          loadFollowed();
          toast(t("unfollowed"));
        }
      );
    };
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openReleases(item.media_type, item.tmdb_id, item.title);
    };
    div.onclick = () => {
      openDetails(item.media_type, item.tmdb_id, item.title);
    };
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

// ---- Anime ----
function animeNextText(next, status) {
  if (!next) {
    if (status === "FINISHED") return `<div class="next-ep muted">${t("anime_status_finished")}</div>`;
    return "";
  }
  const d = new Date(next.airing_at * 1000);
  const now = Date.now();
  const diffDays = Math.floor((d.getTime() - now) / 86400000);
  if (diffDays <= 0) return `<div class="next-ep today">EP ${next.episode} ${t("today_airing")}</div>`;
  const loc = tzLocale();
  let txt;
  try {
    txt = new Intl.DateTimeFormat(loc, { day: "numeric", month: isMobile() ? "short" : "long" }).format(d);
  } catch (e) {
    txt = d.toLocaleDateString();
  }
  return `<div class="next-ep anime-ep"><span>EP ${next.episode} · ${txt}</span><span class="next-ep-sep">·</span><span class="next-ep-days">${diffDays}</span></div>`;
}

function animeStatusLabel(status) {
  const s = (status || "").toUpperCase();
  if (s === "RELEASING") return t("anime_status_releasing");
  if (s === "FINISHED") return t("anime_status_finished");
  if (s === "NOT_YET_RELEASED") return t("anime_status_upcoming");
  return s;
}

async function loadAnime() {
  const res = await fetch("/api/anime/followed");
  let items = await res.json();
  items = applySort(items);
  const grid = document.getElementById("anime-grid");
  const empty = document.getElementById("empty-anime");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${animeNextText(item.next_episode, item.status)}
        </div>
      </div>
      <button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>
      <button class="remove" data-tip="${t("unfollow_title")}">&times;</button>
    `;
    div.querySelector(".remove").onclick = (e) => {
      e.stopPropagation();
      showConfirm(
        t("unfollow_confirm", { title: item.title }),
        async () => {
          await fetch(`/api/anime/unfollow/${item.id}`, { method: "DELETE" });
          loadAnime();
          toast(t("unfollowed"));
        }
      );
    };
    div.querySelector(".calendar-btn").onclick = (e) => {
      e.stopPropagation();
      openAnimeSchedule(item.id, item.title);
    };
    div.onclick = () => openAnimeDetails(item.id, item.anilist_id, item.title);
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

async function openAnimeDetails(dbId, anilistId, title) {
  const modal = document.getElementById("details-modal");
  const body = document.getElementById("details-body");
  const calBtn = document.getElementById("details-calendar");
  document.getElementById("details-title").textContent = title || "";
  body.innerHTML = `<div class="releases-loading">${t("loading")}</div>`;
  modal.style.display = "flex";
  if (dbId) {
    calBtn.style.display = "flex";
    calBtn.onclick = () => {
      closeDetails();
      openAnimeSchedule(dbId, title);
    };
  } else {
    calBtn.style.display = "none";
  }

  try {
    const res = await fetch(`/api/anime/details?anilist_id=${encodeURIComponent(anilistId)}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${errText(data.error) || t("data_failed")}</div>`;
      return;
    }
    document.getElementById("details-title").textContent = data.title || title || "";

    let html = '<div class="details-wrap">';
    html += '<div class="details-poster-col">';
    if (data.cover_url) {
      html += `<img class="details-poster" src="${data.cover_url}" alt="${data.title}" />`;
    }

    const badges = [];
    badges.push(t("tab_anime"));
    if (data.format) badges.push(data.format);
    if (data.status) badges.push(animeStatusLabel(data.status));
    if (data.episodes) badges.push(t("episodes", { n: data.episodes }));
    if (data.duration) badges.push(fmtRuntime(data.duration));
    if (data.start_date) badges.push(String(data.start_date));
    if (data.studios && data.studios.length) badges.push(data.studios.join(", "));

    html += '<div class="details-meta">';
    badges.forEach((b) => {
      html += `<span class="detail-badge">${b}</span>`;
    });
    html += "</div>";

    if (data.genres && data.genres.length) {
      html += '<div class="genre-tags">';
      data.genres.forEach((g) => {
        html += `<span class="detail-badge genre-tag${favGenres.has(g) ? " fav" : ""}" data-genre="${g.replace(/"/g, "&quot;")}">${g}</span>`;
      });
      html += "</div>";
    }

    if (data.score != null) {
      html += `<div class="details-rating">${fmtScore(data.score / 10)} / 10</div>`;
    }
    html += "</div>";

    html += '<div class="details-main">';

    if (data.description) {
      html += `<div class="details-tagline" style="white-space:pre-wrap">${data.description.replace(/<[^>]*>/g, "")}</div>`;
    }

    if (data.characters && data.characters.length) {
      html += '<div class="details-cast"><div class="details-cast-list">';
      data.characters.forEach((c) => {
        const img = c.image
          ? `<img class="cast-avatar" src="${c.image}" alt="${c.name}" />`
          : `<div class="cast-avatar cast-avatar-fallback">${c.name.charAt(0)}</div>`;
        html += `<div class="cast-item">${img}<div class="cast-info"><div class="cast-name">${c.name}</div></div></div>`;
      });
      html += "</div></div>";
    }

    html += "</div></div>";

    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

async function openAnimeSchedule(id, title) {
  const modal = document.getElementById("releases-modal");
  const body = document.getElementById("releases-body");
  document.getElementById("releases-title").textContent = title || "";
  body.innerHTML = `<div class="releases-loading">${t("loading")}</div>`;
  modal.style.display = "flex";

  try {
    const res = await fetch(`/api/anime/schedule?anime_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) {
      body.innerHTML = `<div class="releases-error">${errText(data.error) || t("data_failed")}</div>`;
      return;
    }
    document.getElementById("releases-title").textContent = data.title || title || "";

    if (!data.items.length) {
      body.innerHTML = `<div class="releases-error">${t("no_release_date")}</div>`;
      return;
    }

    const loc = tzLocale();
    let html = `<table class="releases-table"><thead><tr><th>${t("col_episode")}</th><th>${t("col_date")}</th></tr></thead><tbody>`;
    data.items.forEach((it) => {
      const d = it.airing_at ? new Date(it.airing_at * 1000) : null;
      const now = Date.now();
      let dateText = "—";
      let cls = "";
      if (d && !isNaN(d.getTime())) {
        try {
          dateText = new Intl.DateTimeFormat(loc, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
        } catch (e) {
          dateText = d.toLocaleString();
        }
        if (d.getTime() < now) cls = "date-past";
        else if (d.getTime() > now) cls = "date-future";
        else cls = "date-today";
      }
      html += `<tr><td><span class="episode-label">${t("col_episode")} ${it.episode}</span></td><td class="${cls}">${dateText}</td></tr>`;
    });
    html += "</tbody></table>";
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

// ---- Combo search (chips) ----
let searchMedia = "show"; // show | anime
const chips = []; // {type: "actor"|"genre"|"year"|"score", label, value}

function currentMedia() {
  return searchMedia;
}

function setMedia(media) {
  searchMedia = media;
  document.getElementById("media-show").classList.toggle("active", media === "show");
  document.getElementById("media-anime").classList.toggle("active", media === "anime");
  const ph = media === "anime" ? "anime_placeholder" : "search_placeholder";
  const comboInput = document.getElementById("search-input");
  const normalInput = document.getElementById("normal-search-input");
  if (comboInput) {
    comboInput.dataset.i18n = ph;
    comboInput.placeholder = t(ph);
  }
  if (normalInput) {
    normalInput.dataset.i18n = ph;
    normalInput.placeholder = t(ph);
  }
}

document.getElementById("media-show").onclick = () => setMedia("show");
document.getElementById("media-anime").onclick = () => setMedia("anime");

function renderChips() {
  const box = document.getElementById("filter-chips");
  box.innerHTML = chips
    .map(
      (c, i) => `<span class="chip">${c.label}<button class="chip-x" data-i="${i}">✕</button></span>`
    )
    .join("");
  box.querySelectorAll(".chip-x").forEach((btn) => {
    btn.onclick = () => {
      chips.splice(Number(btn.dataset.i), 1);
      renderChips();
    };
  });
  if (!chips.length) {
    document.getElementById("search-results").innerHTML = "";
    document.getElementById("anime-results").innerHTML = "";
    setResultsTitle("");
    closeResultsModal();
  }
}

function openValueModal(kind) {
  const title = document.getElementById("value-title");
  const input = document.getElementById("value-input");
  title.textContent = t(kind === "year" ? "search_type_year" : "search_type_score");
  input.dataset.filter = kind;
  input.value = "";
  input.maxLength = kind === "year" ? 4 : 3;
  input.placeholder = t(kind === "year" ? "year_placeholder" : "score_placeholder");
  document.getElementById("value-modal").style.display = "flex";
  input.focus();
}

function setSearchBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span>';
    btn.disabled = true;
  } else {
    if (btn.dataset.orig) btn.innerHTML = btn.dataset.orig;
    btn.disabled = false;
  }
}

function runSearch() {
  const q = (document.getElementById("search-input")?.value || "").trim();
  const media = currentMedia();
  if (!q && !chips.length) return;
  const btn = document.getElementById("search-btn");
  setSearchBtnLoading(btn, true);
  doComboSearch(q, chips, media).finally(() => setSearchBtnLoading(btn, false));
}

document.getElementById("search-btn")?.addEventListener("click", runSearch);
document.getElementById("search-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch();
});

function runNormalSearch() {
  const q = document.getElementById("normal-search-input").value.trim();
  if (!q) return;
  const btn = document.getElementById("normal-search-btn");
  setSearchBtnLoading(btn, true);
  const media = currentMedia();
  const p = media === "anime" ? doAnimeTitleSearch(q) : doTitleSearch(q);
  p.finally(() => setSearchBtnLoading(btn, false));
}

async function doTitleSearch(q) {
  const res = await fetch("/api/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const grid = document.getElementById("search-results");
  const animeGrid = document.getElementById("anime-results");
  grid.innerHTML = "";
  animeGrid.style.display = "none";
  grid.style.display = "";
  setResultsTitle(q);
  openResultsModal();
  if (!res.ok) {
    toast(errText(data.error) || t("search_error"));
    return;
  }
  if (!data.length) {
    grid.innerHTML = `<div class="empty">${t("no_results")}</div>`;
    return;
  }
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${item.media_type === "tv" && item.number_of_seasons ? `<div class="season-line"><span class="season-count-badge">${t("seasons", { n: item.number_of_seasons })}</span>${item.number_of_episodes ? `<span class="episode-count">${t("episodes", { n: item.number_of_episodes })}</span>` : ""}</div>` : `<div class="season-line"></div>`}
          ${item.release_date ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>` : ""}
        </div>
      </div>
      ${item.media_type === "tv" ? `<button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>` : ""}
      <button class="remove" style="display:block" data-tip="${t("follow")}">+</button>
    `;
    div.querySelector(".remove").onclick = async (e) => {
      e.stopPropagation();
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
        }),
      });
      const j = await r.json();
      toast(r.ok ? t("added") : j.error || t("error"));
      if (r.ok) switchView("followed");
    };
    const calBtn = div.querySelector(".calendar-btn");
    if (calBtn) {
      calBtn.onclick = (e) => {
        e.stopPropagation();
        openReleases(item.media_type, item.tmdb_id, item.title);
      };
    }
    div.onclick = () => openDetails(item.media_type, item.tmdb_id, item.title);
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

async function doAnimeTitleSearch(q) {
  const res = await fetch("/api/anime/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const grid = document.getElementById("search-results");
  const animeGrid = document.getElementById("anime-results");
  grid.style.display = "none";
  animeGrid.innerHTML = "";
  animeGrid.style.display = "";
  setResultsTitle(q);
  openResultsModal();
  if (!res.ok) {
    toast(errText(data.error) || t("search_error"));
    return;
  }
  if (!data.length) {
    animeGrid.innerHTML = `<div class="empty">${t("no_results")}</div>`;
    return;
  }
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${item.status ? `<span class="badge badge-anime-status">${animeStatusLabel(item.status)}</span>` : ""}
          ${animeNextText(item.next_episode ? { episode: item.next_episode, airing_at: item.airing_at } : null)}
        </div>
      </div>
      <button class="remove" style="display:block" data-tip="${t("follow")}">+</button>
    `;
    div.querySelector(".remove").onclick = async (e) => {
      e.stopPropagation();
      const r = await fetch("/api/anime/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anilist_id: item.anilist_id }),
      });
      const j = await r.json();
      toast(r.ok ? t("added") : j.error || t("error"));
      if (r.ok) switchView("anime");
    };
    div.onclick = () => openAnimeDetails(null, item.anilist_id, item.title);
    animeGrid.appendChild(div);
    applyTitleHint(div);
  });
}

document.getElementById("normal-search-btn").onclick = runNormalSearch;
document.getElementById("normal-search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runNormalSearch();
});
document.getElementById("search-input")?.addEventListener("input", (e) => {
  const filter = e.target.dataset.filter;
  if (!filter) return;
  const cleaned = filter === "year" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value.replace(/[^0-9.,]/g, "");
  if (cleaned !== e.target.value) {
    const pos = e.target.selectionStart;
    e.target.value = cleaned;
    e.target.setSelectionRange(pos - 1, pos - 1);
  }
});

document.getElementById("filter-actor").onclick = () => openPicker("fav_actor");
document.getElementById("filter-genre").onclick = () => openPicker("fav_genre");
document.getElementById("filter-year").onclick = () => openValueModal("year");
document.getElementById("filter-score").onclick = () => openValueModal("score");

// Value modal
document.getElementById("value-close").onclick = () => {
  document.getElementById("value-modal").style.display = "none";
};
document.getElementById("value-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) document.getElementById("value-modal").style.display = "none";
});
document.getElementById("value-cancel").onclick = () => {
  document.getElementById("value-modal").style.display = "none";
};
document.getElementById("value-go").onclick = () => {
  const kind = document.getElementById("value-input").dataset.filter;
  const val = document.getElementById("value-input").value.trim();
  const nowYear = new Date().getFullYear();
  if (kind === "year") {
    if (!/^\d{4}$/.test(val)) {
      toast(t("year_invalid", { max: nowYear }));
      return;
    }
    const y = parseInt(val, 10);
    if (y < 1900 || y > nowYear) {
      toast(t("year_invalid", { max: nowYear }));
      return;
    }
  } else {
    const norm = val.replace(",", ".");
    if (!/^(10|\d(\.\d)?)$/.test(norm)) {
      toast(t("score_invalid"));
      return;
    }
    const s = parseFloat(norm);
    if (s < 0 || s > 10) {
      toast(t("score_invalid"));
      return;
    }
  }
  chips.push({ type: kind, label: val, value: val });
  document.getElementById("value-modal").style.display = "none";
  renderChips();
};

function setResultsTitle(text) {
  const el = document.getElementById("results-title");
  if (el) el.textContent = text || "";
}

function openResultsModal() {
  document.getElementById("search-results-modal").style.display = "flex";
}

function closeResultsModal() {
  document.getElementById("search-results-modal").style.display = "none";
}

function comboTitle(chipsArr) {
  const parts = [];
  const q = (document.getElementById("search-input")?.value || "").trim();
  if (q) parts.push(q);
  chipsArr.forEach((c) => {
    if (c.type === "actor") parts.push(`${c.label}`);
    else if (c.type === "genre") parts.push(`${c.label}`);
    else if (c.type === "year") parts.push(`${c.label}`);
    else if (c.type === "score") parts.push(`${c.label}`);
  });
  return parts.join(" • ");
}

async function doComboSearch(q, chipsArr, media) {
  const params = new URLSearchParams();
  params.set("media", media);
  if (q) params.set("q", q);
  const actors = chipsArr.filter((c) => c.type === "actor").map((c) => c.value).join(",");
  const genres = chipsArr.filter((c) => c.type === "genre").map((c) => c.value).join(",");
  const year = chipsArr.filter((c) => c.type === "year").map((c) => c.value)[0] || "";
  const score = chipsArr.filter((c) => c.type === "score").map((c) => c.value)[0] || "";
  if (actors) params.set("actors", actors);
  if (genres) params.set("genres", genres);
  if (year) params.set("year", year);
  if (score) params.set("score", score);
  const res = await fetch("/api/combo-search?" + params.toString());
  const data = await res.json();
  const grid = document.getElementById("search-results");
  const animeGrid = document.getElementById("anime-results");
  grid.innerHTML = "";
  animeGrid.innerHTML = "";
  setResultsTitle(comboTitle(chipsArr));
  openResultsModal();
  if (!res.ok) {
    grid.style.display = "";
    animeGrid.style.display = "none";
    toast(errText(data.error) || t("search_error"));
    return;
  }
  const actorLabel = actors
    ? chipsArr.filter((c) => c.type === "actor").map((c) => c.label).join(", ")
    : "";
  const genreLabel = genres ? chipsArr.filter((c) => c.type === "genre").map((c) => c.label).join(", ") : "";
  if (media === "anime") {
    grid.style.display = "none";
    animeGrid.style.display = "";
    if (!data.length) {
      animeGrid.innerHTML = `<div class="empty">${t("no_results")}</div>`;
      return;
    }
    data.forEach((item) => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML=noPosterFallback()" />` : `<div class="no-poster">${FILM_SVG}</div>`}
        <div class="info">
          <div class="title">${item.title}</div>
          <div class="meta">
            <span class="badge badge-anime">${t("tab_anime")}</span>
            ${item.score ? scoreTag(item.score / 10) : ""}
            ${item.status ? `<span class="badge badge-anime-status">${animeStatusLabel(item.status)}</span>` : ""}
          </div>
        </div>
        <button class="remove" style="display:block" data-tip="${t("follow")}">+</button>
      `;
      div.querySelector(".remove").onclick = async (e) => {
        e.stopPropagation();
        const r = await fetch("/api/anime/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anilist_id: item.anilist_id }),
        });
        const j = await r.json();
        toast(r.ok ? t("added") : j.error || t("error"));
        if (r.ok) doComboSearch(q, chipsArr, media);
      };
      div.onclick = () => openAnimeDetails(null, item.anilist_id, item.title);
      animeGrid.appendChild(div);
    });
    return;
  }
  grid.style.display = "";
  animeGrid.style.display = "none";
  if (!data.length) {
    grid.innerHTML = `<div class="empty">${t("no_results")}</div>`;
    return;
  }
  const hlActor = chipsArr.filter((c) => c.type === "actor").map((c) => c.value)[0];
  data.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${posterHTML(item.poster_path, item.title)}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-${item.media_type}">${typeLabel(item.media_type)}</span>
          ${scoreTag(item.vote_average)}
          ${item.media_type === "tv" && item.number_of_seasons ? `<div class="season-line"><span class="season-count-badge">${t("seasons", { n: item.number_of_seasons })}</span>${item.number_of_episodes ? `<span class="episode-count">${t("episodes", { n: item.number_of_episodes })}</span>` : ""}</div>` : `<div class="season-line"></div>`}
          ${item.release_date ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>` : ""}
        </div>
      </div>
      ${item.media_type === "tv" ? `<button class="calendar-btn" data-tip="${t("calendar_title")}">${CALENDAR_SVG}</button>` : ""}
      <button class="remove" style="display:block" data-tip="${t("follow")}">+</button>
    `;
    div.querySelector(".remove").onclick = async (e) => {
      e.stopPropagation();
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdb_id: item.tmdb_id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
        }),
      });
      const j = await r.json();
      toast(r.ok ? t("added") : j.error || t("error"));
      if (r.ok) doComboSearch(q, chipsArr, media);
    };
    const calBtn = div.querySelector(".calendar-btn");
    if (calBtn) {
      calBtn.onclick = (e) => {
        e.stopPropagation();
        openReleases(item.media_type, item.tmdb_id, item.title);
      };
    }
    div.onclick = () => openDetails(
      item.media_type,
      item.tmdb_id,
      item.title,
      hlActor && /^\d+$/.test(hlActor) ? (favActors.get(hlActor) || "") : hlActor,
      hlActor && /^\d+$/.test(hlActor) ? hlActor : undefined,
      genreLabel || undefined
    );
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

setMedia("show");
renderChips();

let pickerMode = "";
const pickerSelected = new Set();

function openPicker(mode) {
  pickerMode = mode;
  pickerSelected.clear();
  const modal = document.getElementById("picker-modal");
  const title = document.getElementById("picker-title");
  const body = document.getElementById("picker-body");
  if (mode === "fav_actor") {
    title.textContent = t("picker_actor_search");
    const favItems = favActors.size
      ? `<div class="picker-grid actor-grid">${[...favActors.entries()]
          .map(
            ([id, name]) => `<div class="picker-item actor" data-id="${escAttr(id)}" data-name="${escAttr(name)}">
              <span class="picker-name">${escAttr(name)}</span>
              <span class="picker-check">${CHECK_SVG}</span>
            </div>`
          )
          .join("")}</div>`
      : `<div class="picker-empty">${t("no_fav_actor")}</div>`;
    body.innerHTML = `
      <div class="picker-section">
        <div class="picker-section-title">${t("picker_actor_search")}</div>
        <div class="picker-free">
          <input id="picker-free-input" type="text" placeholder="${t("actor_placeholder")}" />
        </div>
      </div>
      <div class="picker-section">
        <div class="picker-section-title">${t("picker_fav_actor_search")}</div>
        ${favItems}
      </div>`;
  } else {
    title.textContent = t("picker_genre_search");
    const favItems = favGenres.size
      ? `<div class="picker-grid genre-grid">${[...favGenres]
          .map(
            (g) => `<div class="picker-item genre" data-id="${escAttr(g)}" data-name="${escAttr(g)}">
              <span class="picker-name">${escAttr(g)}</span>
              <span class="picker-check">${CHECK_SVG}</span>
            </div>`
          )
          .join("")}</div>`
      : `<div class="picker-empty">${t("no_fav_genre")}</div>`;
    body.innerHTML = `
      <div class="picker-section">
        <div class="picker-section-title">${t("picker_genre_search")}</div>
        <div class="picker-free">
          <input id="picker-free-input" type="text" placeholder="${t("genre_placeholder")}" />
        </div>
      </div>
      <div class="picker-section">
        <div class="picker-section-title">${t("picker_fav_genre_search")}</div>
        ${favItems}
      </div>`;
  }
  body.querySelectorAll(".picker-item").forEach((el) => {
    el.onclick = () => {
      el.classList.toggle("sel");
      const id = el.dataset.id;
      if (pickerSelected.has(id)) pickerSelected.delete(id);
      else pickerSelected.add(id);
    };
  });
  modal.style.display = "flex";
  document.getElementById("picker-free-input").focus();
}

document.getElementById("picker-close").onclick = () => {
  document.getElementById("picker-modal").style.display = "none";
};
document.getElementById("picker-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) document.getElementById("picker-modal").style.display = "none";
});
document.getElementById("search-results-close").onclick = closeResultsModal;
document.getElementById("search-results-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeResultsModal();
});
document.getElementById("picker-go").onclick = () => {
  const freeVal = (document.getElementById("picker-free-input")?.value || "").trim();
  if (!pickerSelected.size && !freeVal) {
    toast(pickerMode === "fav_actor" ? t("no_fav_actor") : t("no_fav_genre"));
    return;
  }
  pickerSelected.forEach((id) => {
    const name = pickerMode === "fav_actor" ? favActors.get(id) || id : id;
    chips.push({ type: pickerMode === "fav_actor" ? "actor" : "genre", label: name, value: id });
  });
  if (freeVal) {
    freeVal.split(",").forEach((s) => {
      const v = s.trim();
      if (v) chips.push({ type: pickerMode === "fav_actor" ? "actor" : "genre", label: v, value: v });
    });
  }
  document.getElementById("picker-modal").style.display = "none";
  renderChips();
};

// ---- Search ----
// ---- Settings ----
async function loadTimezones() {
  try {
    const res = await fetch("/api/timezones");
    allTimezones = await res.json();
  } catch (e) {
    console.error("timezone yükleme hatası", e);
  }
}

function renderTzList(query) {
  const list = document.getElementById("s-tz-list");
  const q = (query || "").toLowerCase().trim();
  const matches = q
    ? allTimezones.filter((z) => z.value.toLowerCase().includes(q)).slice(0, 100)
    : allTimezones.slice(0, 100);
  list.innerHTML = matches.map((z) => `<div data-tz="${z.value}">${z.value}</div>`).join("");
  list.style.display = matches.length ? "block" : "none";
  list.querySelectorAll("div").forEach((el) => {
    el.onclick = () => {
      document.getElementById("s-tz").value = el.dataset.tz;
      list.style.display = "none";
      document.getElementById("s-tz").dispatchEvent(new Event("change"));
    };
  });
}

function initTimePicker() {
  const input = document.getElementById("s-hour");
  const list = document.getElementById("s-time-list");
  const hourBody = document.getElementById("s-hour-list");
  const minuteBody = document.getElementById("s-minute-list");
  let open = false;
  let lastHourValue = input.value || "09:00";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    const cur = input.value || "09:00";
    const parts = cur.split(":");
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h) || h < 0 || h > 23) h = 9;
    if (isNaN(m) || m < 0 || m > 59) m = 0;

    hourBody.innerHTML = "";
    for (let i = 0; i < 24; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-cell" + (i === h ? " selected" : "");
      const span = document.createElement("span");
      span.className = "time-num";
      span.textContent = pad(i);
      btn.appendChild(span);
      btn.onclick = (e) => {
        e.stopPropagation();
        pickHour(i);
      };
      hourBody.appendChild(btn);
    }
    minuteBody.innerHTML = "";
    for (let i = 0; i < 60; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-cell" + (i === m ? " selected" : "");
      const span = document.createElement("span");
      span.className = "time-num";
      span.textContent = pad(i);
      btn.appendChild(span);
      btn.onclick = (e) => {
        e.stopPropagation();
        pickMinute(i);
      };
      minuteBody.appendChild(btn);
    }
    const sh = hourBody.children[h];
    if (sh) sh.scrollIntoView({ block: "center" });
    const sm = minuteBody.children[m];
    if (sm) sm.scrollIntoView({ block: "center" });
  }

  let picks = 0;

  function applyPick(val) {
    input.value = val;
    lastHourValue = val;
    picks++;
    if (picks >= 2) {
      list.style.display = "none";
      open = false;
      input.dispatchEvent(new Event("change"));
    } else {
      render();
    }
  }

  function pickHour(i) {
    const parts = input.value.split(":");
    let m = parseInt(parts[1], 10);
    if (isNaN(m) || m < 0 || m > 59) m = 0;
    applyPick(pad(i) + ":" + pad(m));
  }

  function pickMinute(i) {
    const parts = input.value.split(":");
    let h = parseInt(parts[0], 10);
    if (isNaN(h) || h < 0 || h > 23) h = 9;
    applyPick(pad(h) + ":" + pad(i));
  }

  function toggle() {
    if (!open) {
      picks = 0;
      render();
      list.style.display = "flex";
      open = true;
      list.scrollIntoView({ block: "nearest" });
    } else {
      list.style.display = "none";
      open = false;
    }
  }

  document.querySelector(".time-clock").addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });
  input.addEventListener("blur", () => {
    const v = input.value.trim();
    const m = v.match(/^(\d{1,2}):(\d{1,2})$/);
    if (m) {
      const h = parseInt(m[1], 10);
      const mn = parseInt(m[2], 10);
      if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) {
        const norm = pad(h) + ":" + pad(mn);
        if (norm !== input.value) input.value = norm;
        lastHourValue = norm;
      } else {
        input.value = lastHourValue;
      }
    } else {
      input.value = lastHourValue;
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".time-combobox")) {
      list.style.display = "none";
      open = false;
    }
  });
}

function initTzCombo() {
  const input = document.getElementById("s-tz");
  const list = document.getElementById("s-tz-list");
  input.addEventListener("focus", () => renderTzList(input.value));
  input.addEventListener("input", () => renderTzList(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && list.style.display === "block") {
      const first = list.querySelector("div[data-tz]");
      if (first) {
        input.value = first.dataset.tz;
        list.style.display = "none";
        input.dispatchEvent(new Event("change"));
        e.preventDefault();
      }
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tz-combobox")) list.style.display = "none";
  });
}

async function loadSettings() {
  const res = await fetch("/api/settings");
  const s = await res.json();
  document.getElementById("s-tmdb").value = s.tmdb_api_key || "";
  document.getElementById("s-token").value = s.telegram_bot_token || "";
  document.getElementById("s-chat").value = s.telegram_chat_id || "";
  document.getElementById("s-hour").value = s.notify_hour || "09:00";
  document.getElementById("s-ntfy").value = s.ntfy_topic || "";
  await loadTimezones();
  initTzCombo();
  initTimePicker();
  currentTz = s.timezone || "Europe/Istanbul";
  document.getElementById("s-tz").value = currentTz;
  document.getElementById("s-lang").value = s.language || "tr-TR";
  document.getElementById("s-telegram-enabled").checked = (s.telegram_enabled || "1") !== "0";
  document.getElementById("s-ntfy-enabled").checked = (s.ntfy_enabled || "1") !== "0";
  applyLang((s.language || "tr-TR").split("-")[0]);
  updateNotifyToggleStates();
}

function showMsg(text, ok) {
  toast(text, !ok);
}

function closeSettingsMenu() {
  const m = document.getElementById("settings-menu");
  if (m) m.classList.remove("open");
}

let settingsLoaded = false;

function updateNotifyToggleStates() {
  const token = (document.getElementById("s-token").value || "").trim();
  const chat = (document.getElementById("s-chat").value || "").trim();
  const ntfy = (document.getElementById("s-ntfy").value || "").trim();
  const tg = document.getElementById("s-telegram-enabled");
  const nf = document.getElementById("s-ntfy-enabled");
  const tgWrap = tg.closest(".switch");
  const nfWrap = nf.closest(".switch");
  if (!(token && chat)) {
    if (tg.checked) {
      tg.checked = false;
      saveSettingsPartial({ telegram_enabled: "0" });
    }
    tg.disabled = true;
    const tip = !token && !chat ? t("need_bot_chat") : token ? t("need_chat_id") : t("need_bot_token");
    tgWrap.setAttribute("data-tip", tip);
  } else {
    tg.disabled = false;
    tgWrap.removeAttribute("data-tip");
  }
  if (!ntfy) {
    if (nf.checked) {
      nf.checked = false;
      saveSettingsPartial({ ntfy_enabled: "0" });
    }
    nf.disabled = true;
    nfWrap.setAttribute("data-tip", t("need_ntfy_topic"));
  } else {
    nf.disabled = false;
    nfWrap.removeAttribute("data-tip");
  }
}

async function showSettingsSubmodal(id) {
  if (!settingsLoaded) {
    settingsLoaded = true;
    try {
      await loadSettings();
    } catch (e) {
      console.error(e);
    }
  }
  document.querySelectorAll(".settings-modal-overlay").forEach((el) => {
    el.style.display = el.id === id ? "flex" : "none";
  });
  if (id === "settings-favactors-modal") renderFavActorsList();
  if (id === "settings-favgenres-modal") renderFavGenresList();
  if (id === "settings-notify-modal") updateNotifyToggleStates();
  closeSettingsMenu();
}

function closeSettingsModals() {
  document.querySelectorAll(".settings-modal-overlay").forEach((el) => {
    el.style.display = "none";
  });
}

async function renderFavActorsList() {
  const list = document.getElementById("fav-actors-list");
  if (!list) return;
  try {
    const r = await fetch("/api/fav_actors");
    const j = await r.json();
    const actors = j.actors || [];
    if (!actors.length) {
      list.innerHTML = `<div class="fav-empty">${t("no_fav_actor")}</div>`;
      return;
    }
    list.innerHTML = actors
      .map(
        (a) => `<div class="fav-item"><span class="fav-name">${escAttr(a.name)}</span><button class="fav-heart" data-id="${escAttr(a.person_id)}" data-name="${escAttr(a.name)}" data-tip="${t("fav_actor_remove")}">${HEART_SVG}</button></div>`
      )
      .join("");
    list.querySelectorAll(".fav-heart").forEach((btn) => {
      btn.onclick = async () => {
        const r = await fetch("/api/fav_actors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: btn.dataset.id, name: btn.dataset.name }),
        });
        const j = await r.json();
        if (r.ok) {
          favActors.delete(String(btn.dataset.id));
          renderFavActorsList();
          toast(t("fav_actor_removed"));
        }
      };
    });
  } catch (e) {}
}

async function renderFavGenresList() {
  const list = document.getElementById("fav-genres-list");
  if (!list) return;
  try {
    const r = await fetch("/api/fav_genres");
    const j = await r.json();
    const genres = j.genres || [];
    if (!genres.length) {
      list.innerHTML = `<div class="fav-empty">${t("no_fav_genre")}</div>`;
      return;
    }
    list.innerHTML = genres
      .map(
        (g) => `<div class="fav-item"><span class="fav-name">${escAttr(g)}</span><button class="fav-heart" data-name="${escAttr(g)}" data-tip="${t("fav_genre_remove")}">${HEART_SVG}</button></div>`
      )
      .join("");
    list.querySelectorAll(".fav-heart").forEach((btn) => {
      btn.onclick = async () => {
        const r = await fetch("/api/fav_genres", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ genre: btn.dataset.name }),
        });
        const j = await r.json();
        if (r.ok) {
          favGenres.delete(btn.dataset.name);
          renderFavGenresList();
          toast(t("fav_genre_removed"));
        }
      };
    });
  } catch (e) {}
}

document.getElementById("tab-settings").addEventListener("click", (e) => {
  e.stopPropagation();
  sortMenu.classList.remove("open");
  document.getElementById("settings-menu").classList.toggle("open");
});
document.querySelectorAll(".settings-menu-item").forEach((btn) => {
  btn.addEventListener("click", () => showSettingsSubmodal(btn.dataset.target));
});
document.addEventListener("click", (e) => {
  const wrap = document.querySelector(".settings-wrap");
  if (wrap && !wrap.contains(e.target)) closeSettingsMenu();
});
document.querySelectorAll(".settings-modal-close").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const ov = btn.closest(".settings-modal-overlay");
    if (ov) ov.style.display = "none";
  });
});
document.querySelectorAll(".settings-modal-overlay").forEach((ov) => {
  ov.addEventListener("click", (e) => {
    if (e.target === ov) ov.style.display = "none";
  });
});

function showSavedHint(el) {
  if (!el) return;
  clearTimeout(el._savedTimer);
  el.classList.add("show");
  el._savedTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

async function saveSettingsPartial(patch, hintEl) {
  try {
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      showSavedHint(hintEl);
      if ("tmdb_api_key" in patch) checkTmdbKey(patch.tmdb_api_key);
      return true;
    }
    toast(t("save_failed"), true);
    return false;
  } catch (e) {
    toast(t("save_failed"), true);
    return false;
  }
}

function bindAutoSave(id, key, transform) {
  const el = document.getElementById(id);
  const hint = el.closest("label").querySelector(".saved-hint");
  el.addEventListener("blur", () => {
    const patch = {};
    patch[key] = transform ? transform(el.value) : el.value;
    saveSettingsPartial(patch, hint);
  });
}

bindAutoSave("s-tmdb", "tmdb_api_key", (v) => v.trim());
bindAutoSave("s-token", "telegram_bot_token", (v) => v.trim());
bindAutoSave("s-chat", "telegram_chat_id", (v) => v.trim());
bindAutoSave("s-ntfy", "ntfy_topic", (v) => v.trim());

document.getElementById("s-lang").addEventListener("change", () => {
  const el = document.getElementById("s-lang");
  const hint = el.closest("label").querySelector(".saved-hint");
  saveSettingsPartial({ language: el.value }, hint).then((ok) => {
    if (ok) applyLang(el.value.split("-")[0]);
  });
});

document.getElementById("s-tz").addEventListener("change", () => {
  const el = document.getElementById("s-tz");
  const hint = el.closest("label").querySelector(".saved-hint");
  saveSettingsPartial({ timezone: el.value }, hint).then((ok) => {
    if (ok) currentTz = el.value;
  });
});

document.getElementById("s-hour").addEventListener("change", () => {
  const el = document.getElementById("s-hour");
  const hint = el.closest("label").querySelector(".saved-hint");
  saveSettingsPartial({ notify_hour: el.value }, hint);
});

document.getElementById("s-telegram-enabled").addEventListener("change", (e) => {
  saveSettingsPartial({ telegram_enabled: e.target.checked ? "1" : "0" }, document.getElementById("notify-saved-hint"));
});
document.getElementById("s-ntfy-enabled").addEventListener("change", (e) => {
  saveSettingsPartial({ ntfy_enabled: e.target.checked ? "1" : "0" }, document.getElementById("notify-saved-hint"));
});

document.getElementById("test-settings").onclick = async () => {
  const body = {
    telegram_bot_token: document.getElementById("s-token").value.trim(),
    telegram_chat_id: document.getElementById("s-chat").value.trim(),
    ntfy_topic: document.getElementById("s-ntfy").value.trim(),
  };
  const r = await fetch("/api/settings/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  showMsg(r.ok ? t("test_sent") : j.error || t("error"), r.ok);
};

let lastView = "followed";
  try {
    lastView = localStorage.getItem("activeView") || "followed";
  } catch (e) {}
  if (!views[lastView]) lastView = "followed";
  switchView(lastView);

(async () => {
  try {
    const res = await fetch("/api/settings");
    const s = await res.json();
    tmdbKeySet = !!s.tmdb_api_key;
    if (s.language) {
      currentTz = s.timezone || currentTz;
      applyLang(s.language.split("-")[0]);
    }
    checkTmdbKey(tmdbKeySet);
  } catch (e) {
    /* varsayılan dil */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_genres");
    const s = await res.json();
    if (s.genres) favGenres = new Set(s.genres);
  } catch (e) {
    /* yoksay */
  }
})();

(async () => {
  try {
    const res = await fetch("/api/fav_actors");
    const s = await res.json();
    if (s.actors) favActors = new Map((s.actors || []).map((a) => [a.person_id, a.name]));
  } catch (e) {
    /* yoksay */
  }
})();

document.getElementById("details-modal").addEventListener("click", async (e) => {
  const tag = e.target.closest(".genre-tag");
  if (!tag) return;
  e.stopPropagation();
  const genre = tag.dataset.genre;
  const prevFav = favGenres.has(genre);
  favGenres.add(genre);
  tag.classList.add("fav");
  try {
    const r = await fetch("/api/fav_genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genre }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    favGenres = new Set(j.genres);
    if (!j.added) tag.classList.remove("fav");
  } catch (err) {
    if (prevFav) favGenres.delete(genre);
    else favGenres.delete(genre);
    if (prevFav) tag.classList.remove("fav");
    toast(errText(err.message) || t("error"));
  }
});

// ---- Custom tooltip ----
let tipEl = null;
function showTip(text, x, y) {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.className = "app-tip";
    document.body.appendChild(tipEl);
  }
  tipEl.textContent = text;
  tipEl.classList.add("show");
  const r = tipEl.getBoundingClientRect();
  let left = x + 14;
  let top = y + 14;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 14;
  tipEl.style.left = left + "px";
  tipEl.style.top = top + "px";
}

function hideTip() {
  if (tipEl) tipEl.classList.remove("show");
}

const tmdbClose = document.getElementById("tmdb-key-close");
if (tmdbClose) {
  tmdbClose.addEventListener("click", () => {
    const b = document.getElementById("tmdb-key-banner");
    if (b) b.style.display = "none";
  });
}

document.addEventListener("click", (e) => {
  const sw = e.target.closest(".switch[data-tip]");
  if (sw) {
    const r = sw.getBoundingClientRect();
    showTip(sw.dataset.tip, r.left + r.width / 2, r.top - 6);
    setTimeout(hideTip, 2500);
  }
});

document.addEventListener("mouseover", (e) => {
  const el = e.target.closest("[data-tip]");
  if (el && el.dataset.tip) showTip(el.dataset.tip, e.clientX, e.clientY);
});

document.addEventListener("mousemove", (e) => {
  if (tipEl && tipEl.classList.contains("show")) {
    const r = tipEl.getBoundingClientRect();
    let left = e.clientX + 14;
    let top = e.clientY + 14;
    if (left + r.width > window.innerWidth - 8) left = e.clientX - r.width - 14;
    if (top + r.height > window.innerHeight - 8) top = e.clientY - r.height - 14;
    tipEl.style.left = left + "px";
    tipEl.style.top = top + "px";
  }
});

document.addEventListener("mouseout", (e) => {
  if (e.target.closest("[data-tip]")) hideTip();
});
