document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});
const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
const compactDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const compactTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function localDateText(value, dateOnly = false, compact = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (compact) {
    const compactDate = compactDateFormatter.format(date);
    return dateOnly ? compactDate : `${compactDate} · ${compactTimeFormatter.format(date)}`;
  }
  return (dateOnly ? dateOnlyFormatter : fullDateFormatter).format(date);
}

document.querySelectorAll("time[data-local-date-time], time[data-local-date]").forEach((time) => {
  const text = localDateText(time.dateTime, time.hasAttribute("data-local-date"));
  if (text) time.textContent = text;
});

document.querySelectorAll("time[data-compact-game-date]").forEach((time) => {
  const text = localDateText(time.dateTime, time.hasAttribute("data-date-only"), true);
  if (text) {
    time.textContent = `${text}${time.hasAttribute("data-date-only") ? " · Time TBD" : ""}`;
    time.title = fullDateFormatter.format(new Date(time.dateTime));
  }
});

document.querySelectorAll("option[data-local-option]").forEach((option) => {
  const text = localDateText(option.dataset.startsAt, option.hasAttribute("data-date-only"));
  if (text) {
    option.textContent = `${option.dataset.opponent} — ${text}${option.hasAttribute("data-date-only") ? " · Time TBD" : ""}`;
  }
});

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
document.querySelectorAll("[data-time-zone-label]").forEach((label) => {
  label.textContent = timeZone ? timeZone.replaceAll("_", " ") : "your local time";
});

function localInputValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

document.querySelectorAll("input[data-local-datetime]").forEach((input) => {
  if (input.dataset.utcDatetime) {
    input.value = localInputValue(new Date(input.dataset.utcDatetime));
  }

  const form = input.form;
  if (!form || !input.name) return;

  const fieldName = input.name;
  input.name = `${fieldName}_local`;
  const utcInput = document.createElement("input");
  utcInput.type = "hidden";
  utcInput.name = fieldName;
  form.append(utcInput);

  const updateUtcInput = () => {
    const date = new Date(input.value);
    utcInput.value = input.value && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
  };
  input.addEventListener("input", updateUtcInput);
  updateUtcInput();
});

document.querySelectorAll("[data-step]").forEach((button) => {
  let lastPointerAdjustment = Number.NEGATIVE_INFINITY;
  const adjust = () => {
    const input = button.closest(".score-stepper")?.querySelector("input");
    if (!input) return;
    const direction = Number(button.dataset.step);
    if (input.value === "") {
      input.value = input.min || "0";
    } else if (direction > 0) {
      input.stepUp();
    } else {
      input.stepDown();
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };

  // Adjust directly from the pointer event and ignore its synthesized click.
  // Keyboard and assistive-technology clicks still use the click handler.
  button.addEventListener("pointerup", () => {
    lastPointerAdjustment = performance.now();
    adjust();
  });
  button.addEventListener("click", () => {
    if (performance.now() - lastPointerAdjustment < 500) return;
    adjust();
  });
});

function countdownText(closesAt) {
  const remaining = closesAt * 1000 - Date.now();
  if (remaining <= 0) return "Picks locked";
  const minutes = Math.max(1, Math.floor(remaining / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `Next pick closes in ${days}d ${hours}h`;
  if (hours > 0) return `Next pick closes in ${hours}h ${mins}m`;
  return `Next pick closes in ${mins}m`;
}

function refreshCountdowns() {
  document.querySelectorAll("[data-countdown]").forEach((element) => {
    const closesAt = Number(element.dataset.closesAt);
    if (Number.isFinite(closesAt)) element.textContent = countdownText(closesAt);
  });
}
refreshCountdowns();
window.setInterval(refreshCountdowns, 60_000);

const accountMenu = document.querySelector(".account-menu");
if (accountMenu) {
  document.addEventListener("click", (event) => {
    if (!accountMenu.contains(event.target)) accountMenu.removeAttribute("open");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      accountMenu.removeAttribute("open");
      accountMenu.querySelector("summary")?.focus();
    }
  });
}
