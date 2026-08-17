const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

let currentLang = "tr";
const I18N = {
  app_title: { tr: "Takip Listesi", en: "Watchlist", de: "Watchlist", fr: "Ma liste", es: "Mi lista", it: "Watchlist", ru: "Список просмотра", ar: "قائمة المشاهدة", pt: "Minha lista", nl: "Watchlist", pl: "Lista śledzenia", ja: "ウォッチリスト", ko: "시청 목록", zh: "观看列表" },
  logo_title: { tr: "Dizi / Film Takip", en: "TV / Movie Tracker", de: "Serien / Film Tracker", fr: "Suivi Séries / Films", es: "Seguimiento de Series / Pelis", it: "Tracker Serie / Film", ru: "Трекер сериалов и фильмов", ar: "متابعة المسلسلات والأفلام", pt: "Acompanhamento de Séries / Filmes", nl: "Serie / Film Tracker", pl: "Śledzenie seriali / filmów", ja: "ドラマ・映画追跡", ko: "드라마·영화 추적", zh: "剧集 / 电影追踪" },
  tab_followed: { tr: "Dizi & Film", en: "Shows & Movies", de: "Serien & Filme", fr: "Séries & Films", es: "Series y Películas", it: "Serie e Film", ru: "Сериалы и фильмы", ar: "مسلسلات وأفلام", pt: "Séries e Filmes", nl: "Series en Films", pl: "Seriale i filmy", ja: "アニメと映画", ko: "시리즈 및 영화", zh: "剧集和电影" },
  tab_search: { tr: "Ara & Ekle", en: "Search & Add", de: "Suchen & Hinzufügen", fr: "Rechercher & Ajouter", es: "Buscar & Añadir", it: "Cerca & Aggiungi", ru: "Поиск и добавление", ar: "بحث وإضافة", pt: "Pesquisar & Adicionar", nl: "Zoeken & Toevoegen", pl: "Szukaj i dodaj", ja: "検索と追加", ko: "검색 및 추가", zh: "搜索和添加" },
  tab_anime: { tr: "Anime", en: "Anime", de: "Anime", fr: "Anime", es: "Anime", it: "Anime", ru: "Аниме", ar: "أنمي", pt: "Anime", nl: "Anime", pl: "Anime", ja: "アニメ", ko: "애니메", zh: "动漫" },
  anime_placeholder: { tr: "Anime ara...", en: "Search anime...", de: "Anime suchen...", fr: "Rechercher un anime...", es: "Buscar anime...", it: "Cerca anime...", ru: "Поиск аниме...", ar: "ابحث عن أنمي...", pt: "Pesquisar anime...", nl: "Anime zoeken...", pl: "Szukaj anime...", ja: "アニメを検索...", ko: "애니메 검색...", zh: "搜索动漫..." },
  anime_empty_1: { tr: "Henüz takip ettiğiniz anime yok.", en: "No anime in your list yet.", de: "Noch kein Anime in Ihrer Liste.", fr: "Aucun anime dans votre liste pour l'instant.", es: "Aún no hay anime en tu lista.", it: "Non c'è ancora nessun anime nella tua lista.", ru: "В вашем списке пока нет аниме.", ar: "لا يوجد أنمي في قائمتك بعد.", pt: "Nenhum anime na sua lista ainda.", nl: "Nog geen anime in uw lijst.", pl: "Na razie nie masz anime na liście.", ja: "リストにはまだアニメがありません。", ko: "목록에 아직 애니메가 없습니다.", zh: "列表中还没有动漫。" },
  anime_empty_2: { tr: "Yayınlanmasını istediğiniz animeleri arayın ve ekleyin.", en: "Search and add the anime you want to track.", de: "Suchen Sie das Anime, das Sie verfolgen möchten.", fr: "Recherchez et ajoutez l'anime que vous voulez suivre.", es: "Busca y añade el anime que quieras seguir.", it: "Cerca e aggiungi l'anime che vuoi seguire.", ru: "Найдите и добавьте аниме, за которым хотите следить.", ar: "ابحث وأضف الأنمي الذي تريد متابعته.", pt: "Pesquise e adicione o anime que deseja acompanhar.", nl: "Zoek en voeg de anime toe die u wilt volgen.", pl: "Znajdź i dodaj anime, które chcesz śledzić.", ja: "追跡したいアニメを検索して追加してください。", ko: "추적하고 싶은 애니메를 검색해 추가하세요.", zh: "搜索并添加您想关注的动漫。" },
  anime_status_releasing: { tr: "Yayında", en: "Airing", de: "Läuft", fr: "En cours", es: "En emisión", it: "In onda", ru: "Идёт", ar: "يُعرض", pt: "No ar", nl: "Wordt uitgezonden", pl: "W emisji", ja: "放送中", ko: "방영 중", zh: "播出中" },
  anime_status_finished: { tr: "Bitti", en: "Finished", de: "Abgeschlossen", fr: "Terminé", es: "Terminado", it: "Finito", ru: "Завершено", ar: "منتهي", pt: "Finalizado", nl: "Voltooid", pl: "Zakończone", ja: "完結", ko: "완결", zh: "已完结" },
  anime_status_upcoming: { tr: "Yakında", en: "Upcoming", de: "Demnächst", fr: "À venir", es: "Próximamente", it: "In arrivo", ru: "Скоро", ar: "قريبًا", pt: "Em breve", nl: "Binnenkort", pl: "Wkrótce", ja: "近日", ko: "곧", zh: "即将" },
  search_type_show: { tr: "Dizi & Film", en: "Shows & Movies", de: "Serien & Filme", fr: "Séries & Films", es: "Series y Películas", it: "Serie e Film", ru: "Сериалы и фильмы", ar: "مسلسلات وأفلام", pt: "Séries e Filmes", nl: "Series en Films", pl: "Seriale i filmy", ja: "アニメと映画", ko: "시리즈 및 영화", zh: "剧集和电影" },
  search_type_anime: { tr: "Anime", en: "Anime", de: "Anime", fr: "Anime", es: "Anime", it: "Anime", ru: "Аниме", ar: "أنمي", pt: "Anime", nl: "Anime", pl: "Anime", ja: "アニメ", ko: "애니메", zh: "动漫" },
  empty_1: { tr: "Henüz takip ettiğiniz bir şey yok.", en: "Nothing in your list yet.", de: "Noch nichts in Ihrer Liste.", fr: "Rien dans votre liste pour l'instant.", es: "Aún no hay nada en tu lista.", it: "Non c'è ancora nulla nella tua lista.", ru: "В вашем списке пока ничего нет.", ar: "لا يوجد شيء في قائمتك بعد.", pt: "Nada na sua lista ainda.", nl: "Nog niets in uw lijst.", pl: "Na razie nic nie masz na liście.", ja: "リストにはまだ何もありません。", ko: "아직 목록에 아무것도 없습니다.", zh: "列表中还没有任何内容。" },
  empty_2: { tr: "Yayınlanmasını istediğiniz dizi ve filmleri ekleyin.", en: "Add the shows and movies you want to track.", de: "Fügen Sie die Serien und Filme hinzu, die Sie verfolgen möchten.", fr: "Ajoutez les séries et films que vous souhaitez suivre.", es: "Añade las series y películas que quieras seguir.", it: "Aggiungi le serie e i film che vuoi seguire.", ru: "Добавьте сериалы и фильмы, за которыми хотите следить.", ar: "أضف المسلسلات والأفلام التي تريد متابعتها.", pt: "Adicione as séries e filmes que deseja acompanhar.", nl: "Voeg de series en films toe die u wilt volgen.", pl: "Dodaj seriale i filmy, które chcesz śledzić.", ja: "追跡したいドラマや映画を追加してください。", ko: "추적하고 싶은 시리즈와 영화를 추가하세요.", zh: "添加您想关注的剧集和电影。" },
  search_placeholder: { tr: "Film veya dizi ara...", en: "Search movies or shows...", de: "Filme oder Serien suchen...", fr: "Rechercher des films ou séries...", es: "Buscar películas o series...", it: "Cerca film o serie...", ru: "Поиск фильмов или сериалов...", ar: "ابحث عن أفلام أو مسلسلات...", pt: "Pesquisar filmes ou séries...", nl: "Zoek films of series...", pl: "Szukaj filmów lub seriali...", ja: "映画やドラマを検索...", ko: "영화나 시리즈 검색...", zh: "搜索电影或剧集..." },
  settings_title: { tr: "Ayarlar", en: "Settings", de: "Einstellungen", fr: "Paramètres", es: "Ajustes", it: "Impostazioni", ru: "Настройки", ar: "الإعدادات", pt: "Configurações", nl: "Instellingen", pl: "Ustawienia", ja: "設定", ko: "설정", zh: "设置" },
  label_tmdb: { tr: "TMDB API Key", en: "TMDB API Key", de: "TMDB-API-Schlüssel", fr: "Clé API TMDB", es: "Clave API de TMDB", it: "Chiave API TMDB", ru: "Ключ API TMDB", ar: "مفتاح TMDB API", pt: "Chave da API TMDB", nl: "TMDB API-sleutel", pl: "Klucz API TMDB", ja: "TMDB APIキー", ko: "TMDB API 키", zh: "TMDB API 密钥" },
  label_token: { tr: "Telegram Bot Token", en: "Telegram Bot Token", de: "Telegram-Bot-Token", fr: "Jeton du bot Telegram", es: "Token del bot de Telegram", it: "Token del bot Telegram", ru: "Токен бота Telegram", ar: "رمز بوت تيليجرام", pt: "Token do bot do Telegram", nl: "Telegram-bot-token", pl: "Token bota Telegram", ja: "Telegramボットトークン", ko: "텔레그램 봇 토큰", zh: "Telegram 机器人令牌" },
  label_chat: { tr: "Telegram Chat ID", en: "Telegram Chat ID", de: "Telegram-Chat-ID", fr: "ID de discussion Telegram", es: "ID de chat de Telegram", it: "ID chat Telegram", ru: "ID чата Telegram", ar: "معرف المحادثة في تيليجرام", pt: "ID do chat do Telegram", nl: "Telegram-chat-ID", pl: "ID czatu Telegram", ja: "TelegramチャットID", ko: "텔레그램 채팅 ID", zh: "Telegram 聊天 ID" },
  label_hour: { tr: "Bildirim Saati (günlük)", en: "Notification Time (daily)", de: "Benachrichtigungszeit (täglich)", fr: "Heure de notification (quotidienne)", es: "Hora de notificación (diaria)", it: "Ora di notifica (giornaliera)", ru: "Время уведомлений (ежедневно)", ar: "وقت الإشعار (يوميًا)", pt: "Horário de notificação (diário)", nl: "Meldingstijd (dagelijks)", pl: "Godzina powiadomień (codziennie)", ja: "通知時間（毎日）", ko: "알림 시간 (매일)", zh: "通知时间（每日）" },
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
  notified: { tr: "✓ Bildirildi", en: "✓ Notified", de: "✓ Benachrichtigt", fr: "✓ Notifié", es: "✓ Notificado", it: "✓ Notificato", ru: "✓ Уведомлено", ar: "✓ تم الإشعار", pt: "✓ Notificado", nl: "✓ Gemeld", pl: "✓ Powiadomiono", ja: "✓ 通知済み", ko: "✓ 알림됨", zh: "✓ 已通知" },
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
  test_sent: { tr: "Test mesajı gönderildi", en: "Test message sent", de: "Testnachricht gesendet", fr: "Message test envoyé", es: "Mensaje de prueba enviado", it: "Messaggio di prova inviato", ru: "Тестовое сообщение отправлено", ar: "تم إرسال رسالة الاختبار", pt: "Mensagem de teste enviada", nl: "Testbericht verzonden", pl: "Wysłano wiadomość testową", ja: "テストメッセージを送信しました", ko: "테스트 메시지를 보냈습니다", zh: "测试消息已发送" },
  runtime_hm: { tr: "{h} sa {m} dk", en: "{h}h {m}m", de: "{h} Std. {m} Min.", fr: "{h} h {m} min", es: "{h} h {m} min", it: "{h} h {m} min", ru: "{h} ч {m} мин", ar: "{h} س {m} د", pt: "{h} h {m} min", nl: "{h} u {m} min", pl: "{h} godz. {m} min", ja: "{h}時間{m}分", ko: "{h}시간 {m}분", zh: "{h}小时{m}分" },
  runtime_h: { tr: "{h} sa", en: "{h}h", de: "{h} Std.", fr: "{h} h", es: "{h} h", it: "{h} h", ru: "{h} ч", ar: "{h} س", pt: "{h} h", nl: "{h} u", pl: "{h} godz.", ja: "{h}時間", ko: "{h}시간", zh: "{h}小时" },
  runtime_m: { tr: "{m} dk", en: "{m}m", de: "{m} Min.", fr: "{m} min", es: "{m} min", it: "{m} min", ru: "{m} мин", ar: "{m} د", pt: "{m} min", nl: "{m} min", pl: "{m} min", ja: "{m}分", ko: "{m}분", zh: "{m}分" },
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
  if (views.followed.classList.contains("active")) loadFollowed();
}

const views = {
  followed: document.getElementById("view-followed"),
  anime: document.getElementById("view-anime"),
  search: document.getElementById("view-search"),
  settings: document.getElementById("view-settings"),
};

const tabs = {
  followed: document.getElementById("tab-followed"),
  anime: document.getElementById("tab-anime"),
  search: document.getElementById("tab-search"),
  settings: document.getElementById("tab-settings"),
};

function switchView(name) {
  Object.keys(views).forEach((k) => views[k].classList.remove("active"));
  Object.keys(tabs).forEach((k) => tabs[k].classList.remove("active"));
  views[name].classList.add("active");
  tabs[name].classList.add("active");
  try {
    localStorage.setItem("activeView", name);
  } catch (e) {}
  if (name === "followed") loadFollowed();
  if (name === "anime") loadAnime();
  if (name === "settings") loadSettings();
}

tabs.followed.onclick = () => switchView("followed");
tabs.anime.onclick = () => switchView("anime");
tabs.search.onclick = () => switchView("search");
tabs.settings.onclick = () => switchView("settings");
document.getElementById("settings-close").onclick = () => switchView("followed");
document.getElementById("search-close").onclick = () => switchView("followed");

function posterHTML(posterPath, title) {
  if (posterPath) {
    return `<img src="${IMAGE_BASE}${posterPath}" alt="${title}" onerror="this.outerHTML='<div class=&quot;no-poster&quot;>🎬</div>'" />`;
  }
  return `<div class="no-poster">🎬</div>`;
}

function scoreTag(v) {
  if (!v || Number(v) <= 0) return "";
  return `<span class="badge badge-score">${Number(v).toFixed(1)}</span>`;
}

function typeLabel(mediaType) {
  return mediaType === "tv" ? t("type_tv") : t("type_movie");
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
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
        const releasedItems = seasonItems.filter((it) => {
          const st = dateState(it.date);
          return st === "date-past" || st === "date-today";
        });
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
        const st = dateState(it.date);
        const dateClass = st ? ` class="${st}"` : "";
        const epName = it.episode_name
          ? `<div class="episode-name">${it.episode_name}</div>`
          : "";
        const watchedClass = it.watched ? " watched" : "";
        const released = st === "date-past" || st === "date-today" ? 1 : 0;
        const btnDisabled = released === 0 ? " disabled" : "";
        const btnCls = it.watched ? "watch-btn on" : "watch-btn";
        const checkIcon = it.watched ? "✓" : "";
        html += `<tr class="${watchedClass}" data-released="${released}">`;
        if (data.media_type === "tv") {
          html += `<td><button class="${btnCls}" data-s="${it.season}" data-e="${it.episode}" data-w="${it.watched ? 1 : 0}"${btnDisabled}>${checkIcon}</button><span class="episode-cell"><span class="episode-label">${t("season_ep", { s: it.season, e: it.episode })}</span>${epName}</span></td>`;
        } else {
          html += `<td><div class="episode-label">${t("release_date")}</div>${epName}</td>`;
        }
        html += `<td${dateClass}>${f.text}</td></tr>`;
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
          btn.textContent = watched ? "✓" : "";
          const tr = btn.closest("tr");
          tr.classList.toggle("watched", watched === 1);

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
            b.textContent = watched ? "✓" : "";
            b.disabled = false;
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

async function openDetails(mediaType, tmdbId, title) {
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
    const res = await fetch(`/api/details?media_type=${encodeURIComponent(mediaType)}&tmdb_id=${encodeURIComponent(tmdbId)}`);
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
    if (data.genres && data.genres.length) badges.push(data.genres.join(", "));

    html += '<div class="details-meta">';
    badges.forEach((b) => {
      html += `<span class="detail-badge">${b}</span>`;
    });
    html += "</div>";

    if (data.vote_average != null) {
      html += `<div class="details-rating">⭐ ${fmtScore(data.vote_average)} / 10 <span class="details-votes">${t("votes", { n: data.vote_count || 0 })}</span></div>`;
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
        html += `<div class="cast-item">${img}<div class="cast-info"><div class="cast-name">${c.name}</div><div class="cast-char">${c.character || ""}</div></div></div>`;
      });
      html += "</div></div>";
    }

    html += "</div></div>";

    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = `<div class="releases-error">${t("conn_error")}</div>`;
  }
}

// ---- Followed ----
async function loadFollowed() {
  const res = await fetch("/api/followed");
  const items = await res.json();
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
function animeNextText(next) {
  if (!next) return "";
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
  const items = await res.json();
  const grid = document.getElementById("anime-grid");
  const empty = document.getElementById("empty-anime");
  grid.innerHTML = "";
  empty.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML='<div class=&quot;no-poster&quot;>🎬</div>'" />` : `<div class="no-poster">🎬</div>`}
      <div class="info">
        <div class="title">${item.title}</div>
        <div class="meta">
          <span class="badge badge-anime">${t("tab_anime")}</span>
          ${item.score ? scoreTag(item.score / 10) : ""}
          ${animeNextText(item.next_episode)}
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
    if (data.genres && data.genres.length) badges.push(data.genres.join(", "));

    html += '<div class="details-meta">';
    badges.forEach((b) => {
      html += `<span class="detail-badge">${b}</span>`;
    });
    html += "</div>";

    if (data.score != null) {
      html += `<div class="details-rating">⭐ ${fmtScore(data.score / 10)} / 10</div>`;
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

async function doAnimeSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  const res = await fetch("/api/anime/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const grid = document.getElementById("anime-results");
  grid.innerHTML = "";
  grid.style.display = "";
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
      ${item.cover_url ? `<img src="${item.cover_url}" alt="${item.title}" onerror="this.outerHTML='<div class=&quot;no-poster&quot;>🎬</div>'" />` : `<div class="no-poster">🎬</div>`}
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
      if (r.ok) {
        doAnimeSearch();
        loadAnime();
      }
    };
    div.onclick = () => openAnimeDetails(null, item.anilist_id, item.title);
    grid.appendChild(div);
    applyTitleHint(div);
  });
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

document.getElementById("search-btn").onclick = () => {
  const type = document.getElementById("search-type").value;
  if (type === "anime") doAnimeSearch();
  else doSearch();
};
document.getElementById("search-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const type = document.getElementById("search-type").value;
    if (type === "anime") doAnimeSearch();
    else doSearch();
  }
});

function setSearchType(type) {
  const isAnime = type === "anime";
  const input = document.getElementById("search-input");
  const resGrid = document.getElementById("search-results");
  const animeGrid = document.getElementById("anime-results");
  if (isAnime) {
    input.dataset.i18n = "anime_placeholder";
    input.placeholder = t("anime_placeholder");
    resGrid.style.display = "none";
    animeGrid.style.display = "";
  } else {
    input.dataset.i18n = "search_placeholder";
    input.placeholder = t("search_placeholder");
    resGrid.style.display = "";
    animeGrid.style.display = "none";
  }
  resGrid.innerHTML = "";
  animeGrid.innerHTML = "";
}

document.getElementById("search-type").onchange = (e) => setSearchType(e.target.value);
setSearchType("show");

// ---- Search ----
async function doSearch() {
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  const res = await fetch("/api/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const grid = document.getElementById("search-results");
  grid.innerHTML = "";
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
          ${
            item.media_type === "tv"
              ? item.release_date
                ? dateState(item.release_date) === "date-past"
                  ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
                  : dateState(item.release_date) === "date-today"
                    ? `<div class="next-ep today">${formatDate(item.release_date).text} ${t("today_theaters")}</div>`
                    : `<div class="next-ep">${formatDate(item.release_date).text} <span class="next-ep-days">${daysUntil(item.release_date)}</span></div>`
                : `<div class="next-ep muted">${t("date_unknown")}</div>`
              : item.release_date
                ? dateState(item.release_date) === "date-past"
                  ? `<div class="next-ep muted">${formatDate(item.release_date).text}</div>`
                  : dateState(item.release_date) === "date-today"
                    ? `<div class="next-ep today">${formatDate(item.release_date).text} ${t("today_theaters")}</div>`
                    : `<div class="next-ep">${formatDate(item.release_date).text} <span class="next-ep-days">${daysUntil(item.release_date)}</span></div>`
                : `<div class="next-ep muted">${t("date_unknown")}</div>`
          }
          ${item.media_type === "tv" && item.number_of_seasons ? `<div class="season-count-badge">${t("seasons", { n: item.number_of_seasons })}</div>` : ""}
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
    div.onclick = () => {
      openDetails(item.media_type, item.tmdb_id, item.title);
    };
    grid.appendChild(div);
    applyTitleHint(div);
  });
}

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
    };
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
  currentTz = s.timezone || "Europe/Istanbul";
  document.getElementById("s-tz").value = currentTz;
  document.getElementById("s-lang").value = s.language || "tr-TR";
  applyLang((s.language || "tr-TR").split("-")[0]);
}

function showMsg(text, ok) {
  const el = document.getElementById("settings-msg");
  el.textContent = text;
  el.className = "msg " + (ok ? "success" : "error");
  setTimeout(() => (el.className = "msg"), 4000);
}

document.getElementById("save-settings").onclick = async () => {
  const body = {
    tmdb_api_key: document.getElementById("s-tmdb").value.trim(),
    telegram_bot_token: document.getElementById("s-token").value.trim(),
    telegram_chat_id: document.getElementById("s-chat").value.trim(),
    notify_hour: document.getElementById("s-hour").value,
    timezone: document.getElementById("s-tz").value,
    language: document.getElementById("s-lang").value,
    ntfy_topic: document.getElementById("s-ntfy").value.trim(),
  };
  const r = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.ok) {
    currentTz = body.timezone || currentTz;
    applyLang((body.language || "tr-TR").split("-")[0]);
    showMsg(t("saved_ok"), true);
  } else {
    showMsg(t("save_failed"), false);
  }
};

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
    if (s.language) {
      currentTz = s.timezone || currentTz;
      applyLang(s.language.split("-")[0]);
    }
  } catch (e) {
    /* varsayılan dil */
  }
})();

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
