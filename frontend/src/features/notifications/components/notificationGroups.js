const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date) => {
  const start = startOfDay(date);
  const offset = (start.getDay() + 6) % 7;

  start.setDate(start.getDate() - offset);
  return start;
};

const toDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const groupNotifications = (notifications = []) => {
  const today = startOfDay(new Date());
  const week = startOfWeek(new Date());
  const groups = {
    today: [],
    week: [],
    earlier: [],
  };

  notifications.forEach((notification) => {
    const date = toDate(notification?.createdAt);

    if (!date) {
      groups.earlier.push(notification);
    } else if (date >= today) {
      groups.today.push(notification);
    } else if (date >= week) {
      groups.week.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  });

  return [
    { key: "today", label: "Today", items: groups.today },
    { key: "week", label: "This week", items: groups.week },
    { key: "earlier", label: "Earlier", items: groups.earlier },
  ].filter((group) => group.items.length > 0);
};
