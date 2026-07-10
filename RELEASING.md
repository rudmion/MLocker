# Процесс релиза MLocker

Пошаговое руководство по выпуску новой версии приложения.

---

## 1. Что нужно обновить

Версия хранится в трёх файлах — все три должны совпадать:

| Файл | Поле |
|------|------|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` |

Ручное править все три файла долго и легко ошибиться. Для этого есть скрипт.

---

## 2. Из какой ветки

Bump делается из ветки `development` — это основная рабочая ветка.

Workflow триггерится на **тег** (`v*`), а не на ветку, поэтому технически bump можно делать из любой ветки. Но по соглашению — `development`.

---

## 3. Быстрый путь (скрипт)

```bash
npm run bump -- <новая_версия>
```

Или с yarn:

```bash
yarn bump <новая_версия>
```

Пример:

```bash
npm run bump -- 0.7.0
```

Скрипт автоматически:

1. Обновит версию во всех трёх файлах
2. Сделает коммит `chore: bump version to 0.7.0`
3. Создаст git-тег `v0.7.0`
4. Запушит коммит и тег на remote

После пуша тега GitHub Actions автоматически запустит сборку и создаст релиз.

Формат версии: `X.Y.Z` (например, `0.7.0`, `1.0.0`, `2.3.1`).

---

## 4. Ручной путь (если скрипт не сработал)

```bash
# 1. Обновите версию вручную во всех трёх файлах

# 2. Коммит
git add .
git commit -m "chore: bump version to 0.7.0"

# 3. Тег
git tag v0.7.0

# 4. Пуш
git push
git push origin v0.7.0
```

---

## 5. Что происходит после пуша тега

### GitHub Actions (`.github/workflows/release.yml`)

Триггер: пуш тега matching `v*`.

Workflow собирает три бинарника параллельно:

| Платформа | Цель |
|-----------|------|
| `windows-latest` | `x86_64-pc-windows-msvc` |
| `macos-latest` | `aarch64-apple-darwin` |
| `ubuntu-22.04` | `x86_64-unknown-linux-gnu` |

Для этого используются:
- `actions/checkout@v4` — клонирует репо
- `actions/setup-node@v4` — ставит Node.js 20
- `dtolnay/rust-toolchain@stable` — ставит Rust stable
- `yarn install` — ставит зависимости фронтенда
- `tauri-apps/tauri-action@v0` — собирает Tauri-приложение и создаёт GitHub Release

`tauri-action` автоматически создаёт релиз с тегом `${{ github.ref_name }}` и загружает бинарники как assets.

### Необходимые secrets

В настройках репозитория (Settings → Secrets → Actions) должны быть:

| Secret | Описание |
|--------|----------|
| `TAURI_SIGNING_PRIVATE_KEY` | Приватный ключ для подписи обновлений (minisign) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Пароль от приватного ключа (может быть пустым) |
| `GITHUB_TOKEN` | Генерируется автоматически, менять не нужно |

---

## 6. Как работает механизм обновления в приложении

### Backend (`src-tauri/src/updater.rs`)

При нажатии «Проверить обновления» приложение:

1. Запрашивает текущую версию из `app.package_info().version` (сшита в бинарник при сборке)
2. Делает GET-запрос к `https://api.github.com/repos/rudmion/MLocker/releases/latest`
3. Если релизов нет — проверяет теги через `/repos/{REPO}/tags`
4. Извлекает `tag_name` из ответа (например, `v0.7.0`), убирает префикс `v`
5. Сравнивает версию из тега с текущей через `compare_versions()`
6. Если тег новее — возвращает `has_update: true` и `download_url` (ссылка на установщик)

При нажатии «Обновить сейчас»:

1. Скачивает установщик по `download_url` в TEMP-директорию
2. Эмитит ивент `update-progress` с прогрессом загрузки
3. Запускает установщик (`.exe` на Windows, `.dmg` на macOS, `.deb` на Linux)
4. Пользователь следует инструкциям установщика

### Frontend (`src/hooks/useUpdateChecker.tsx`)

- При монтировании автоматически проверяет обновления (без уведомления)
- Кнопка «Проверить обновления» в настройках вызывает проверку с тостом
- Если обновление есть — показывает диалог с changelog, прогресс-баром и кнопкой «Установить»
- Кнопка «Установить» скачивает установщик и запускает его
- После скачивания показывается тост «Обновление загружено»

---

## 7. Как проверить что всё прошло успешно

### Проверить тег

```bash
# Все теги
git tag -l

# Конкретный тег
git show v0.7.0

# Теги на remote
git ls-remote --tags origin
```

### Проверить релиз

```bash
# Список релизов (нужен gh CLI)
gh release list

# Детали конкретного релиза
gh release view v0.7.0
```

Или откройте в браузере: `https://github.com/rudmion/MLocker/releases`

### Проверить что updater видит новую версию

```bash
curl -s https://api.github.com/repos/rudmion/MLocker/releases/latest | grep tag_name
```

Должно вернуть `"tag_name": "v0.7.0"`.

---

## 8. Нумерация версий

Используется [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** — крупные изменения, ломающая обратная совместимость
- **MINOR** — новая функциональность, обратно совместимо
- **PATCH** — исправления багов

Примеры: `0.5.0` → `0.6.0` → `0.6.1` → `1.0.0`

---

## 9. Частые ошибки

### «У меня последняя версия», но на GitHub есть новый коммит/тег

Причина: updater сначала проверяет **релизы** (через `/releases/latest`). Если релизов нет — проверяет **теги** (через `/tags`). Если ни того, ни другого нет — считает что обновлений нет.

Решения:
1. Создайте релиз на GitHub (см. секцию выше)
2. Или убедитесь что тег запушен: `git ls-remote --tags origin`

### Workflow не запускается

Проверьте:
- Тег имеет формат `v*` (например, `v0.7.0`, а не `0.7.0`)
- Тег запушен: `git ls-remote --tags origin`
- Workflow не отключён в настройках репозитория

### Сборка падает на Linux

Убедитесь что в workflow есть шаг установки зависимостей:

```yaml
- name: Install Linux dependencies
  if: matrix.platform == 'ubuntu-22.04'
  run: |
    sudo apt-get update
    sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

### Бинарник подписан, но обновление не ставится

Проверьте что `TAURI_SIGNING_PRIVATE_KEY` и `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` установлены в secrets репозитория.

### Workflow успешный, но релиза на GitHub нет

Причина: `tauri-action` не создал релиз (проблема с secrets или баг action).

Решение — создать релиз вручную:

```bash
# Создать релиз через gh CLI
gh release create v0.7.0 \
  --title "MLocker v0.7.0" \
  --notes "См. CHANGELOG для деталей обновления" \
  path/to/binary.exe
```

Или откройте `https://github.com/rudmion/MLocker/releases/new` и создайте релиз вручную, указав тег `v0.7.0` и загрузив бинарники.

После создания релиза updater сможет его найти.
