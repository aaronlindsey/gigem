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

function localDateText(value, dateOnly = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (dateOnly ? dateOnlyFormatter : fullDateFormatter).format(date);
}

document.querySelectorAll("time[data-local-date-time], time[data-local-date]").forEach((time) => {
  const text = localDateText(time.dateTime, time.hasAttribute("data-local-date"));
  if (text) time.textContent = text;
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
