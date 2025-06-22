// public/script.js

const courts = [
  "Центральный", "Западный", "Восточный", "Южный", "Северный",
  "Грунт 1", "Грунт 2", "Грунт 3", "Хард 1", "Хард 2"
];

const dates = Array.from({ length: 10 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' });
});

// Уникальные данные для текущего клиента
const localUserId = crypto.randomUUID();
const localAvatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${localUserId}`;

// Подключаемся к WebSocket, используя обнаружение хоста автоматически
const ws = new WebSocket(`ws://${location.host}`);

// Элемент таблицы и карта ячеек
const grid = document.getElementById("grid");
const cellMap = new Map();

// Генерация таблицы
grid.innerHTML = "";
grid.appendChild(createDiv("header-cell court-header", "Корт"));
for (const date of dates) {
  grid.appendChild(createDiv("header-cell", date));
}
courts.forEach((cName, row) => {
  grid.appendChild(createDiv("court-name", cName));
  for (let col = 0; col < dates.length; col++) {
    const slot = createDiv("slot", "");
    slot.dataset.row = row;
    slot.dataset.col = col;

    const icon = createDiv("icon-button", "+");
    slot.appendChild(icon);

    grid.appendChild(slot);
    const key = `${row}-${col}`;
    cellMap.set(key, { slot, users: new Map(), icon });

    icon.addEventListener("click", () => {
      const entry = cellMap.get(key);
      const users = entry.users;
      if (users.has(localUserId)) {
        users.delete(localUserId);
        entry.slot.classList.remove("green");
      } else {
        users.set(localUserId, localAvatar);
        entry.slot.classList.add("green");
      }
      updateSlot(entry);
      ws.send(JSON.stringify({
        row, col,
        users: Object.fromEntries(users)
      }));
    });
  }
});

// Обработка входящих сообщений — автоматически десериализуем JSON из Blob или строки
ws.onmessage = async event => {
  let text;
  if (event.data instanceof Blob) {
    text = await event.data.text();
  } else {
    text = event.data;
  }
  const { row, col, users } = JSON.parse(text);
  const key = `${row}-${col}`;
  if (!cellMap.has(key)) return;

  const entry = cellMap.get(key);
  entry.users = new Map(Object.entries(users));
  entry.slot.classList.toggle("green", entry.users.has(localUserId));
  updateSlot(entry);
};

// Функция обновления ячейки
function updateSlot({ slot, users, icon }) {
  slot.innerHTML = "";
  const elements = Array.from(users, ([id, url]) => {
    const img = document.createElement("img");
    img.src = url;
    img.className = "avatar";
    img.title = id;
    return img;
  });

  const local = users.has(localUserId);
  icon.textContent = local ? "−" : "+";
  elements.push(icon);

  let line = document.createElement("div");
  line.style.display = "flex";
  line.style.gap = "4px";
  let count = 0;
  for (const el of elements) {
    if (count === 3) {
      slot.appendChild(line);
      line = document.createElement("div");
      line.style.display = "flex";
      line.style.gap = "4px";
      count = 0;
    }
    line.appendChild(el);
    count++;
  }
  if (line.children.length) slot.appendChild(line);
}

// Вспомогательный создатель div
function createDiv(cls, text = "") {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  return d;
}

