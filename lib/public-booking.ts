import { all } from "./db";
import { addDaysKey, todayKey } from "./utils";

export type PublicService = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_min: number;
  price: number;
  color: string;
  popular: number;
  staff_id: string | null;
  staff_name: string | null;
};

/** Active services with a representative specialist — used by the public booking widget. */
export function publicServices(): PublicService[] {
  return all<PublicService>(
    `SELECT s.id, s.name, s.category, s.description, s.duration_min, s.price, s.color, s.popular,
            st.id AS staff_id, st.name AS staff_name
     FROM services s
     LEFT JOIN staff_services ss ON ss.service_id = s.id
     LEFT JOIN staff st ON st.id = ss.staff_id AND st.active = 1
     WHERE s.active = 1
     GROUP BY s.id
     ORDER BY s.category, s.name`
  );
}

export function publicStaff() {
  return [
    { id: "any", name: "Any available specialist" },
    ...all<{ id: string; name: string }>("SELECT id, name FROM staff WHERE active = 1 ORDER BY name"),
  ];
}

export function publicDays() {
  return Array.from({ length: 14 }, (_, i) => ({ date: addDaysKey(todayKey(), i), count: 0 }));
}
